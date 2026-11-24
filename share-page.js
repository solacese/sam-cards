/* Persistent, unlisted opportunity pages. No report contents are accepted from the browser. */
(function(root) {
  'use strict';
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{48}$/.test(value);
  function reportsEndpoint(endpoint) {
    if(typeof endpoint!=='string'||! /\/research\/?$/.test(endpoint))throw new Error('Page sharing is being configured. Please try again shortly.');
    return endpoint.replace(/\/research\/?$/,'/reports');
  }
  function pageLink(location,id,organization) {
    if(!validId(id))throw new Error('The page link could not be created. Please try again.');
    const url=new URL(location);url.search='';url.hash='';
    const slug=String(organization).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
    if(slug)url.searchParams.set('organization',slug);
    url.searchParams.set('report',id);return url.href;
  }
  function shareRequest(report) {
    const data={company:report.requested_company||report.company,quality:report.quality==='best'?'best':'quick',generated_at:report.generated_at};
    if(report.tailoring&&Object.keys(report.tailoring).length)data.tailoring=report.tailoring;
    return data;
  }
  async function copyText(text,{title='Copy prompt',label='Complete Quick Builder prompt',link=false}={}) {
    try {
      if(!root.navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await root.navigator.clipboard.writeText(text);return true;
    } catch {
      const dialog=root.document.querySelector('#copy-prompt-dialog'),textarea=root.document.querySelector('#manual-prompt');
      root.document.querySelector('#copy-dialog-title').textContent=title;
      root.document.querySelector('label[for="manual-prompt"]').textContent=label;
      dialog.classList.toggle('copy-link',link);textarea.value=text;
      dialog.showModal();textarea.focus();textarea.select();
      let copied=false;try{copied=root.document.execCommand('copy');}catch{ /* Selected text remains available. */ }
      if(copied)dialog.close();return copied;
    }
  }
  function setup({onLoad}) {
    const doc=root.document,button=doc.querySelector('#share-button'),feedback=doc.querySelector('#share-feedback');
    let report=null,sharedId=null,sharing=false,controller=null;
    const update=()=>{button.disabled=!report||sharing;};
    function setReport(value) {
      if(value!==report){controller?.abort();sharedId=null;button.textContent='Copy page link';feedback.textContent='';}
      report=value;update();
    }
    function notify(message,error=false) {
      feedback.textContent=message;feedback.classList.toggle('sr-only',!error);feedback.classList.toggle('error-message',error);
    }
    button.addEventListener('click',async()=> {
      if(!report||sharing)return;
      const target=report;sharing=true;update();button.textContent='Creating link…';notify('');
      try {
        if(!sharedId) {
          controller=new AbortController();
          const timeout=setTimeout(()=>controller.abort(),15000);
          try {
            const response=await root.fetch(reportsEndpoint(root.SAM_CARDS_CONFIG?.apiUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(shareRequest(target)),signal:controller.signal});
            const data=await response.json();
            if(!response.ok)throw new Error(data.error||'The page link could not be created. Please try again.');
            if(!validId(data.report_id))throw new Error('The page link could not be created. Please try again.');
            if(report!==target)return;
            sharedId=data.report_id;
          }finally{clearTimeout(timeout);controller=null;}
        }
        const copied=await copyText(pageLink(root.location.href,sharedId,target.company),{title:'Copy page link',label:'Opportunity page link',link:true});
        button.textContent=copied?'Link copied':'Copy page link';
        notify(copied?'Page link copied. Anyone with the link can view these results.':'Copy was blocked. The page link is selected in the dialog.');
      } catch(error) {
        if(report!==target)return;
        button.textContent='Copy page link';
        notify(error.name==='AbortError'?'Creating the page link timed out. Please try again.':error.message==='Failed to fetch'?'Could not reach the sharing service. Please try again.':error.message,true);
      } finally {sharing=false;update();}
    });
    const params=new URL(root.location.href).searchParams;
    if(params.has('report')) {
      const id=params.get('report'),message=doc.querySelector('#shared-message');
      doc.body.classList.add('shared-view');doc.querySelector('.prompt-screen').hidden=true;
      doc.querySelector('#shared-home').hidden=false;message.hidden=false;message.textContent='Opening opportunity page…';
      const robots=doc.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';doc.head.append(robots);
      (async()=> {
        const loader=new AbortController(),timeout=setTimeout(()=>loader.abort(),15000);
        try {
          if(!validId(id))throw new Error('This opportunity page could not be found.');
          const response=await root.fetch(`${reportsEndpoint(root.SAM_CARDS_CONFIG?.apiUrl)}/${id}`,{signal:loader.signal});
          const data=await response.json();
          if(!response.ok)throw new Error(data.error||'This opportunity page could not be opened.');
          if(data.report_id!==id||!data.report||!Array.isArray(data.report.cases)||data.report.cases.length!==3||!Array.isArray(data.report.sources))throw new Error('This opportunity page is incomplete.');
          onLoad(data.report);sharedId=id;message.hidden=true;
        } catch(error) {
          message.textContent=error.name==='AbortError'?'Opening this page timed out. Please reload to try again.':error.message==='Failed to fetch'?'Could not reach the sharing service. Please reload to try again.':error.message;
          message.classList.add('error-message');
        } finally {clearTimeout(timeout);}
      })();
    }
    update();return {setReport};
  }
  const api={validId,reportsEndpoint,pageLink,shareRequest,copyText,setup};
  root.ReportSharing=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
