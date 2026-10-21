const {test}=require('node:test');
const assert=require('node:assert/strict');
const {organizationText,presentReport,explanation}=require('../report-content');
const {buildPrompt}=require('../quick-build');

function fixture() {
  return {company:'Customer & Company',generated_at:'2026-10-21T10:00:00Z',sources:[{id:1,title:'Customer & Company expands customer access',url:'https://news.example.org/customer',date:'2026-10-20'}],tailoring:{departments:['Customer Service'],outcomes:['Improve customer experience'],topic:'Supplier onboarding'},
    cases:[{title:'Review Customer & Company approvals',news:{headline:'Customer & Company expands customer access',date:'2026-10-20',source_ids:[1]},trigger:'A company approval arrives before evidence',action:'Ask Customer & Company to review customer approvals',human:'The customer approves the decision',learning:'Evaluate customer corrections offline',risk:'Missing customer evidence',revenue:'Protect company revenue',why_mesh:'Queued events preserve customer review requests',metric:'Customer response time',question:'Who approves company changes?',agents:[{name:'Evidence',role:'Review customer evidence'},{name:'Decision',role:'Prepare company review'}],fit:{departments:[{name:'Customer Service',role:'Review customer approvals'}],topic:'Proposed company onboarding',outcomes:[{name:'Improve customer experience',impact:'Resolve customer exceptions sooner'}],systems:[],assumptions:'Customer access is unverified'}}]};
}

test('organization wording handles capitalization, plurals, possessives and articles',()=> {
  assert.equal(organizationText('Enter a company name.'),'Enter an organization name.');
  assert.equal(organizationText("Customer approval and the customer's records"),"Organization approval and the organization's records");
  assert.equal(organizationText('CUSTOMERS and Companies'),'ORGANIZATIONS and Organizations');
});

test('cached reports update proposals and legacy options without changing evidence, names or the original report',()=> {
  const raw=fixture(),before=JSON.stringify(raw),shown=presentReport(raw);
  assert.equal(shown.company,raw.company);
  assert.deepEqual(shown.sources,raw.sources);
  assert.deepEqual(shown.cases[0].news,raw.cases[0].news);
  assert.equal(shown.cases[0].title,'Review Customer & Company approvals');
  assert.equal(shown.cases[0].trigger,'An organization approval arrives before evidence');
  assert.equal(shown.cases[0].action,'Ask Customer & Company to review organization approvals');
  assert.deepEqual(shown.tailoring.departments,['Service & support']);
  assert.deepEqual(shown.tailoring.outcomes,['Improve experience']);
  assert.equal(shown.cases[0].fit.outcomes[0].name,'Improve experience');
  assert.equal(JSON.stringify(raw),before);
  assert.deepEqual(presentReport(shown),shown);
});

test('custom organization names and user-entered criteria remain literal data',()=> {
  const raw=fixture();raw.tailoring={departments:['Customer Research Partners'],topic:'customer interviews',systems:['Customer Records System']};
  const shown=presentReport(raw);
  assert.deepEqual(shown.tailoring,raw.tailoring);
  assert.equal(shown.sources[0].url,'https://news.example.org/customer');
});

test('left-hand explanation contains the action, trigger and human review as separate sentences',()=> {
  const item={action:'Compare booking and capacity events.',trigger:'A booking changes',human:'Operations approves any release!'};
  assert.deepEqual(explanation(item),[{label:'',text:'Compare booking and capacity events.'},{label:'Starts when',text:'A booking changes.'},{label:'Human review',text:'Operations approves any release!'}]);
  const full={...item,human:'Finance approves corrections; Procurement approves release'};
  assert.equal(explanation(full)[2].text,'Finance approves corrections.');
  assert.equal(full.human,'Finance approves corrections; Procurement approves release');
});

test('Quick Builder context uses organization and keeps the richer explanation grounded in the same case',()=> {
  const raw=fixture(),text=buildPrompt(raw,raw.cases[0]);
  const context=JSON.parse(text.split('\nCASE_CONTEXT\n')[1].split('\nEND_CASE_CONTEXT\n')[0]);
  assert.equal(context.organization,raw.company);assert.ok(!('company'in context));
  assert.equal(context.proposed_workflow.action,'Ask Customer & Company to review organization approvals');
  assert.equal(context.proposed_workflow.human_approval,'The organization approves the decision');
  assert.deepEqual(context.news,raw.cases[0].news);
  const instructions=text.split('END_CASE_CONTEXT\n')[1];
  assert.ok(!/\bcustomers?\b|\bcompany\b/i.test(instructions));
});
