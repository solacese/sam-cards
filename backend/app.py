"""Public research API and asynchronous expert design. Server-side credentials only."""
import base64
import hashlib
import ipaddress
import json
import os
import re
import socket
import secrets
import time
import unicodedata
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import boto3
from botocore.exceptions import ClientError
from prompt import CAPABILITY_SOURCES, messages, evidence_messages
from schema import TAILORED_RESPONSE_FORMAT, COMPANY_RESPONSE_FORMAT, EVIDENCE_RESPONSE_FORMAT
from expert import EXPERT_VERSION, expert_body, bind_evidence

VERSION = 'organization-research-v7-intros'
SECRET = None
TOKEN = None
TABLE = None
EXPERT_SECRET = None
DEADLINE_SECONDS = 19
BEST_SECONDS = 165
FIELDS = ('title', 'trigger', 'action', 'why_mesh', 'learning', 'human', 'risk', 'revenue', 'metric', 'question')

class ResearchError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def clean_company(value):
    if not isinstance(value, str):
        raise ResearchError(400, 'Enter a company name.')
    value = unicodedata.normalize('NFKC', value).strip()
    if not 2 <= len(value) <= 100 or not any(c.isalnum() for c in value):
        raise ResearchError(400, 'Use a company name between 2 and 100 characters.')
    if any(unicodedata.category(c).startswith('C') for c in value) or any(c in value for c in '<>{}[]\\/\n\r'):
        raise ResearchError(400, 'Enter a company name, not a URL or instructions.')
    return re.sub(r'\s+', ' ', value)


def safe_url(value):
    if not isinstance(value, str) or len(value) > 2048:
        return None
    parts = urlsplit(value)
    if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.port not in (None,443):
        return None
    host = parts.hostname.lower()
    if '.' not in host or host.endswith(('.local','.internal')) or host in ('localhost','example.com','www.example.com'):
        return None
    try:
        if not ipaddress.ip_address(host).is_global:
            return None
    except ValueError:
        pass
    return value


def clean_tailoring(value):
    """Optional user context, never a source of verified company facts."""
    if not isinstance(value, dict) or set(value) - {'departments', 'topic', 'outcomes', 'systems'}:
        raise ResearchError(400, 'Use the four optional tailoring fields.')
    def clean_text(text, maximum):
        if not isinstance(text, str):
            raise ResearchError(400, 'Tailoring entries must be text.')
        text = unicodedata.normalize('NFKC', text).strip()
        if len(text) > maximum or any(unicodedata.category(c).startswith('C') for c in text):
            raise ResearchError(400, f'Use plain text of up to {maximum} characters per tailoring entry.')
        return re.sub(r'\s+', ' ', text)
    cleaned = {}
    for key in ('departments', 'outcomes', 'systems'):
        entries = value.get(key, [])
        if not isinstance(entries, list) or len(entries) > 8:
            raise ResearchError(400, 'Choose up to eight entries in each tailoring field.')
        unique = {}
        for entry in entries:
            entry = clean_text(entry, 80)
            if entry:
                unique.setdefault(entry.casefold(), entry)
        if unique:
            cleaned[key] = list(unique.values())
    topic = clean_text(value.get('topic', ''), 200)
    if topic:
        cleaned['topic'] = topic
    return cleaned


