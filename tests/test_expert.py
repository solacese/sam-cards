import copy
import json
import os
import time
import unittest
from unittest.mock import patch, Mock
from botocore.exceptions import ClientError
from test_backend import fixture
import app
from expert import expert_body, bind_evidence

ORIGIN='https://solacese.github.io'
JOB='a'*48


def event(body=None,method='POST',job_id=JOB):
    return {'headers':{'origin':ORIGIN},'requestContext':{'http':{'method':method,'sourceIp':'127.0.0.1'}},
            'pathParameters':{'job_id':job_id},'body':json.dumps(body)}


class ExpertTests(unittest.TestCase):
    def setUp(self):
        self.report=app.validate_report(fixture(),'Example')

    def test_expert_sees_evidence_and_brief_but_no_draft_ideas(self):
        brief={'departments':['Finance'],'topic':'Supplier onboarding','systems':['SharePoint']}
        self.report['cases'][0]['action']='FIRST_PASS_ANCHOR'
        body=expert_body('Example',brief,self.report,'gpt-6-astra')
        text=json.dumps(body)
        self.assertIn('Supplier onboarding',text)
        self.assertNotIn('FIRST_PASS_ANCHOR',text)
        self.assertIn('dated_evidence',text)
        self.assertIn('Proposed thresholds',text)
        self.assertEqual(body['reasoning_effort'],'high')
        self.assertTrue(body['response_format']['json_schema']['strict'])

    def test_claude_does_not_receive_openai_reasoning_flag(self):
        self.assertNotIn('reasoning_effort',expert_body('Example',{},self.report,'claude-opus-5-5'))

    def test_expert_adapter_preserves_provenance(self):
        raw=fixture();raw.update(model='gpt-6-astra');raw['choices'][0]['finish_reason']='stop'
        progress=Mock()
        with patch('app.research',return_value=self.report),patch('app.request_json',return_value=raw) as request,patch('app.EXPERT_SECRET',{'base_url':'https://endpoint.example.org/v1','api_key':'unit-test'}):
            result=app.expert_research('Example',{},time.monotonic()+160,progress)
            self.assertEqual(result['quality'],'best');self.assertEqual(result['model'],'gpt-6-astra')
            self.assertEqual(result['research_model'],'Perplexity Sonar Pro')
            self.assertEqual(progress.call_args_list[-1].args,('designing',))
            self.assertEqual(request.call_args.kwargs['body']['reasoning_effort'],'high')

    def test_truncated_or_substituted_model_output_is_rejected(self):
        for model,finish in [('other-model','stop'),('gpt-6-astra','length')]:
            raw=fixture();raw.update(model=model);raw['choices'][0]['finish_reason']=finish
            with self.subTest(model=model,finish=finish),patch('app.research',return_value=self.report),patch('app.request_json',return_value=raw),patch('app.EXPERT_SECRET',{'base_url':'https://endpoint.example.org/v1','api_key':'unit-test'}):
                with self.assertRaises(app.ResearchError):app.expert_research('Example',{},time.monotonic()+160,Mock())

    def test_evidence_is_bound_to_original_sources(self):
        raw=fixture();raw['citations']=['https://invented.example.org']
        bound=bind_evidence(raw,self.report)
        self.assertEqual(bound['citations'],[s['url'] for s in self.report['sources']])
        self.assertEqual(app.validate_report(bound,'Example')['sources'],self.report['sources'])

    def test_changed_evidence_is_rejected(self):
        for field,value in [('headline','Invented news'),('date','2026-01-01'),('source_ids',[99])]:
            raw=fixture();report=json.loads(raw['choices'][0]['message']['content'])
            report['cases'][0]['news'][field]=value
            raw['choices'][0]['message']['content']=json.dumps(report)
            with self.assertRaises(ValueError):bind_evidence(raw,self.report)

    def test_quality_cache_isolation(self):
        quick=app.report_cache_key('Example',{})
        self.assertNotEqual(quick,app.report_cache_key('Example',{},'best'))
        with patch.dict(os.environ,{'EXPERT_MODEL':'other-model'}):
            other=app.report_cache_key('Example',{},'best')
        self.assertNotEqual(other,app.report_cache_key('Example',{},'best'))

    def test_unknown_quality_rejected_before_quota(self):
        with patch('app.consume') as consume:
            self.assertEqual(app.handler(event({'company':'Example','quality':'fastest'}),None)['statusCode'],400)
            consume.assert_not_called()

    def test_best_starts_job_once_and_counts_budget_once(self):
        with patch('app.table') as table,patch('app.consume') as consume,patch('app.start_job',return_value={'job_id':JOB,'status':'queued'}) as start,patch('app.research') as research:
            table.return_value.get_item.return_value={}
            result=app.handler(event({'company':'Example','quality':'best','tailoring':{'topic':'Invoices'}}),None)
            self.assertEqual(result['statusCode'],202)
            self.assertEqual(consume.call_count,2)
            self.assertEqual(start.call_args.args[1],{'topic':'Invoices'})
            research.assert_not_called()

    def test_best_cache_does_not_launch_worker(self):
        report={**self.report,'quality':'best','model':'gpt-6-astra'}
        with patch('app.table') as table,patch('app.consume') as consume,patch('app.start_job') as start:
            table.return_value.get_item.return_value={'Item':{'expires_at':int(time.time())+10,'report':json.dumps(report)}}
            result=app.handler(event({'company':'Example','quality':'best'}),None)
            data=json.loads(result['body'])
            self.assertEqual(result['statusCode'],200);self.assertTrue(data['cached'])
            self.assertEqual(data['model'],'gpt-6-astra');self.assertEqual(consume.call_count,1)
            start.assert_not_called()

    def test_polling_does_not_consume_quota_or_call_provider(self):
        with patch('app.table') as table,patch('app.consume') as consume,patch('app.research') as research:
            table.return_value.get_item.return_value={'Item':{'status':'designing','created_at':int(time.time()),'expires_at':int(time.time())+900}}
            result=app.handler(event(method='GET'),None)
            self.assertEqual(result['statusCode'],202)
            self.assertEqual(json.loads(result['body'])['status'],'designing')
            consume.assert_not_called();research.assert_not_called()

    def test_bad_job_id_never_queries_database(self):
        with patch('app.table') as table:
            self.assertEqual(app.handler(event(method='GET',job_id='../x'),None)['statusCode'],404)
            table.assert_not_called()

    def test_job_expiry_terminal_states_and_overdue(self):
        now=int(time.time())
        base={'expires_at':now+900,'created_at':now,'status':'researching'}
        variants=[({},404),({'Item':{**base,'expires_at':now-1}},404),
                  ({'Item':{**base,'created_at':now-200}},504),
                  ({'Item':{**base,'status':'complete','report':json.dumps(self.report)}},200),
                  ({'Item':{**base,'status':'failed','error_code':502,'error_message':'Unavailable'}},502)]
        for response,code in variants:
            with self.subTest(code=code),patch('app.table') as table:
                table.return_value.get_item.return_value=response
                self.assertEqual(app.handler(event(method='GET'),None)['statusCode'],code)

    def test_polling_origin_is_checked(self):
        request=event(method='GET');request['headers']['origin']='https://untrusted.example'
        with patch('app.table') as table:
            self.assertEqual(app.handler(request,None)['statusCode'],403);table.assert_not_called()

    def test_duplicate_worker_delivery_never_repeats_paid_call(self):
        error=ClientError({'Error':{'Code':'ConditionalCheckFailedException'}},'UpdateItem')
        with patch('app.table') as table,patch('app.expert_research') as research:
            table.return_value.update_item.side_effect=error
            app.worker({'job_id':JOB},None);research.assert_not_called()
            self.assertIn('expires_at > :now',table.return_value.update_item.call_args.kwargs['ConditionExpression'])

    def test_worker_saves_complete_and_caches_report(self):
        with patch('app.table') as table,patch('app.expert_research',return_value={**self.report,'model':'gpt-6-astra'}):
            table.return_value.update_item.return_value={'Attributes':{'company':'Example','tailoring':'{}','cache_key':'best-cache'}}
            app.worker({'job_id':JOB},None)
            self.assertEqual(table.return_value.put_item.call_args.kwargs['Item']['pk'],'best-cache')
            self.assertEqual(table.return_value.update_item.call_args.kwargs['ExpressionAttributeValues'][':state'],'complete')

    def test_failure_never_returns_lower_quality_fallback(self):
        with patch('app.table') as table,patch('app.expert_research',side_effect=app.ResearchError(504,'timeout')):
            table.return_value.update_item.return_value={'Attributes':{'company':'Example','tailoring':'{}','cache_key':'best-cache'}}
            app.worker({'job_id':JOB},None)
            values=table.return_value.update_item.call_args.kwargs['ExpressionAttributeValues']
            self.assertEqual(values[':state'],'failed');self.assertEqual(values[':code'],504)
            table.return_value.put_item.assert_not_called()

    def test_start_job_uses_opaque_id_and_async_invocation(self):
        with patch('app.table') as table,patch('app.boto3.client') as client,patch.dict(os.environ,{'WORKER_NAME':'worker'}):
            result=app.start_job('Example',{},'cache',int(time.time()))
            self.assertRegex(result['job_id'],r'^[a-f0-9]{48}$')
            self.assertEqual(client.return_value.invoke.call_args.kwargs['InvocationType'],'Event')
            self.assertNotIn('api_key',json.dumps(table.return_value.put_item.call_args.kwargs))

    def test_dispatch_failure_removes_unusable_job(self):
        with patch('app.table') as table,patch('app.boto3.client') as client,patch.dict(os.environ,{'WORKER_NAME':'worker'}):
            client.return_value.invoke.side_effect=RuntimeError()
            with self.assertRaises(RuntimeError):app.start_job('Example',{},'cache',int(time.time()))
            table.return_value.delete_item.assert_called_once()


if __name__=='__main__':unittest.main()
