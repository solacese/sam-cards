/* Organization wording for generated proposals; cited evidence and names stay intact. */
(function(root) {
  'use strict';
  const aliases=new Map([
    ['customer service','Service & support'],
    ['improve customer experience','Improve experience']
  ]);
  function optionLabel(value) {return aliases.get(String(value).toLowerCase())||value;}
  function organizationText(value,organization='') {
    if(typeof value!=='string') return value;
    const replace=text=>text.replace(/\b(customers?|company|companies)\b/gi,word=> {
      const next=/^(customers|companies)$/i.test(word)?'organizations':'organization';
      return word===word.toUpperCase()?next.toUpperCase():/^[A-Z]/.test(word)?next[0].toUpperCase()+next.slice(1):next;
    }).replace(/\b([Aa]) organization\b/g,(_,a)=>a==='A'?'An organization':'an organization');
    // Organization names are data, even when a legal name contains "Customer" or "Company".
    return organization?value.split(organization).map(replace).join(organization):replace(value);
  }
  function brief(value={}) {
    return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,Array.isArray(entry)?entry.map(optionLabel):entry]));
  }
  function presentCase(item,organization='') {
    const result={...item};
    for(const key of ['title','intro','trigger','action','why_mesh','human','learning','risk','revenue','metric','question']) {
      if(typeof item[key]==='string')result[key]=organizationText(item[key],organization);
    }
    result.agents=item.agents.map(agent=>({name:organizationText(agent.name,organization),role:organizationText(agent.role,organization)}));
    if(item.fit) {
      result.fit={...item.fit,topic:organizationText(item.fit.topic,organization),assumptions:organizationText(item.fit.assumptions,organization)};
      for(const [key,field]of[['departments','role'],['outcomes','impact'],['systems','role']]) {
        if(Array.isArray(item.fit[key]))result.fit[key]=item.fit[key].map(entry=>({...entry,name:optionLabel(entry.name),[field]:organizationText(entry[field],organization)}));
      }
    }
    return result;
  }
  function presentReport(report) {
    return {...report,cases:report.cases.map(item=>presentCase(item,report.company)),...(report.tailoring?{tailoring:brief(report.tailoring)}:{})};
  }
  function sentence(value) {const text=String(value||'').trim();return text&&!/[.!?]$/.test(text)?text+'.':text;}
  function explanation(item) {
    return [{label:'',text:sentence(item.action)},{label:'Starts when',text:sentence(item.trigger)},{label:'Human review',text:sentence(String(item.human||'').split(';')[0])}];
  }
  root.ReportContent={organizationText,optionLabel,presentCase,presentReport,explanation};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ReportContent;
})(typeof window!=='undefined'?window:globalThis);