def report_cache_key(company, tailoring, quality='quick'):
    # Selection order and letter case do not change the brief; different briefs must not share reports.
    identity = {'company': company.casefold(), 'tailoring': {
        key: sorted(item.casefold() for item in value) if isinstance(value, list) else value.casefold()
        for key, value in tailoring.items()
    }}
    if quality == 'best':
        identity['quality'] = EXPERT_VERSION + ':' + os.environ.get('EXPERT_MODEL', 'gpt-6-astra')
    digest = hashlib.sha256(json.dumps(identity, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return f'cache:{VERSION}:{digest}'


def text_field(value, maximum=800):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ResearchError(502, 'The research response was incomplete. Please try again.')
    return value.strip()


def public_sources(raw):
    citations = raw.get('citations', [])
    search = {item.get('url'):item for item in raw.get('search_results',[]) if isinstance(item,dict)}
    sources = []
    for index, url in enumerate(citations, 1):
        url = safe_url(url)
        if url:
            item = search.get(url, {})
            sources.append({'id':index,'url':url,'title':str(item.get('title') or urlsplit(url).hostname)[:300], 'date':str(item.get('date') or '')[:10]})
    return sources


def clean_news(news, sources, citation_count):
    ids={source['id'] for source in sources}
    today=datetime.now(timezone.utc).date()
    published = date.fromisoformat(news['date'])
    if not today - timedelta(days=180) <= published <= today:
        raise ValueError('stale or future news')
    refs = news['source_ids']
    if not isinstance(refs,list) or not refs or any(type(i) is not int or not 1 <= i <= citation_count for i in refs):
        raise ValueError('invalid citation')
    # Providers may also cite unsafe HTTP mirrors. Keep only the original, safe HTTPS
    # references, and require dated evidence for the stated news date when available.
    refs = [i for i in refs if i in ids]
    if not refs:
        raise ValueError('no safe citation')
    dated_refs = [source['date'] for source in sources if source['id'] in refs and re.fullmatch(r'\d{4}-\d{2}-\d{2}',source['date'])]
    if dated_refs and published.isoformat() not in dated_refs:
        raise ValueError('news date differs from source metadata')
    if dated_refs:
        supported_ids = {source['id'] for source in sources if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',source['date']) or source['date']==published.isoformat()}
        refs = [i for i in refs if i in supported_ids]
    return {'headline':text_field(news['headline'],400), 'date':published.isoformat(), 'source_ids':list(dict.fromkeys(refs))}


def evidence_report(raw, company, tailoring=None):
    try:
        content=raw['choices'][0]['message']['content'].strip()
        content=re.sub(r'^```(?:json)?\s*|\s*```$', '', content)
        data=json.loads(content)
        if data.get('error'):
            raise ResearchError(422,'Not enough recent, reliable news was found. Try the full organization name.')
        items=data.get('evidence')
        if not isinstance(items,list) or not 1<=len(items)<=5:
            raise ValueError('evidence count')
        sources=public_sources(raw)
        facts=[clean_news(item,sources,len(raw.get('citations',[]))) for item in items]
        used={source_id for news in facts for source_id in news['source_ids']}
        if len(used)<(1 if tailoring else 3):
            raise ValueError('insufficient sources')
        return {'company':company,'cases':[{'news':news} for news in facts],'sources':[source for source in sources if source['id'] in used]}
    except ResearchError:
        raise
    except (ValueError,TypeError,KeyError,IndexError,AttributeError):
        print(json.dumps({'event':'invalid_evidence'}))
        raise ResearchError(502,'The research did not return enough reliable dated sources. Please try again.') from None


def validate_report(raw, requested_company, tailoring=None):
    """Only expose a complete, recent, citation-backed three-case response."""
    try:
        content = raw['choices'][0]['message']['content'].strip()
        content = re.sub(r'^```(?:json)?\s*|\s*```$', '', content)
        report = json.loads(content)
        if not isinstance(report, dict) or report.get('error'):
            raise ResearchError(422, 'Not enough recent, reliable news was found. Try the full company name.')
        sources = public_sources(raw)
        cases = report.get('cases')
        if not isinstance(cases, list) or len(cases) != 3:
            raise ValueError('case count')
        cleaned = []
        used = set()
        for item in cases:
            result = {key:text_field(item.get(key)) for key in FIELDS}
            result['intro'] = text_field(item.get('intro'),650)
            if not 20 <= len(result['intro'].split()) <= 85:
                raise ValueError('context intro length')
            if tailoring:
                fit = item['fit']
                result['fit'] = {'assumptions':text_field(fit['assumptions'],600)}
                for key, detail in (('departments','role'), ('outcomes','impact'), ('systems','role')):
                    entries = fit.get(key, [])
                    if not isinstance(entries,list) or len(entries) != len(tailoring.get(key,[])):
                        raise ValueError('missing tailoring coverage')
                    mapped = {text_field(entry['name'],80).casefold():text_field(entry[detail],400) for entry in entries}
                    if set(mapped) != {name.casefold() for name in tailoring.get(key,[])}:
                        raise ValueError('tailoring names do not match the brief')
                    result['fit'][key] = [{'name':name,detail:mapped[name.casefold()]} for name in tailoring.get(key,[])]
                result['fit']['topic'] = text_field(fit['topic'],400) if tailoring.get('topic') else ''
            agents = item.get('agents')
            if not isinstance(agents,list) or not 2 <= len(agents) <= 3:
                raise ValueError('requires two or three agents')
            result['agents'] = [{'name':text_field(agent.get('name'),100), 'role':text_field(agent.get('role'),200)} for agent in agents]
            if len({agent['name'].casefold() for agent in result['agents']}) != len(agents):
                raise ValueError('duplicate agents')
            result['news']=clean_news(item['news'],sources,len(raw.get('citations',[])))
            used.update(result['news']['source_ids'])
            cleaned.append(result)
        if len({item['title'].casefold() for item in cleaned}) != 3 or len({item['intro'].casefold() for item in cleaned}) != 3 or len(used)<(1 if tailoring else 3):
            raise ValueError('duplicate cases or insufficient sources')
        overview = re.sub(r'\[\d+(?:\s*,\s*\d+)*\]', '', text_field(report.get('overview'),600)).strip()
        result = {'company':text_field(report.get('company'),160),'requested_company':requested_company,'overview':text_field(overview,600),'cases':cleaned,'sources':[item for item in sources if item['id'] in used],'capability_sources':CAPABILITY_SOURCES,'generated_at':datetime.now(timezone.utc).isoformat(),'model':'Perplexity Sonar Pro','version':VERSION,'cached':False}
        if tailoring:
            result['tailoring'] = tailoring
        return result
    except ResearchError:
        raise
    except (ValueError, TypeError, KeyError, IndexError, AttributeError) as error:
        safe_reasons = {'case count', 'missing tailoring coverage', 'tailoring names do not match the brief',
                        'requires two or three agents', 'duplicate agents', 'stale or future news',
                        'invalid citation', 'no safe citation', 'news date differs from source metadata',
                        'duplicate cases or insufficient sources', 'context intro length'}
        reason = str(error) if type(error) is ValueError and str(error) in safe_reasons else type(error).__name__
        print(json.dumps({'event':'invalid_research','reason':reason}))
        raise ResearchError(502, 'The research did not return three complete cases with recent sources. Please try again.') from None


def remaining(deadline):
    seconds = deadline-time.monotonic()
    if seconds <= .2:
        raise ResearchError(504, 'Research reached the 20-second limit. Please try again.')
    return seconds


def request_json(url, deadline, body=None, headers=None, form=False):
    payload = (urlencode(body).encode() if form else json.dumps(body).encode()) if body is not None else None
    try:
        with urlopen(Request(url,data=payload,headers=headers or {}), timeout=remaining(deadline)) as response:
            data=response.read(200000)
        remaining(deadline)
        return json.loads(data)
    except HTTPError as error:
        print(json.dumps({'event':'provider_error','status':error.code}))
        if error.code==429:
            raise ResearchError(503,'Perplexity is busy. Please try again shortly.') from None
        raise ResearchError(502,'The research service is temporarily unavailable. Please try again.') from None
    except (TimeoutError, socket.timeout):
        raise ResearchError(504,'Research reached the 20-second limit. Please try again.') from None
    except (URLError,ValueError):
        raise ResearchError(502,'The research service is temporarily unavailable. Please try again.') from None


def get_secret():
    global SECRET
    if SECRET is None:
        SECRET = json.loads(boto3.client('secretsmanager').get_secret_value(SecretId=os.environ['SECRET_ARN'])['SecretString'])
    return SECRET


def research(company, deadline, tailoring=None, include_evidence=False):
    global TOKEN
    credentials=get_secret()
    if not TOKEN or TOKEN['until']<=time.time()+30:
        auth=request_json(credentials['SAP_AUTH_URL'],deadline,body={'grant_type':'client_credentials','client_id':credentials['SAP_CLIENT_ID'],'client_secret':credentials['SAP_CLIENT_SECRET']},headers={'Content-Type':'application/x-www-form-urlencoded'},form=True)
        TOKEN={'value':auth['access_token'],'until':time.time()+int(auth.get('expires_in',300))}
    tokens=1200 if include_evidence else (3300 if tailoring else 2500)
    body={'model':credentials['MODEL'],'messages':evidence_messages(company,tailoring) if include_evidence else messages(company,tailoring,compact=True),'temperature':.2,'max_tokens':tokens,'search_recency_filter':'month'}
    body['response_format']=EVIDENCE_RESPONSE_FORMAT if include_evidence else TAILORED_RESPONSE_FORMAT if tailoring else COMPANY_RESPONSE_FORMAT
    response=request_json(credentials['DEPLOYMENT_URL'].rstrip('/')+'/chat/completions',deadline,
        body=body,
        headers={'Authorization':'Bearer '+TOKEN['value'],'AI-Resource-Group':credentials['SAP_RESOURCE_GROUP'],'Content-Type':'application/json'})
    report = evidence_report(response,company,tailoring) if include_evidence else validate_report(response,company,tailoring)
    if include_evidence:
        snippets = {item.get('url'):str(item.get('snippet') or '')[:2500]
                    for item in response.get('search_results',[]) if isinstance(item,dict)}
        report['evidence_excerpts'] = [{'source_id':source['id'],'excerpt':snippets[source['url']]}
            for source in report['sources'] if snippets.get(source['url'])]
    return report


def table():
    global TABLE
    if TABLE is None:
        TABLE=boto3.resource('dynamodb').Table(os.environ['TABLE_NAME'])
    return TABLE


def expert_research(company, tailoring, deadline, progress):
    global EXPERT_SECRET
    progress('researching')
    # The first pass validates sources and the brief before expensive design begins.
    evidence = research(company, min(deadline, time.monotonic()+35), tailoring, include_evidence=True)
    progress('designing')
    if EXPERT_SECRET is None:
        EXPERT_SECRET = json.loads(boto3.client('secretsmanager').get_secret_value(SecretId=os.environ['EXPERT_SECRET_ARN'])['SecretString'])
    model = os.environ.get('EXPERT_MODEL', 'gpt-6-astra')
    raw = request_json(EXPERT_SECRET['base_url'].rstrip('/')+'/chat/completions', deadline,
        body=expert_body(company, tailoring, evidence, model),
        headers={'Authorization':'Bearer '+EXPERT_SECRET['api_key'], 'Content-Type':'application/json'})
    if raw.get('model') != model:
        raise ResearchError(502, 'The requested expert model was not confirmed by the service. Please try again.')
    if raw.get('choices', [{}])[0].get('finish_reason') != 'stop':
        raise ResearchError(502, 'The expert analysis was incomplete. Please try again.')
    try:
        bound = bind_evidence(raw, evidence)
    except (ValueError, TypeError, KeyError, IndexError):
        raise ResearchError(502, 'The expert analysis could not be matched to its sources. Please try again.') from None
    result = validate_report(bound, company, tailoring)
    result.update(quality='best', model=model, research_model='Perplexity Sonar Pro', expert_version=EXPERT_VERSION)
    return result


def worker(event, context):
    """An asynchronous invocation; duplicate delivery cannot start a second model call."""
    job_id = event.get('job_id', '')
    if not re.fullmatch(r'[a-f0-9]{48}', job_id):
        return
    key = {'pk':'job:'+job_id}
    started = time.monotonic()
    try:
        claimed = table().update_item(Key=key,
            UpdateExpression='SET #state = :running, started_at = :now',
            ConditionExpression='#state = :queued AND expires_at > :now',
            ExpressionAttributeNames={'#state':'status'},
            ExpressionAttributeValues={':running':'researching', ':queued':'queued', ':now':int(time.time())},
            ReturnValues='ALL_NEW')['Attributes']
    except ClientError as error:
        if error.response['Error']['Code']=='ConditionalCheckFailedException':
            return
        raise
    def progress(state):
        table().update_item(Key=key,UpdateExpression='SET #state = :state',
            ExpressionAttributeNames={'#state':'status'},ExpressionAttributeValues={':state':state})
    try:
        company = claimed['company']
        tailoring = json.loads(claimed['tailoring'])
        report = expert_research(company, tailoring, started+BEST_SECONDS, progress)
        report['elapsed_seconds'] = round(time.monotonic()-started,1)
        serialized = json.dumps(report,ensure_ascii=False)
        table().put_item(Item={'pk':claimed['cache_key'], 'expires_at':int(time.time())+21600, 'report':serialized})
        table().update_item(Key=key,UpdateExpression='SET #state = :state, report = :report',
            ExpressionAttributeNames={'#state':'status'},ExpressionAttributeValues={':state':'complete', ':report':serialized})
        print(json.dumps({'event':'expert_complete','model':report['model'],'elapsed_seconds':report['elapsed_seconds']}))
    except Exception as error:
        if isinstance(error, ResearchError):
            code = error.status
            message = ('Best-quality research reached its time limit. Try again or choose Quick.' if code==504 else
                       'The analysis service is busy. Try again shortly.' if code==503 else error.message)
        else:
            code, message = 500, 'Best-quality research is temporarily unavailable. Try again or choose Quick.'
        print(json.dumps({'event':'expert_error','type':type(error).__name__, 'status':code}))
        table().update_item(Key=key,UpdateExpression='SET #state = :state, error_message = :message, error_code = :code',
            ExpressionAttributeNames={'#state':'status'}, ExpressionAttributeValues={':state':'failed', ':message':message, ':code':code})


def job_status(event, origin):
    job_id = (event.get('pathParameters') or {}).get('job_id', '')
    if not re.fullmatch(r'[a-f0-9]{48}', job_id):
        return reply(404, {'error':'Research session not found.'}, origin)
    job = table().get_item(Key={'pk':'job:'+job_id},ConsistentRead=True).get('Item')
    now = int(time.time())
    if not job or int(job['expires_at'])<=now:
        return reply(404, {'error':'Research session expired. Please generate again.'}, origin)
    if job['status']=='complete':
        return reply(200,json.loads(job['report']),origin)
    if job['status']=='failed':
        return reply(int(job['error_code']),{'error':job['error_message']},origin)
    waiting = job['status']=='queued'
    if now-int(job.get('started_at',job['created_at']))>(75 if waiting else BEST_SECONDS+20):
        return reply(504,{'error':'Best-quality research reached its time limit. Try again or choose Quick.'},origin)
    return reply(202,{'job_id':job_id,'status':job['status']},origin)


def start_job(company, tailoring, cache_key, now):
    job_id = secrets.token_hex(24)
    table().put_item(Item={'pk':'job:'+job_id,'status':'queued','company':company,
        'tailoring':json.dumps(tailoring,ensure_ascii=False),'cache_key':cache_key,
        'created_at':now,'expires_at':now+900})
    try:
        boto3.client('lambda').invoke(FunctionName=os.environ['WORKER_NAME'],InvocationType='Event',
            Payload=json.dumps({'job_id':job_id}).encode())
    except Exception:
        table().delete_item(Key={'pk':'job:'+job_id})
        raise
    return {'job_id':job_id, 'status':'queued'}


def consume(key,limit,expires):
    try:
        table().update_item(Key={'pk':key},UpdateExpression='SET expires_at = :ttl ADD requests :one',ConditionExpression='attribute_not_exists(requests) OR requests < :limit',ExpressionAttributeValues={':ttl':expires,':one':1,':limit':limit})
    except ClientError as error:
        if error.response['Error']['Code']=='ConditionalCheckFailedException':
            raise ResearchError(429,'Research limit reached. Please try again later.') from None
        raise


def reply(status,data,origin):
    return {'statusCode':status,'headers':{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','X-Content-Type-Options':'nosniff'},'body':json.dumps(data,ensure_ascii=False)}


def handler(event, context):
    start=time.monotonic()
    origin=(event.get('headers') or {}).get('origin','')
    allowed=os.environ.get('ALLOWED_ORIGIN','https://solacese.github.io')
    if origin!=allowed:
        return reply(403,{'error':'Open the company research tool from its GitHub Pages site.'},allowed)
    method = event.get('requestContext',{}).get('http',{}).get('method')
    if method=='GET':
        try:
            return job_status(event, allowed)
        except Exception as error:
            print(json.dumps({'event':'job_status_error','type':type(error).__name__}))
            return reply(500,{'error':'Could not read the research session. Please try again.'},allowed)
    if method!='POST':
        return reply(405,{'error':'Use POST to research a company.'},allowed)
    try:
        body=event.get('body') or ''
        if event.get('isBase64Encoded'):
            body=base64.b64decode(body).decode()
        if len(body)>12000:
            raise ResearchError(400,'The company brief is too long.')
        try:
            data=json.loads(body)
            if not isinstance(data,dict) or 'company' not in data or set(data)-{'company','tailoring','quality'}:
                raise ValueError()
        except (ValueError,TypeError):
            raise ResearchError(400,'Enter a company name and optional tailoring fields.') from None
        company=clean_company(data['company'])
        tailoring=clean_tailoring(data.get('tailoring',{}))
        quality=data.get('quality','quick')
        if quality not in ('quick','best'):
            raise ResearchError(400, 'Choose Quick or Best quality.')
        source_ip=event.get('requestContext',{}).get('http',{}).get('sourceIp','unknown')
        now=int(time.time())
        digest=hashlib.sha256(source_ip.encode()).hexdigest()[:24]
        consume(f'ip:{digest}:{now//3600}',5,now+7200)
        cache_key=report_cache_key(company,tailoring,quality)
        cached=table().get_item(Key={'pk':cache_key},ConsistentRead=True).get('Item')
        if cached and int(cached['expires_at'])>now:
            report=json.loads(cached['report']);report['cached']=True
        else:
            consume(f'budget:{datetime.now(timezone.utc).date()}',int(os.environ.get('DAILY_LIMIT','100')),now+172800)
            if quality=='best':
                return reply(202,start_job(company,tailoring,cache_key,now),allowed)
            report=research(company,start+DEADLINE_SECONDS,tailoring) if tailoring else research(company,start+DEADLINE_SECONDS)
            table().put_item(Item={'pk':cache_key,'expires_at':now+21600,'report':json.dumps(report,ensure_ascii=False)})
        if quality=='quick':
            report['model']='Perplexity Sonar Pro'
        if tailoring:
            report['tailoring']=tailoring
        report['elapsed_seconds']=round(time.monotonic()-start,1)
        print(json.dumps({'event':'research_complete','cached':report['cached'],'elapsed_seconds':report['elapsed_seconds']}))
        return reply(200,report,allowed)
    except ResearchError as error:
        return reply(error.status,{'error':error.message},allowed)
    except Exception as error:
        # Never log request contents, credentials, provider responses, or endpoint URLs.
        print(json.dumps({'event':'internal_error','type':type(error).__name__}))
        return reply(500,{'error':'Research is temporarily unavailable. Please try again.'},allowed)
