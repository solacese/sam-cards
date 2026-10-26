const {test}=require('node:test');
const assert=require('node:assert/strict');
const {jsPDF}=require('../assets/vendor/jspdf.umd.min.js');
const {createResearchPDF}=require('../pdf-export');

function report() {
  return {company:'Fictional Test Company',generated_at:'2026-10-21T10:00:00Z',sources:[1,2,3].map(id=>({id,title:`Test news ${id}`,url:`https://news.example.org/${id}`,date:'2026-10-20'})),capability_sources:[{title:'Framework',url:'https://docs.solace.com/Agent-Mesh/Framework/concepts/event-driven-mesh.htm'}],
    cases:[1,2,3].map(id=>({title:`Opportunity ${id}`,news:{headline:`Fictional development ${id}`,date:'2026-10-20',source_ids:[id]},
      trigger:'A proposed supplier approval arrives before required evidence.',action:'Prepare missing evidence requests and route financial exceptions to a reviewer.',
      agents:[{name:'Evidence',role:'Find missing supplier evidence.'},{name:'Review',role:'Prepare approval decisions.'}],
      why_mesh:'Configured queues preserve evidence handoffs during downstream outages.',human:'Finance reviews financial exceptions before Procurement approves the supplier.',
      learning:'Record outcomes and reviewer corrections; evaluate offline and approve rule changes.',risk:'Incomplete supplier evidence.',revenue:'Indirect; revenue impact unestablished.',metric:'Incomplete approvals and time to resolve missing evidence.',question:'Which evidence is mandatory before approval?'}))};
}

function instrumented() {
  const text=[],links=[];
  function Constructor(options) {
    const doc=new jsPDF(options),originalText=doc.text.bind(doc),originalLink=doc.link.bind(doc);
    doc.text=(value,x,y,options)=> {
      const size=doc.getFontSize(),page=doc.internal.getCurrentPageInfo().pageNumber;
      const content=String(value),width=doc.getTextWidth(content),left=options?.align==='right'?x-width:x;
      if(content.trim())text.push({page,content,left,right:left+width,top:y-size*.3528,bottom:y,size});
      return originalText(value,x,y,options);
    };
    doc.link=(x,y,w,h,options)=> {links.push({page:doc.internal.getCurrentPageInfo().pageNumber,...options});return originalLink(x,y,w,h,options);};
    return doc;
  }
  return {text,links,Constructor};
}

function assertFits(text) {
  for(const item of text) {
    assert.ok(item.left>=17.8&&item.right<=192.2,`Text outside horizontal margin: ${item.content}`);
    assert.ok(item.top>=3&&item.bottom<=291.1,`Text outside page: ${item.content}`);
    assert.ok(item.size>=7.5,`Unreadable font: ${item.content}`);
  }
  for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++) {
    const a=text[i],b=text[j];if(a.page!==b.page)continue;
    const horizontal=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const vertical=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    assert.ok(horizontal<.3||vertical<.25,`Overlapping text: ${a.content} / ${b.content}`);
  }
}

test('exactly one case per page, with its evidence and linked source',()=> {
  const data=report(),tracker=instrumented(),doc=createResearchPDF(data,tracker.Constructor);
  assert.equal(doc.getNumberOfPages(),3);
  for(let page=1;page<=3;page++) {
    const contents=tracker.text.filter(item=>item.page===page).map(item=>item.content).join('\n');
    assert.ok(contents.includes(`Opportunity ${page}`));
    assert.ok(contents.includes(`Fictional development ${page}`));
    assert.ok(contents.includes('ASK YOUR ORGANIZATION'));
    assert.ok(!/\bcustomer\b/i.test(contents),'PDF contains inconsistent customer wording');
    for(let other=1;other<=3;other++)if(other!==page)assert.ok(!contents.includes(`Opportunity ${other}`));
    assert.ok(tracker.links.some(link=>link.page===page&&link.url===data.sources[page-1].url));
  }
  assertFits(tracker.text);
  assert.equal(Buffer.from(doc.output('arraybuffer')).subarray(0,4).toString(),'%PDF');
});

