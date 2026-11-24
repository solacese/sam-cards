/* Synthetic browser regression coverage for publishing and opening opportunity pages. */
async(page)=> {
  let assertions=0,researchCalls=0,shareCalls=0,readCalls=0,failShare=false;
  const check=(condition,message)=>{if(!condition)throw new Error(message);assertions++;};
  const id='c'.repeat(48),criteria={departments:['Finance'],topic:'Supplier onboarding',outcomes:['Reduce risk'],systems:['SharePoint']};
  const report={company:'Synthetic Organization',requested_company:'Entered Organization',quality:'best',generated_at:new Date().toISOString(),tailoring:criteria,sources:[],capability_sources:[],context_note:'Limited public information. These are proposed workflows to validate with your organization.',cases:[1,2,3].map(n=>({title:`Synthetic case ${n}`,intro:`Reviewers in team ${n} may need several documents before making a decision. Missing paperwork can delay their work. This proposed check could help them spot gaps before proceeding.`,news:{headline:'Proposed workflow to validate',date:'',source_ids:[],basis:'hypothesis'},trigger:'A required document remains missing before approval.',action:'Request a human review of missing documents.',why_mesh:'Configured durable queues retain document signals during outages.',agents:[{name:'Evidence',role:'Compare required documents.'},{name:'Review',role:'Route exceptions for approval.'}],human:'Finance approves exceptions.',learning:'Evaluate outcomes offline and approve rule changes.',risk:'Missing evidence.',revenue:'Indirect; unestablished.',metric:'Time to resolve missing evidence.',question:'Which evidence is required?',fit:{departments:[{name:'Finance',role:'Review supplier evidence.'}],topic:'Supplier onboarding',outcomes:[{name:'Reduce risk',impact:'Find missing supplier evidence.'}],systems:[{name:'SharePoint',role:'Proposed evidence source; access unconfirmed.'}],assumptions:'System use, records and integrations are unverified.'}}))};
  let published;
  await page.route('**/config.js*',route=>route.fulfill({contentType:'application/javascript',body:'window.SAM_CARDS_CONFIG={apiUrl:"/api/research"};'}));
  await page.route('**/api/research',async route=>{researchCalls++;await route.fulfill({contentType:'application/json',body:JSON.stringify(report)});});
  await page.route('**/api/reports',async route=> {
    shareCalls++;published=route.request().postDataJSON();
    await route.fulfill({status:failShare?503:201,contentType:'application/json',body:JSON.stringify(failShare?{error:'Sharing is temporarily unavailable.'}:{report_id:id})});
  });
  await page.route('**/api/reports/*',async route=> {
    readCalls++;const found=route.request().url().endsWith('/'+id);
    await route.fulfill({status:found?200:404,contentType:'application/json',body:JSON.stringify(found?{report_id:id,report}:{error:'This opportunity page could not be found.'})});
  });
  const clipboard=()=>page.evaluate(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied.push(text)}});});
  try {
    await page.setViewportSize({width:1366,height:768});await page.goto('http://127.0.0.1:8921/');
    await page.getByRole('textbox',{name:'Organization name',exact:true}).fill('Entered Organization');
    await page.getByRole('radio',{name:'Quick',exact:false}).check();await page.getByRole('button',{name:'Find 3 cases'}).click();
    await page.locator('#research-status').waitFor({state:'hidden'});await clipboard();
    const share=page.locator('#share-button');await share.click();
    await page.waitForFunction(()=>window.__copied.length===1);
    const link=await page.evaluate(()=>window.__copied[0]);
    check(new URL(link).searchParams.get('report')===id,'Copied link has no valid report ID');
    check(new URL(link).searchParams.get('organization')==='synthetic-organization','Organization slug missing');
    check(published.company==='Entered Organization'&&published.quality==='best','Wrong report identity was published');
    check(JSON.stringify(published.tailoring)===JSON.stringify(criteria),'Share lost the brief');
    check(!published.cases&&!published.sources,'Browser uploaded arbitrary report contents');
    check(shareCalls===1&&researchCalls===1,'Sharing regenerated research');
    await share.click();check(shareCalls===1,'Copying twice created a second page');
    await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});document.execCommand=()=>false;});
    await share.click();
    check(await page.locator('#copy-prompt-dialog').isVisible(),'Manual link copy did not open');
    check(await page.locator('#manual-prompt').inputValue()===link,'Manual copy lost the exact page URL');
    check(await page.getByLabel('Opportunity page link',{exact:true}).count()===1,'Manual link copy is not labelled');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Manual link dialog overflows');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.locator('.copy-prompt-button').first().click();
    check(await page.getByLabel('Complete Quick Builder prompt',{exact:true}).count()===1,'Prompt label was not restored');
    check((await page.locator('#manual-prompt').inputValue()).includes('CASE_CONTEXT'),'Prompt copy broke after link copy');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.goto(link);await page.locator('#results').waitFor({state:'visible'});
    check(!await page.locator('.prompt-screen').isVisible(),'Shared page exposes the generator form');
    check(await page.locator('.case-card').count()===3,'Shared page lost cases');
    check((await page.locator('#criteria-summary').innerText()).includes('Supplier onboarding'),'Shared page lost context');
    check((await page.title()).includes('Synthetic Organization'),'Shared page has no organization title');
    check(await page.locator('meta[name="robots"]').getAttribute('content')==='noindex, nofollow','Shared page is not marked unlisted');
    check(await page.locator('#shared-home').isVisible(),'Shared page has no return path');
    check(readCalls===1&&researchCalls===1,'Opening a page started research');
    check(!await page.locator('#export-button').isDisabled(),'Shared PDF export is disabled');
    await clipboard();await page.locator('#share-button').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.__copied.length===1);
    check(shareCalls===1,'Recipient copy created another snapshot');
    check(await page.evaluate(()=>window.__copied[0])===link,'Recipient copied a different URL');
    await page.locator('.copy-prompt-button').nth(2).click();
    check((await page.evaluate(()=>window.__copied.at(-1))).includes('Synthetic case 3'),'Recipient cannot copy the correct Quick Build prompt');
    await page.reload();await page.locator('#results').waitFor({state:'visible'});
    check(readCalls===2&&researchCalls===1,'Reload regenerated or lost shared results');
    await page.setViewportSize({width:375,height:812});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Shared page overflows mobile');
    check(await page.locator('.case-card').count()===3,'Mobile shared page lost cases');
    await page.goto('http://127.0.0.1:8921/?report='+'d'.repeat(48));await page.getByText('This opportunity page could not be found.',{exact:true}).waitFor();
    check(!await page.locator('#results').isVisible(),'Missing link showed stale results');
    check(!await page.locator('.prompt-screen').isVisible(),'Missing link silently changed into a generator');
    const readsBefore=readCalls;await page.goto('http://127.0.0.1:8921/?report=bad');await page.getByText('This opportunity page could not be found.',{exact:true}).waitFor();
    check(readCalls===readsBefore,'Malformed report ID reached the service');
    await page.goto('http://127.0.0.1:8921/');await page.getByRole('textbox',{name:'Organization name',exact:true}).fill('Entered Organization');
    await page.getByRole('radio',{name:'Quick',exact:false}).check();await page.getByRole('button',{name:'Find 3 cases'}).click();await page.locator('#results').waitFor({state:'visible'});
    failShare=true;await page.locator('#share-button').click();await page.getByText('Sharing is temporarily unavailable.',{exact:true}).waitFor();
    check(await page.locator('#share-feedback').isVisible(),'Share error is not visible');
    check(!await page.locator('#share-button').isDisabled(),'Sharing cannot be retried');
    check(await page.locator('.case-card').count()===3,'Share failure removed results');
    return {assertions,researchCalls,shareCalls,readCalls,result:'passed'};
  }finally{
    await page.unroute('**/config.js*');await page.unroute('**/api/research');await page.unroute('**/api/reports');await page.unroute('**/api/reports/*');
  }
}
