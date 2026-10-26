"""Low-coverage organizations still receive three honestly labelled proposals."""
import copy
import json
import time
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch
import app
from expert import bind_evidence, expert_body
from prompt import evidence_messages
from test_backend import fixture
from test_tailoring import BRIEF, tailored_raw


def hypotheses(tailoring=None):
    raw=tailored_raw(tailoring) if tailoring else fixture()
    report=json.loads(raw['choices'][0]['message']['content'])
    for case in report['cases']:
        case['news']={'headline':'Proposed workflow to validate','date':'','source_ids':[],'basis':'hypothesis'}
    raw['choices'][0]['message']['content']=json.dumps(report)
    raw['citations']=[];raw['search_results']=[]
    return raw


class LowCoverageTests(unittest.TestCase):
    def test_three_hypotheses_without_any_sources_company_only_and_tailored(self):
        for brief in (None,BRIEF):
            report=app.validate_report(hypotheses(brief),'Quiet organization',brief)
            self.assertEqual(len(report['cases']),3)
            self.assertEqual(report['sources'],[])
            self.assertIn('Limited public information',report['context_note'])
            for case in report['cases']:
                self.assertEqual(case['news']['basis'],'hypothesis')
                self.assertEqual(case['news']['date'],'')
                self.assertEqual(case['news']['source_ids'],[])
            if brief:self.assertEqual(report['tailoring'],BRIEF)

    def test_background_accepts_older_or_undated_real_sources(self):
        for published in ('2000-01-01',''):
            raw=fixture();report=json.loads(raw['choices'][0]['message']['content'])
            for case in report['cases']:
                case['news'].update(basis='background',date=published,source_ids=[1])
            raw['choices'][0]['message']['content']=json.dumps(report)
            raw['search_results']=[{'url':raw['citations'][0],'date':published}]
            checked=app.validate_report(raw,'Example')
            self.assertEqual(len(checked['cases']),3)
            self.assertEqual(len(checked['sources']),1)
            self.assertIn('background information',checked['context_note'])

    def test_hypotheses_cannot_claim_dates_or_citations(self):
        for update in ({'date':'2026-01-01'},{'source_ids':[1]}):
            raw=hypotheses();report=json.loads(raw['choices'][0]['message']['content'])
            report['cases'][0]['news'].update(update)
            raw['choices'][0]['message']['content']=json.dumps(report)
            with self.assertRaises(app.ResearchError):app.validate_report(raw,'Example')
            with self.assertRaises(ValueError):bind_evidence(raw,{'cases':[],'sources':[]})

    def test_background_still_requires_a_safe_source_and_no_future_date(self):
        for update in ({'source_ids':[]},{'source_ids':[99]},{'date':(datetime.now(timezone.utc).date()+timedelta(days=1)).isoformat()}):
            raw=fixture();report=json.loads(raw['choices'][0]['message']['content'])
            report['cases'][0]['news'].update(basis='background',**update)
            raw['choices'][0]['message']['content']=json.dumps(report)
            with self.assertRaises(app.ResearchError):app.validate_report(raw,'Example')

    def test_empty_research_is_valid_and_does_not_invent_facts(self):
        raw={'choices':[{'message':{'content':json.dumps({'evidence':[],'error':'insufficient_recent_news'})}}]}
        checked=app.evidence_report(raw,'Quiet organization')
        self.assertEqual(checked['cases'],[]);self.assertEqual(checked['sources'],[])
        body=expert_body('Quiet organization',{},checked,'gpt-6-astra')
        context=json.loads(body['messages'][1]['content'])
        self.assertEqual(context['evidence'],[])
        self.assertNotIn('search_recency_filter',body)
        self.assertIn('Always return THREE',body['messages'][0]['content'])

    def test_empty_evidence_can_bind_to_three_hypotheses(self):
        empty={'cases':[],'sources':[]}
        bound=bind_evidence(hypotheses(),empty)
        self.assertEqual(bound['citations'],[])
        self.assertEqual(len(app.validate_report(bound,'Example')['cases']),3)
        with self.assertRaises(ValueError):bind_evidence(fixture(),empty)

    def test_research_failure_still_calls_best_model_with_empty_evidence(self):
        raw=hypotheses(BRIEF);raw['model']='gpt-6-astra';raw['choices'][0]['finish_reason']='stop'
        with patch('app.research',side_effect=app.ResearchError(504,'timeout')),patch('app.request_json',return_value=raw) as writer,patch('app.EXPERT_SECRET',{'base_url':'https://test.example/v1','api_key':'test-only'}):
            result=app.expert_research('Quiet organization',BRIEF,time.monotonic()+160,Mock())
        self.assertEqual(len(result['cases']),3)
        self.assertEqual(result['quality'],'best')
        self.assertEqual(json.loads(writer.call_args.kwargs['body']['messages'][1]['content'])['evidence'],[])

    def test_invalid_metadata_date_is_not_exposed_as_a_date(self):
        raw=fixture();raw['search_results']=[{'url':raw['citations'][0],'date':'unknown'}]
        self.assertEqual(app.public_sources(raw)[0]['date'],'')

    def test_research_prompt_prefers_background_before_hypotheses(self):
        prompt=evidence_messages('Quiet organization')[0]['content']
        self.assertIn('older or undated',prompt)
        self.assertIn('evidence',prompt)

if __name__=='__main__':unittest.main()