test('tailored system roles, assumptions and measured value remain legible',()=> {
  const data=report();data.tailoring={departments:['Finance','Procurement'],topic:'Supplier onboarding'};
  data.cases.forEach(item=>item.fit={outcomes:[{name:'Reduce risk',impact:'Prevent approval before supplier evidence is reviewed.'}],systems:[{name:'Salesforce',role:'Hypothetical pending onboarding approval and signoff versions; records, events, permissions and usefulness unconfirmed.'},{name:'SharePoint',role:'Hypothetical manufacturing scope revision evidence; records, events, access and connector feasibility remain unconfirmed.'}],assumptions:'Records, access and integrations are unverified.'});
  const tracker=instrumented();assert.equal(createResearchPDF(data,tracker.Constructor).getNumberOfPages(),3);
  assertFits(tracker.text);
  for(let page=1;page<=3;page++) {
    const text=tracker.text.filter(item=>item.page===page).map(item=>item.content).join('\n');
    for(const expected of ['Finance / Procurement','Supplier onboarding','Salesforce:','SharePoint:','Records, access and integrations'])assert.ok(text.includes(expected));
    assert.ok(text.replace(/\s+/g,' ').includes('connector feasibility remain unconfirmed.'));
  }
});

test('long supported fields stay on three pages without overlaps; condensation is disclosed',()=> {
  const data=report(),long='Detailed operational evidence and workflow requirements '.repeat(20).slice(0,800);
  data.company='A long fictional company name '.repeat(6).slice(0,160);
  data.tailoring={departments:Array(8).fill('Custom department with a very long display name'),topic:'Supplier onboarding '.repeat(10)};
  data.cases.forEach((item,index)=> {
    for(const key of ['title','trigger','action','why_mesh','human','learning','risk','revenue','metric','question'])item[key]=long;
    item.title+=index;item.intro=long.slice(0,650);item.news.headline=long.slice(0,400);
    item.agents=Array.from({length:3},(_,i)=>({name:`Agent ${i}`,role:long.slice(0,200)}));
    item.fit={outcomes:Array.from({length:8},(_,i)=>({name:`Long custom outcome ${i}`,impact:long.slice(0,400)})),systems:Array.from({length:8},(_,i)=>({name:`System ${i}`,role:long.slice(0,400)})),assumptions:long.slice(0,600)};
  });
  const tracker=instrumented();assert.equal(createResearchPDF(data,tracker.Constructor).getNumberOfPages(),3);assertFits(tracker.text);
  assert.equal(tracker.text.filter(item=>item.content==='Condensed brief. Full workflow in the app.').length,3);
});

test('PDF source links do not accept non-HTTPS destinations',()=> {
  const data=report();data.sources[0].url='javascript:alert(1)';
  const tracker=instrumented();createResearchPDF(data,tracker.Constructor);
  assert.ok(tracker.links.every(link=>link.url.startsWith('https://')));
});

test('context introductions appear before the workflow while all cases stay on their own page',()=> {
  const data=report();
  data.cases.forEach((item,index)=>item.intro=`Team ${index+1} may need several documents before approving a supplier. Missing paperwork can hold up the work or lead to a rushed decision. This proposed check could help the team find gaps before making an approval.`);
  const tracker=instrumented();assert.equal(createResearchPDF(data,tracker.Constructor).getNumberOfPages(),3);assertFits(tracker.text);
  for(let page=1;page<=3;page++) {
    const text=tracker.text.filter(item=>item.page===page).map(item=>item.content).join('\n');
    assert.ok(text.includes(`Team ${page} may need`));
    assert.ok(text.indexOf(`Team ${page} may need`)<text.indexOf('WHEN IT STARTS'));
    assert.ok(text.includes(`Fictional development ${page}`));
  }
});
