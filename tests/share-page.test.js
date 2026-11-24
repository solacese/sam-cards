const {test}=require('node:test'),assert=require('node:assert/strict');
const {validId,reportsEndpoint,pageLink,shareRequest}=require('../share-page');
const id='a'.repeat(48);

test('share URLs include an organization slug and opaque ID, without brief or old query data',()=> {
  const url=new URL(pageLink('https://solacese.github.io/sam-cards/?check=private&report=old#old',id,'ASSA ABLOY'));
  assert.equal(url.pathname,'/sam-cards/');assert.equal(url.searchParams.get('organization'),'assa-abloy');
  assert.equal(url.searchParams.get('report'),id);assert.equal(url.hash,'');
  assert.deepEqual([...url.searchParams.keys()],['organization','report']);
});

test('Unicode organization names create safe readable links',()=> {
  const url=new URL(pageLink('https://solacese.github.io/sam-cards/',id,'Équipe & Co <img>'));
  assert.equal(url.searchParams.get('organization'),'equipe-co-img');assert.ok(!url.href.includes('<'));
});

test('malformed report IDs are rejected before building a URL',()=> {
  for(const bad of ['',null,'../research','a'.repeat(47),'A'.repeat(48)]) {
    assert.equal(validId(bad),false);assert.throws(()=>pageLink('https://example.org',bad,'Example'));
  }
  assert.equal(validId(id),true);
});

test('share endpoint handles production and relative test URLs',()=> {
  assert.equal(reportsEndpoint('https://api.example.org/research/'),'https://api.example.org/reports');
  assert.equal(reportsEndpoint('/api/research'),'/api/reports');
  assert.throws(()=>reportsEndpoint(null));assert.throws(()=>reportsEndpoint('https://wrong.example.org/'));
});

test('share request references server results and never uploads generated contents',()=> {
  const report={requested_company:'Entered name',company:'Official organization',quality:'best',generated_at:'2026-11-24T10:00:00Z',tailoring:{departments:['Finance'],topic:'Supplier onboarding',systems:['SharePoint']},cases:['not uploaded'],sources:['not uploaded']};
  assert.deepEqual(shareRequest(report),{company:'Entered name',quality:'best',generated_at:report.generated_at,tailoring:report.tailoring});
  assert.deepEqual(shareRequest({company:'Example',generated_at:'today'}),{company:'Example',quality:'quick',generated_at:'today'});
});
