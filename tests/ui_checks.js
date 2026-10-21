/* Run with Playwright browser_run_code_unsafe(filename), or evaluate this function with a Playwright Page.
   API responses below are explicitly synthetic fixtures; live research is checked separately. */
async (page) => {
  let assertions=0;
  const check=(condition,message)=> { if (!condition) throw new Error(message); assertions++; };
  const equal=(actual,expected,message)=>check(JSON.stringify(actual)===JSON.stringify(expected),message);
  const requests=[];
  let failNext=false, release=null, held=null;
  let polls=0, jobBrief={}, jobFailure=false,lastReport=null;
  const jobId='b'.repeat(48);
  const fixture=criteria=>({company:'UI TEST FIXTURE',overview:'Synthetic report used only for browser regression checks.',generated_at:new Date().toISOString(),elapsed_seconds:1,cached:false,tailoring:criteria,sources:[{id:1,url:'https://news.example.org/test',title:'Synthetic test source'}],capability_sources:[],cases:[1,2,3].map(n=>({title:`Test opportunity ${n}`,news:{headline:'Synthetic news - not researched evidence',date:new Date().toISOString().slice(0,10),source_ids:[1]},risk:'Proposed risk benefit',revenue:'Proposed revenue benefit',trigger:'Missing supplier document event',action:'Review supplier evidence before approval',why_mesh:'Durable queues retain exception events.',agents:[{name:'Evidence',role:'Review documents'},{name:'Risk',role:'Escalate exceptions'}],human:'Finance approves the onboarding decision.',learning:'Evaluate outcomes and approve rule changes.',question:'Which evidence is required?',metric:'Incomplete supplier approvals',...(Object.keys(criteria).length?{fit:{departments:(criteria.departments||[]).map(name=>({name,role:'Reviews supplier onboarding evidence.'})),topic:criteria.topic?`Review ${criteria.topic} before approval.`:'',outcomes:(criteria.outcomes||[]).map(name=>({name,impact:'Detect missing supplier evidence before approval.'})),systems:(criteria.systems||[]).map(name=>({name,role:'Proposed evidence input; validate access and record mapping.'})),assumptions:'System use, supplier records and integrations are unverified.'}}:{})}))});
  await page.route('**/config.js*',route=>route.fulfill({contentType:'application/javascript',body:'window.SAM_CARDS_CONFIG={apiUrl:"/api/research"};'}));
  await page.route('**/api/research',async route=> {
    const data=route.request().postDataJSON();requests.push(data);
    if (held) await held;
    const fail=failNext;failNext=false;
    if(data.quality==='best' && !fail) {
      polls=0;jobBrief=data.tailoring||{};
      await route.fulfill({status:202,contentType:'application/json',body:JSON.stringify({job_id:jobId,status:'queued'})});return;
    }
    if(!fail)lastReport=fixture(data.tailoring||{});
    await route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{error:'Test service is busy. Try again.'}:lastReport)});
  });
  await page.route('**/api/research/*',async route=> {
    polls++;
    const status=jobFailure?502:polls===3?429:polls>=4?200:202;
    const data=jobFailure?{error:'Expert analysis failed. Try Quick.'}:status===200?{...fixture(jobBrief),quality:'best'}:{job_id:jobId,status:polls===1?'researching':'designing'};
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const reset=async()=> { await page.goto('http://127.0.0.1:8921/');await page.getByRole('textbox',{name:'Organization name',exact:true}).fill('Novo Nordisk');await page.getByRole('radio',{name:'Quick',exact:false}).check(); };
  const open=async()=> {if(!await page.locator('.tailor-panel').evaluate(el=>el.open))await page.locator('.tailor-panel > summary').click();};
  const promptFor=async index=>page.evaluate(({report,index})=>window.QuickBuild.buildPrompt(report,report.cases[index],index),{report:lastReport,index});
  const choose=async(key,names)=> {
    await page.locator(`[data-multi="${key}"] summary`).click();
    for(const name of names) await page.getByRole('checkbox',{name,exact:true}).check();
    await page.keyboard.press('Escape');
  };
  const custom=async(key,value)=> {
    await page.locator(`[data-multi="${key}"] summary`).click();
    await page.locator(`#${key}-custom`).fill(value);await page.locator(`#${key}-custom`).press('Enter');
    await page.keyboard.press('Escape');
  };
  const generate=async()=> { await page.getByRole('button',{name:'Find 3 cases'}).click();await page.locator('#research-status').waitFor({state:'hidden'}); };
  try {
    await page.setViewportSize({width:1280,height:900});
    await reset(); await generate();equal(requests.at(-1),{company:'Novo Nordisk'},'Company-only payload changed');
    check(!await page.locator('#criteria-summary').isVisible(),'Empty brief summary should be hidden');
    check(await page.locator('.case-card').count()===3,'Company-only cards missing');
    check(await page.getByRole('textbox',{name:'Organization name',exact:true}).getAttribute('placeholder')==='Enter an organization name','Organization input wording is inconsistent');
    const description=await page.locator('.case-description').first().innerText();
    check(description.includes('Review supplier evidence before approval')&&description.includes('Starts when: Missing supplier document event.')&&description.includes('Human review: Finance approves the onboarding decision.'),'The left-hand case explanation is incomplete');
    check(await page.locator('.case-flag').count()===3,'Case emoji markers missing');
    check(await page.locator('.case-flag').evaluateAll(elements=>elements.every(el=>[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(el.textContent)].length===1)),'A case has more than one emoji marker');
    check(await page.locator('.case-card').first().evaluate(el=>el.getBoundingClientRect().width>900),'Desktop cards are still narrow');
    check(await page.locator('.case-card').evaluateAll(elements=>elements.every((el,index)=>index===0||el.getBoundingClientRect().top>elements[index-1].getBoundingClientRect().bottom)),'Wide cards are not stacked');
    check(await page.locator('.prompt-preview,.quick-build-help').count()===0,'Redundant Quick Build content is still shown');
    await page.evaluate(()=> {window.__copiedPrompts=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copiedPrompts.push(text)}});});
    for(let index=0;index<3;index++) {
      const card=page.locator('.case-card').nth(index);
      await card.locator('.copy-prompt-button').click();
      const copied=await page.evaluate(()=>window.__copiedPrompts.at(-1));
      check(copied.includes(`"case_title": "Test opportunity ${index+1}"`),'Copy used the wrong case');
      equal(copied,await promptFor(index),'Copied prompt was truncated or changed');
    }
    await page.locator('.copy-prompt-button').first().focus();await page.keyboard.press('Enter');
    check(await page.evaluate(()=>window.__copiedPrompts.length)===4,'Keyboard copy failed');
    await page.evaluate(()=> {Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Test clipboard denial');}}});Object.defineProperty(document,'execCommand',{configurable:true,writable:true,value:()=>false});});
    await page.locator('.copy-prompt-button').first().click();
    check((await page.locator('.copy-feedback').first().innerText()).includes('Copy was blocked'),'Copy failure falsely reported success');
    check(await page.locator('#copy-prompt-dialog').isVisible(),'Manual-copy dialog did not open');
    check(await page.locator('#manual-prompt').evaluate(el=>document.activeElement===el&&el.selectionStart===0&&el.selectionEnd===el.value.length),'Full prompt was not selected for manual copy');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.evaluate(()=> {document.execCommand=()=>true;});await page.locator('.copy-prompt-button').first().click();
    check((await page.locator('.copy-feedback').first().innerText()).startsWith('Prompt copied'),'Legacy clipboard fallback failed');
    await page.evaluate(()=> {delete navigator.clipboard;delete document.execCommand;delete window.__copiedPrompts;});
    for(const [key,value] of Object.entries({departments:['Finance'],topic:'Supplier onboarding',outcomes:['Reduce costs'],systems:['Salesforce']})) {
      await reset();await open();
      if(key==='topic') await page.getByLabel('Topic',{exact:true}).fill(value);else await choose(key,value);
      await generate();equal(requests.at(-1).tailoring,{[key]:value},`${key} did not work independently`);
      check((await page.locator('#criteria-summary').innerText()).includes(Array.isArray(value)?value[0]:value),`${key} summary missing`);
      if(key==='outcomes') {
        check((await page.locator('.case-values').first().innerText()).includes('Reduce costs'),'Selected outcome is not the card value');
        check(!(await page.locator('.case-values').first().innerText()).includes('Grow or protect revenue'),'Cost brief forced into revenue card');
      }
    }
    await reset();await open();await choose('departments',['Finance','Procurement']);
    await page.getByLabel('Topic',{exact:true}).fill('Supplier onboarding');await choose('outcomes',['Reduce risk']);await choose('systems',['Salesforce','SharePoint']);
    held=new Promise(resolve=>release=resolve);
    await page.getByRole('button',{name:'Find 3 cases'}).click();
    check(await page.locator('#topic').isDisabled(),'Criteria remain editable while generation is pending');
    release();held=null;await page.locator('#research-status').waitFor({state:'hidden'});
    const brief={departments:['Finance','Procurement'],outcomes:['Reduce risk'],systems:['Salesforce','SharePoint'],topic:'Supplier onboarding'};
    equal(requests.at(-1).tailoring,brief,'Combined example not passed as structured context');
    check((await page.locator('#criteria-summary').innerText()).includes('SharePoint'),'Systems missing in summary');
    await page.locator('.case-details > summary').first().click();
    check((await page.locator('.case-fit').first().innerText()).includes('Procurement'),'Per-case department fit missing');
    check(await page.locator('#topic').inputValue()==='Supplier onboarding','Topic was cleared after generation');
    check(await page.locator('[data-multi="departments"] .selection-chips button').count()===2,'Selections were cleared after generation');
    check((await page.locator('.system-role-list').first().innerText()).includes('SharePoint'),'Proposed system role missing');
    check((await page.locator('.case-fit').first().innerText()).includes('Assumptions to validate'),'Assumptions not labelled');
    const complete=JSON.parse((await promptFor(0)).split('\nCASE_CONTEXT\n')[1].split('\nEND_CASE_CONTEXT\n')[0]);
    equal(complete.user_brief,brief,'Quick Build lost the selected criteria');
    check(complete.fit_to_brief.systems.some(system=>system.name==='SharePoint'&&system.role.includes('validate access')),'Quick Build lost proposed system roles');
    await page.setViewportSize({width:1366,height:768});await page.locator('.case-details > summary').first().click();
    check(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'Compact three-case overview does not fit one laptop screen');
    check(await page.locator('.case-card').last().evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'Third case is below the fold');
    await open();await page.getByLabel('Topic',{exact:true}).fill('Supplier renewals');await generate();
    check(requests.at(-1).tailoring.topic==='Supplier renewals','Refinement did not regenerate with new criteria');
    failNext=true;await generate();
    check((await page.locator('#error-message').innerText()).includes('busy'),'Research error not shown');
    check(await page.locator('#topic').inputValue()==='Supplier renewals','Error cleared the brief');
    check(!await page.locator('#topic').isDisabled(),'Error did not unlock refinement');
    await reset();await open();await custom('departments','Vendor Assurance');await custom('outcomes','Reduce supplier fraud');await custom('systems','Custom ERP');
    await page.locator('[data-multi="systems"] summary').click();await page.locator('#systems-custom').fill('Pending system');
    await generate();
    equal(requests.at(-1).tailoring,{departments:['Vendor Assurance'],outcomes:['Reduce supplier fraud'],systems:['Custom ERP','Pending system']},'Custom or uncommitted entry lost');
    await open();
    await page.getByRole('button',{name:'Remove Vendor Assurance from target department'}).click();
    await page.getByRole('button',{name:'Remove Reduce supplier fraud from desired business outcome'}).click();
    await page.getByRole('button',{name:'Remove Custom ERP from systems involved'}).click();
    await page.getByRole('button',{name:'Remove Pending system from systems involved'}).click();
    await generate();equal(requests.at(-1),{company:'Novo Nordisk'},'Clearing criteria did not restore company-only request');
    await reset();await page.locator('.tailor-panel > summary').focus();await page.keyboard.press('Space');
    await page.locator('[data-multi="departments"] summary').focus();await page.keyboard.press('Enter');
    await page.getByRole('checkbox',{name:'Finance',exact:true}).focus();await page.keyboard.press('Space');await page.keyboard.press('Escape');
    check(await page.locator('[data-multi="departments"] summary').evaluate(el=>document.activeElement===el),'Escape did not return keyboard focus');
    check(await page.getByRole('button',{name:'Remove Finance from target department'}).count()===1,'Keyboard selection failed');
    await custom('systems','<img src=x onerror=alert(1)>');await generate();
    check(await page.locator('#criteria-summary img').count()===0,'Custom text was interpreted as markup');
    check(await page.locator('.quick-build img').count()===0,'Prompt preview interpreted custom text as markup');
    check((await promptFor(0)).includes('<img src=x onerror=alert(1)>'),'Custom context was lost from the copied brief');
    await page.setViewportSize({width:375,height:812});
    await open();
    await page.locator('[data-multi="outcomes"] summary').click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Mobile page overflows');
    await page.getByRole('checkbox',{name:'Improve experience',exact:true}).check();await page.keyboard.press('Escape');
    await generate();check(requests.at(-1).tailoring.outcomes.includes('Improve experience'),'Mobile multi-select failed');
    await page.evaluate(()=> {Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Test clipboard denial');}}});Object.defineProperty(document,'execCommand',{configurable:true,writable:true,value:()=>false});});
    await page.locator('.copy-prompt-button').first().click();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Mobile manual-copy dialog overflows');
    check((await page.locator('#manual-prompt').inputValue()).includes('<img src=x onerror=alert(1)>'),'Manual copy lost literal custom context');
    check(await page.locator('#copy-prompt-dialog img').count()===0,'Manual copy treated context as HTML');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.evaluate(()=> {delete navigator.clipboard;delete document.execCommand;});
    await page.setViewportSize({width:1280,height:900});await reset();
    await page.getByRole('radio',{name:'Best quality',exact:false}).check();
    await page.getByRole('button',{name:'Find 3 cases'}).click();
    check(await page.getByRole('radio',{name:'Quick',exact:false}).isDisabled(),'Research depth remained editable during generation');
    await page.locator('#status-text').getByText('Designing and selecting your three strongest cases…',{exact:true}).waitFor();
    check(await page.locator('#research-status').isVisible(),'Expert progress was not shown');
    await page.locator('#research-status').waitFor({state:'hidden',timeout:25000});
    equal(requests.at(-1),{company:'Novo Nordisk',quality:'best'},'Best-quality request was not sent');
    check(polls===4,'Polling did not recover after throttling');
    check((await page.locator('#results-date').innerText()).includes('Expert analysis'),'Expert report was not labelled');
    check(!await page.getByRole('radio',{name:'Quick',exact:false}).isDisabled(),'Depth remained locked after completion');
    await open();await page.getByLabel('Topic',{exact:true}).fill('Supplier onboarding');jobFailure=true;
    await generate();
    check((await page.locator('#error-message').innerText()).includes('Expert analysis failed'),'Expert failure was not shown');
    check(await page.getByLabel('Topic',{exact:true}).inputValue()==='Supplier onboarding','Expert failure cleared the brief');
    check(!await page.locator('#results').isVisible(),'Expert failure returned an unlabelled lower-quality report');
    return {assertions,requests:requests.length,result:'passed'};
  } finally {
    await page.evaluate(()=> {delete navigator.clipboard;delete document.execCommand;delete window.__copiedPrompts;});
    if(release) release();await page.unroute('**/config.js*');await page.unroute('**/api/research');await page.unroute('**/api/research/*');
  }
}
