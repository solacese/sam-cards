"""Stable opportunity links only publish immutable server-generated results."""
import copy
import json
import time
import unittest
from unittest.mock import patch
from botocore.exceptions import ClientError
import app
from test_backend import fixture
from test_tailoring import BRIEF, tailored_raw

ORIGIN='https://solacese.github.io'
ID='c'*48


def event(data=None,method='POST',report_id=ID):
    return {'headers':{'origin':ORIGIN},'routeKey':method+' /reports'+('/{report_id}' if method=='GET' else ''),
            'rawPath':'/reports'+('/'+report_id if method=='GET' else ''),
            'pathParameters':{'report_id':report_id} if method=='GET' else {},
            'requestContext':{'http':{'method':method,'sourceIp':'192.0.2.40'}},'body':json.dumps(data)}


class MemoryTable:
    def __init__(self):self.items={}
    def get_item(self,Key,**kwargs):return {'Item':copy.deepcopy(self.items.get(Key['pk']))}
    def put_item(self,Item,**kwargs):self.items[Item['pk']]=copy.deepcopy(Item)


class SharingTests(unittest.TestCase):
    def setUp(self):
        self.report=app.validate_report(fixture(),'Example')
        self.store=MemoryTable()
        self.key=app.report_cache_key('Example',{})
        self.store.items[self.key]={'pk':self.key,'expires_at':int(time.time())+600,'report':json.dumps(self.report)}
        self.data={'company':'Example','generated_at':self.report['generated_at']}

    def invoke(self,request):
        with patch('app.table',return_value=self.store),patch('app.consume') as quota,patch('app.research') as model,patch('app.start_job') as job:
            response=app.handler(request,None)
            model.assert_not_called();job.assert_not_called()
            return response,quota

    def test_share_creates_persistent_snapshot_without_research(self):
        response,quota=self.invoke(event(self.data))
        self.assertEqual(response['statusCode'],201)
        report_id=json.loads(response['body'])['report_id']
        self.assertRegex(report_id,r'^[a-f0-9]{48}$')
        saved=self.store.items['shared:'+report_id]
        self.assertNotIn('expires_at',saved)
        snapshot=json.loads(saved['report'])
        self.assertEqual(snapshot['cases'],self.report['cases'])
        self.assertEqual(snapshot['sources'],self.report['sources'])
        self.assertEqual(snapshot['generated_at'],self.report['generated_at'])
        self.assertIn('shared_at',snapshot)
        self.assertEqual(quota.call_count,2)
        self.assertTrue(all(call.args[0].startswith('share-') for call in quota.call_args_list))

    def test_old_link_survives_cache_expiry_replacement_and_deletion(self):
        response,_=self.invoke(event(self.data));report_id=json.loads(response['body'])['report_id']
        self.store.items[self.key]['expires_at']=0
        self.store.items[self.key]['report']='{"cases":[]}'
        del self.store.items[self.key]
        response,quota=self.invoke(event(method='GET',report_id=report_id))
        self.assertEqual(response['statusCode'],200);quota.assert_not_called()
        self.assertEqual(json.loads(response['body'])['report']['cases'],self.report['cases'])
        self.assertEqual(response['headers']['Cache-Control'],'no-store')

    def test_share_does_not_publish_internal_fields(self):
        internal={**self.report,'requested_company':'Private lookup','cache_key':'internal-only','api_key':'test-only'}
        self.store.items[self.key]['report']=json.dumps(internal)
        response,_=self.invoke(event(self.data));report_id=json.loads(response['body'])['report_id']
        snapshot=json.loads(self.store.items['shared:'+report_id]['report'])
        for field in ('requested_company','cache_key','api_key','cached'):self.assertNotIn(field,snapshot)

    def test_tampered_or_expired_reports_cannot_be_published(self):
        for mode in ('missing','expired','changed'):
            with self.subTest(mode=mode):
                original=copy.deepcopy(self.store.items[self.key])
                if mode=='missing':del self.store.items[self.key]
                elif mode=='expired':self.store.items[self.key]['expires_at']=0
                else:self.data['generated_at']='2000-01-01T00:00:00Z'
                response,quota=self.invoke(event(self.data))
                self.assertEqual(response['statusCode'],409);quota.assert_not_called()
                self.assertFalse(any(key.startswith('shared:') for key in self.store.items))
                self.store.items[self.key]=original;self.data['generated_at']=self.report['generated_at']

    def test_client_cannot_upload_arbitrary_cases_or_html(self):
        for extra in ({'report':self.report},{'cases':self.report['cases']},{'html':'<script>bad</script>'},{'generated_at':None}):
            response,quota=self.invoke(event({**self.data,**extra}))
            self.assertEqual(response['statusCode'],400);quota.assert_not_called()
        response,_=self.invoke(event({'company':'Example'}));self.assertEqual(response['statusCode'],400)

    def test_best_tailored_report_keeps_exact_brief_and_cases(self):
        report=app.validate_report(tailored_raw(BRIEF),'Example',BRIEF)
        report.update(quality='best',model='gpt-6-astra')
        key=app.report_cache_key('Example',BRIEF,'best')
        self.store.items[key]={'pk':key,'report':json.dumps(report),'expires_at':int(time.time())+600}
        response,_=self.invoke(event({'company':'Example','quality':'best','tailoring':BRIEF,'generated_at':report['generated_at']}))
        saved=json.loads(self.store.items['shared:'+json.loads(response['body'])['report_id']]['report'])
        self.assertEqual(saved['tailoring'],BRIEF);self.assertEqual(saved['cases'],report['cases'])
        self.assertEqual(saved['quality'],'best')

    def test_unknown_and_malformed_links_do_not_leak_jobs_or_cache(self):
        for report_id in (ID,'../cache','a'*47,'A'*48):
            with patch('app.table') as storage:
                storage.return_value.get_item.return_value={}
                response=app.handler(event(method='GET',report_id=report_id),None)
                self.assertEqual(response['statusCode'],404)
                if report_id!=ID:storage.assert_not_called()
                else:self.assertEqual(storage.return_value.get_item.call_args.kwargs['Key'],{'pk':'shared:'+ID})

    def test_only_site_origin_can_publish_or_read(self):
        for method in ('POST','GET'):
            request=event(self.data,method=method);request['headers']['origin']='https://untrusted.example'
            with patch('app.table') as storage:
                self.assertEqual(app.handler(request,None)['statusCode'],403);storage.assert_not_called()

    def test_share_quota_prevents_persistence(self):
        with patch('app.table',return_value=self.store),patch('app.consume',side_effect=app.ResearchError(429,'limit')):
            response=app.handler(event(self.data),None)
        self.assertEqual(response['statusCode'],429)
        self.assertFalse(any(key.startswith('shared:') for key in self.store.items))

if __name__=='__main__':unittest.main()
