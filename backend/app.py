"""Twenty-second public research API. Credentials never leave the server."""
import base64
import hashlib
import ipaddress
import json
import os
import re
import socket
import time
import unicodedata
from datetime import date, datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import boto3
from botocore.exceptions import ClientError
from prompt import CAPABILITY_SOURCES, messages

VERSION = 'company-research-v3'
SECRET = None
TOKEN = None
TABLE = None
DEADLINE_SECONDS = 19
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


def text_field(value, maximum=800):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ResearchError(502, 'The research response was incomplete. Please try again.')
    return value.strip()


def validate_report(raw, requested_company):
    """Only expose a complete, recent, citation-backed three-case response."""
    try:
        content = raw['choices'][0]['message']['content'].strip()
        content = re.sub(r'^```(?:json)?\s*|\s*```$', '', content)
        report = json.loads(content)
        if not isinstance(report, dict) or report.get('error'):
            raise ResearchError(422, 'Not enough recent, reliable news was found. Try the full company name.')
        citations = raw.get('citations', [])
        search = {item.get('url'):item for item in raw.get('search_results',[]) if isinstance(item,dict)}
        sources = []
        for index, url in enumerate(citations, 1):
            url = safe_url(url)
            if url:
                item = search.get(url, {})
                sources.append({'id':index,'url':url,'title':str(item.get('title') or urlsplit(url).hostname)[:300], 'date':str(item.get('date') or '')[:10]})
        ids = {item['id'] for item in sources}
        cases = report.get('cases')
        if not isinstance(cases, list) or len(cases) != 3:
            raise ValueError('case count')
        today = datetime.now(timezone.utc).date()
        cleaned = []
        used = set()
        for item in cases:
            result = {key:text_field(item.get(key)) for key in FIELDS}
            agents = item.get('agents')
            if not isinstance(agents,list) or not 2 <= len(agents) <= 3:
                raise ValueError('requires two or three agents')
            result['agents'] = [{'name':text_field(agent.get('name'),100), 'role':text_field(agent.get('role'),200)} for agent in agents]
            if len({agent['name'].casefold() for agent in result['agents']}) != len(agents):
                raise ValueError('duplicate agents')
            news = item['news']
            published = date.fromisoformat(news['date'])
            if not today - timedelta(days=180) <= published <= today:
                raise ValueError('stale or future news')
            refs = news['source_ids']
            if not isinstance(refs,list) or not refs or any(type(i) is not int or i not in ids for i in refs):
                raise ValueError('invalid citation')
            dated_refs = [source['date'] for source in sources if source['id'] in refs and re.fullmatch(r'\d{4}-\d{2}-\d{2}',source['date'])]
            if dated_refs and published.isoformat() not in dated_refs:
                raise ValueError('news date differs from source metadata')
            used.update(refs)
            result['news']={'headline':text_field(news['headline'],400), 'date':published.isoformat(), 'source_ids':list(dict.fromkeys(refs))}
            cleaned.append(result)
        if len({item['title'].casefold() for item in cleaned}) != 3 or len(used)<3:
            raise ValueError('duplicate cases or insufficient sources')
        return {'company':text_field(report.get('company'),160),'requested_company':requested_company,'overview':text_field(report.get('overview'),600),'cases':cleaned,'sources':[item for item in sources if item['id'] in used],'capability_sources':CAPABILITY_SOURCES,'generated_at':datetime.now(timezone.utc).isoformat(),'model':'Perplexity Sonar Pro','version':VERSION,'cached':False}
    except ResearchError:
        raise
    except (ValueError, TypeError, KeyError, IndexError, AttributeError):
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


def research(company, deadline):
    global TOKEN
    credentials=get_secret()
    if not TOKEN or TOKEN['until']<=time.time()+30:
        auth=request_json(credentials['SAP_AUTH_URL'],deadline,body={'grant_type':'client_credentials','client_id':credentials['SAP_CLIENT_ID'],'client_secret':credentials['SAP_CLIENT_SECRET']},headers={'Content-Type':'application/x-www-form-urlencoded'},form=True)
        TOKEN={'value':auth['access_token'],'until':time.time()+int(auth.get('expires_in',300))}
    response=request_json(credentials['DEPLOYMENT_URL'].rstrip('/')+'/chat/completions',deadline,
        body={'model':credentials['MODEL'],'messages':messages(company),'temperature':.2,'max_tokens':2600,'search_recency_filter':'month'},
        headers={'Authorization':'Bearer '+TOKEN['value'],'AI-Resource-Group':credentials['SAP_RESOURCE_GROUP'],'Content-Type':'application/json'})
    return validate_report(response,company)


def table():
    global TABLE
    if TABLE is None:
        TABLE=boto3.resource('dynamodb').Table(os.environ['TABLE_NAME'])
    return TABLE


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
    if event.get('requestContext',{}).get('http',{}).get('method')!='POST':
        return reply(405,{'error':'Use POST to research a company.'},allowed)
    try:
        body=event.get('body') or ''
        if event.get('isBase64Encoded'):
            body=base64.b64decode(body).decode()
        if len(body)>2000:
            raise ResearchError(400,'Enter only a company name.')
        try:
            data=json.loads(body)
            if not isinstance(data,dict) or set(data)!={'company'}:
                raise ValueError()
        except (ValueError,TypeError):
            raise ResearchError(400,'Enter only a company name.') from None
        company=clean_company(data['company'])
        source_ip=event.get('requestContext',{}).get('http',{}).get('sourceIp','unknown')
        now=int(time.time())
        digest=hashlib.sha256(source_ip.encode()).hexdigest()[:24]
        consume(f'ip:{digest}:{now//3600}',5,now+7200)
        cache_key=f'cache:{VERSION}:{hashlib.sha256(company.casefold().encode()).hexdigest()}'
        cached=table().get_item(Key={'pk':cache_key},ConsistentRead=True).get('Item')
        if cached and int(cached['expires_at'])>now:
            report=json.loads(cached['report']);report['cached']=True
        else:
            consume(f'budget:{datetime.now(timezone.utc).date()}',int(os.environ.get('DAILY_LIMIT','100')),now+172800)
            report=research(company,start+DEADLINE_SECONDS)
            table().put_item(Item={'pk':cache_key,'expires_at':now+21600,'report':json.dumps(report,ensure_ascii=False)})
        report['model']='Perplexity Sonar Pro'
        report['elapsed_seconds']=round(time.monotonic()-start,1)
        print(json.dumps({'event':'research_complete','cached':report['cached'],'elapsed_seconds':report['elapsed_seconds']}))
        return reply(200,report,allowed)
    except ResearchError as error:
        return reply(error.status,{'error':error.message},allowed)
    except Exception as error:
        # Never log request contents, credentials, provider responses, or endpoint URLs.
        print(json.dumps({'event':'internal_error','type':type(error).__name__}))
        return reply(500,{'error':'Research is temporarily unavailable. Please try again.'},allowed)
