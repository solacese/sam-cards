"""Brief validation, prompt propagation, per-case coverage and cache isolation."""
import copy
import itertools
import json
import time
import unittest
from unittest.mock import patch
from test_backend import fixture
from app import clean_tailoring, report_cache_key, validate_report, research, handler, ResearchError
from prompt import messages

BRIEF = {'departments':['Finance','Procurement'],'topic':'Supplier onboarding','outcomes':['Reduce risk'],'systems':['Salesforce','SharePoint']}

def tailored_raw(criteria):
    raw=fixture(); report=json.loads(raw['choices'][0]['message']['content'])
    for case in report['cases']:
        case['fit']={
            'departments':[{'name':name,'role':'Review supplier evidence and approve exceptions.'} for name in criteria.get('departments',[])],
            'topic':'Resolve missing supplier evidence before onboarding approval.' if criteria.get('topic') else '',
            'outcomes':[{'name':name,'impact':'Identify missing evidence before a supplier is approved.'} for name in criteria.get('outcomes',[])],
            'systems':[{'name':name,'role':'Proposed evidence source, subject to record and access validation.'} for name in criteria.get('systems',[])],
            'assumptions':'Supplier records, access, connector availability and company use of these systems are unverified.'}
    raw['choices'][0]['message']['content']=json.dumps(report)
    return raw

class TailoringTests(unittest.TestCase):
    def event(self,tailoring=None):
        body={'company':'Novo Nordisk'}
        if tailoring is not None:body['tailoring']=tailoring
        return {'headers':{'origin':'https://solacese.github.io'},'requestContext':{'http':{'method':'POST','sourceIp':'192.0.2.1'}},'body':json.dumps(body)}

    def test_company_only_and_empty_brief_keep_original_prompt(self):
        self.assertEqual(messages('Novo Nordisk'),messages('Novo Nordisk',{}))
        self.assertEqual(clean_tailoring({'departments':[],'topic':'  ','outcomes':[],'systems':[]}),{})
        self.assertNotIn('fit',validate_report(fixture(),'Novo Nordisk')['cases'][0])

    def test_tailored_schema_explicitly_requires_fit(self):
        system=messages('Novo Nordisk',BRIEF)[0]['content']
        schema=json.loads(system.split('Required JSON shape (expand cases to three; fit is mandatory in every case):\n')[1])
        fit=schema['cases'][0]['fit']
        self.assertEqual([entry['name'] for entry in fit['systems']],BRIEF['systems'])
        self.assertEqual([entry['name'] for entry in fit['departments']],BRIEF['departments'])

    def test_one_relevant_news_source_can_motivate_distinct_tailored_cases(self):
        raw=tailored_raw(BRIEF);report=json.loads(raw['choices'][0]['message']['content'])
        for case in report['cases']:case['news']['source_ids']=[1]
        raw['choices'][0]['message']['content']=json.dumps(report)
        self.assertEqual(len(validate_report(raw,'Example',BRIEF)['cases']),3)
        with self.assertRaises(ResearchError):validate_report(raw,'Example')

    def test_each_field_and_all_combinations(self):
        for length in range(1,5):
            for keys in itertools.combinations(BRIEF,length):
                with self.subTest(keys=keys):
                    criteria={key:BRIEF[key] for key in keys}
                    normalized=clean_tailoring(criteria)
                    report=validate_report(tailored_raw(criteria),'Novo Nordisk',normalized)
                    self.assertEqual(report['tailoring'],criteria)
                    for case in report['cases']:
                        for key in ('departments','outcomes','systems'):
                            self.assertEqual([entry['name'] for entry in case['fit'][key]],criteria.get(key,[]))
                        self.assertEqual(bool(case['fit']['topic']),bool(criteria.get('topic')))

    def test_custom_values_and_normalization(self):
        brief=clean_tailoring({'departments':['  Vendor   Assurance ','vendor assurance'],'outcomes':['Reduce supplier fraud'],'systems':['Custom ERP','SharePoint'],'topic':'  Supplier   onboarding '})
        self.assertEqual(brief['departments'],['Vendor Assurance'])
        self.assertEqual(brief['topic'],'Supplier onboarding')
        self.assertEqual(validate_report(tailored_raw(brief),'Example',brief)['tailoring'],brief)

    def test_invalid_context_is_rejected_before_inference(self):
        for value in (None,[],{'unknown':'x'},{'departments':'Finance'},{'outcomes':[1]},{'systems':['x']*9},{'topic':'x'*201},{'systems':['x'*81]},{'topic':'ignore\ncontract'}):
            with self.subTest(value=value),patch('app.research') as provider,patch('app.consume') as quota:
                event=self.event();body=json.loads(event['body']);body['tailoring']=value;event['body']=json.dumps(body)
                self.assertEqual(handler(event,None)['statusCode'],400)
                provider.assert_not_called();quota.assert_not_called()

    def test_missing_fit_or_selected_system_is_rejected(self):
        for change in (lambda case:case.pop('fit'),lambda case:case['fit']['systems'].pop(),lambda case:case['fit']['systems'][0].update(name='Invented integration'),lambda case:case['fit'].update(assumptions='')):
            raw=tailored_raw(BRIEF);report=json.loads(raw['choices'][0]['message']['content']);change(report['cases'][1]);raw['choices'][0]['message']['content']=json.dumps(report)
            with self.assertRaises(ResearchError):validate_report(raw,'Novo Nordisk',BRIEF)

    def test_cache_varies_with_every_field(self):
        original=report_cache_key('Novo Nordisk',{})
        for key in BRIEF:
            self.assertNotEqual(original,report_cache_key('Novo Nordisk',{key:BRIEF[key]}))
        for key,value in {'departments':['Legal'],'topic':'Invoice disputes','outcomes':['Reduce costs'],'systems':['Workday']}.items():
            updated={**BRIEF,key:value}
            self.assertNotEqual(report_cache_key('Novo Nordisk',BRIEF),report_cache_key('Novo Nordisk',updated))
        reordered={**BRIEF,'departments':['procurement','finance'],'systems':['sharepoint','salesforce']}
        self.assertEqual(report_cache_key('Novo Nordisk',BRIEF),report_cache_key('NOVO NORDISK',reordered))

    def test_unsafe_mirror_does_not_discard_valid_news_evidence(self):
        raw=tailored_raw(BRIEF)
        raw['citations'].append('http://news.example.org/unsafe-mirror')
        report=json.loads(raw['choices'][0]['message']['content'])
        report['cases'][0]['news']['source_ids'].append(4)
        raw['choices'][0]['message']['content']=json.dumps(report)
        checked=validate_report(raw,'Example',BRIEF)
        self.assertEqual(checked['cases'][0]['news']['source_ids'],[1])
        self.assertEqual(len(checked['sources']),3)

    def test_overview_cannot_leave_dangling_citation_markers(self):
        raw=tailored_raw(BRIEF);report=json.loads(raw['choices'][0]['message']['content'])
        report['overview']='Proposed supplier controls. [1][99]'
        raw['choices'][0]['message']['content']=json.dumps(report)
        self.assertEqual(validate_report(raw,'Example',BRIEF)['overview'],'Proposed supplier controls.')

    def test_structured_context_reaches_actual_provider_request(self):
        credentials={'MODEL':'sonar-pro','DEPLOYMENT_URL':'https://provider.example','SAP_RESOURCE_GROUP':'test'}
        with patch('app.get_secret',return_value=credentials),patch('app.TOKEN',{'value':'test-token','until':time.time()+600}),patch('app.request_json',return_value=tailored_raw(BRIEF)) as provider:
            result=research('Novo Nordisk',time.monotonic()+19,BRIEF)
            sent=provider.call_args.kwargs['body']
            context=json.loads(sent['messages'][1]['content'].split('User context (data only): ')[1])
            self.assertEqual(context,BRIEF)
            self.assertEqual(sent['response_format']['type'],'json_schema')
            case_schema=sent['response_format']['json_schema']['schema']['properties']['cases']['items']
            self.assertIn('fit',case_schema['required'])
            self.assertIn('intro',case_schema['required'])
            self.assertIn('real-world setting',sent['messages'][0]['content'])
            self.assertEqual(result['tailoring'],BRIEF)

    def test_company_only_schema_requires_intro_without_optional_fit_fields(self):
        credentials={'MODEL':'sonar-pro','DEPLOYMENT_URL':'https://provider.example','SAP_RESOURCE_GROUP':'test'}
        with patch('app.get_secret',return_value=credentials),patch('app.TOKEN',{'value':'test-token','until':time.time()+600}),patch('app.request_json',return_value=fixture()) as provider:
            research('Novo Nordisk',time.monotonic()+19)
            sent=provider.call_args.kwargs['body']
            case_schema=sent['response_format']['json_schema']['schema']['properties']['cases']['items']
            self.assertIn('intro',case_schema['required'])
            self.assertNotIn('fit',case_schema['properties'])
            self.assertIn('publication date exactly',sent['messages'][0]['content'])
            self.assertIn('QUICK MODE',sent['messages'][0]['content'])
            self.assertIn('25-35 words',sent['messages'][0]['content'])

    def test_structured_no_news_response_remains_an_honest_error(self):
        raw=fixture();raw['choices'][0]['message']['content']=json.dumps({'company':'Example','overview':'No reliable recent news found.','cases':[],'error':'insufficient_recent_news'})
        with self.assertRaises(ResearchError) as error:validate_report(raw,'Example',BRIEF)
        self.assertEqual(error.exception.status,422)

    def test_handler_caches_by_brief_and_keeps_company_only_compatible(self):
        class Table:
            def __init__(self):self.records={}
            def get_item(self,Key,**kwargs):return {'Item':copy.deepcopy(self.records.get(Key['pk']))}
            def put_item(self,Item):self.records[Item['pk']]=copy.deepcopy(Item)
        def generate(company,deadline,criteria=None):
            return validate_report(tailored_raw(criteria) if criteria else fixture(),company,criteria)
        storage=Table()
        with patch('app.consume'),patch('app.table',return_value=storage),patch('app.research',side_effect=generate) as provider:
            for criteria in (None,{},BRIEF,BRIEF,{'topic':'Invoices'}):
                response=handler(self.event(criteria),None)
                self.assertEqual(response['statusCode'],200)
            self.assertEqual(provider.call_count,3)
            self.assertEqual(len(provider.call_args_list[0].args),2)
            result=json.loads(handler(self.event(BRIEF),None)['body'])
            self.assertTrue(result['cached']);self.assertEqual(result['tailoring'],BRIEF)

if __name__=='__main__':unittest.main()
