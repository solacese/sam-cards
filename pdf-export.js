/* Three-page opportunity brief. jsPDF is vendored under its MIT license. */
(function(root) {
  'use strict';
  const content=typeof module!=='undefined'&&module.exports?require('./report-content.js'):root.ReportContent;
  const NAVY=[9,59,95],GREEN=[0,111,83],MUTED=[72,101,116],LINE=[205,222,221];
  const PALE=[[237,249,241],[239,246,251],[252,246,235]];
  function plain(value) {
    return String(value??'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—‑]/g,'-').replace(/\u00a0/g,' ').replace(/→/g,'to').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'').trim();
  }
  function createResearchPDF(report,JsPDF) {
    report=content.presentReport(report);
    const doc=new JsPDF({unit:'mm',format:'a4',compress:true});
    const margin=18,width=174;
    const researched=new Date(report.generated_at).toISOString().slice(0,10);
    let condensed=false;
    function font(size=10.5,bold=false,color=NAVY,family='helvetica') {
      doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);
    }
    function lines(text,w,size=10.5,bold=false) {font(size,bold);return doc.splitTextToSize(plain(text),w);}
    function clip(rows,count,w,size,bold=false) {
      if(rows.length<=count) return rows;
      condensed=true;
      const result=rows.slice(0,count);font(size,bold);
      let last=result[count-1]||'';
      while(last&&doc.getTextWidth(last+'...')>w) last=last.slice(0,-1);
      result[count-1]=last.trimEnd()+'...';return result;
    }
    function write(rows,x,y,size=10.5,bold=false,color=NAVY,leading=size*.43,family='helvetica') {
      font(size,bold,color,family);
      rows.forEach((row,index)=>doc.text(row,x,y+index*leading));
      return y+rows.length*leading;
    }
    function label(text,x,y) {font(8,true,GREEN);doc.text(plain(text).toUpperCase(),x,y);}
    function column(sections,x,top,w,bottom) {
      let size=10.5,blocks;
      for(const candidate of [10.5,10,9.5]) {
        size=candidate;
        blocks=sections.map(section=>({...section,rows:clip(lines(section.text,w,size),section.max||6,w,size)}));
        if(blocks.reduce((n,block)=>n+9+block.rows.length*size*.43,0)<=bottom-top) break;
      }
      const available=Math.max(blocks.length,Math.floor((bottom-top-blocks.length*9)/(size*.43)));
      while(blocks.reduce((n,block)=>n+block.rows.length,0)>available) {
        const longest=blocks.reduce((a,b)=>b.rows.length>a.rows.length?b:a);
        if(longest.rows.length<=1) break;
        longest.rows=clip(longest.rows,longest.rows.length-1,w,size);
      }
      let y=top;
      for(const block of blocks) {label(block.label,x,y);y=write(block.rows,x,y+5,size)+4;}
    }
    report.cases.forEach((item,index)=> {
      if(index) doc.addPage();
      condensed=false;
      doc.setFillColor(...PALE[index%3]);doc.rect(0,0,210,3,'F');
      font(12,true);doc.text('Solace',margin,16);font(9,false,MUTED);doc.text('AGENT MESH',margin+20,16);
      font(8,false,MUTED);doc.text(`OPPORTUNITY ${index+1} / ${report.cases.length}`,192,16,{align:'right'});
      doc.setDrawColor(...LINE);doc.setLineWidth(.3);doc.line(margin,22,192,22);
      font(10,true);doc.text(clip(lines(report.company,125,10,true),1,125,10,true)[0],margin,30);
      font(8,false,MUTED);doc.text(researched,192,30,{align:'right'});
      font(27,false,NAVY,'times');
      const title=clip(doc.splitTextToSize(plain(item.title),width),2,width,27);
      let y=write(title,margin,44,27,false,NAVY,10,'times')+3;
      if(item.intro) {
        y=write(clip(lines(item.intro,width,11),4,width,11),margin,y,11,false,NAVY,4.8)+3;
      } else {
        label(`Why now / ${item.news.date}`,margin,y);
        y=write(clip(lines(item.news.headline,width,10),2,width,10),margin,y+5,10,false,MUTED)+3;
      }
      const brief=[...(report.tailoring?.departments||[]),report.tailoring?.topic].filter(Boolean).join(' / ');
      if(brief) y=write(clip(lines(brief,width,9),2,width,9),margin,y,9,false,MUTED)+3;
      const values=item.fit?.outcomes?.length?item.fit.outcomes.map(outcome=>({name:outcome.name,text:outcome.impact})):[{name:'Reduce risk',text:item.risk},{name:'Protect or grow revenue',text:item.revenue}];
      if(values.length>2) condensed=true;
      const displayed=values.slice(0,2),gap=10,valueWidth=(width-16-gap*(displayed.length-1))/displayed.length;
      const valueRows=displayed.map(value=>({name:clip(lines(value.name,valueWidth,8,true),2,valueWidth,8,true),text:clip(lines(value.text,valueWidth,11),3,valueWidth,11)}));
      const valueHeight=Math.max(...valueRows.map(value=>value.name.length*3.5+value.text.length*4.8))+12;
      doc.setFillColor(...PALE[index%3]);doc.roundedRect(margin,y,width,valueHeight,3,3,'F');
      valueRows.forEach((value,i)=> {const x=margin+8+i*(valueWidth+gap);write(value.name.map(name=>name.toUpperCase()),x,y+7,8,true,GREEN,3.5);write(value.text,x,y+9+value.name.length*3.5,11,false,NAVY,4.8);});
      const top=y+valueHeight+12;
      const leftWidth=101,rightX=130,rightWidth=62;
      column([
        {label:'When it starts',text:item.trigger,max:4},
        {label:'What happens',text:item.action,max:4},
        {label:`${item.agents.length} focused agents`,text:item.agents.map(agent=>`${agent.name}: ${agent.role}`).join('\n'),max:8},
        {label:'Why Agent Mesh',text:item.why_mesh,max:4}
      ],margin,top,leftWidth,221);
      const systems=item.fit?.systems||[];
      column([
        {label:'Human approval',text:item.human,max:5},
        ...(systems.length?[{label:'Proposed system roles',text:systems.map(system=>`${system.name}: ${system.role}`).join('\n'),max:12}]:[]),
        {label:'How it improves',text:item.learning,max:6}
      ],rightX,top,rightWidth,221);
      doc.setDrawColor(...LINE);doc.line(margin,225,192,225);
      label('Measure in a pilot',margin,233);
      write(clip(lines(item.metric.replace(/^pilot:\s*/i,''),81,10),3,81,10),margin,239,10);
      label('Ask your organization',111,233);
      write(clip(lines(item.question,81,10),3,81,10),111,239,10);
      const assumptions=item.fit?.assumptions||'Proposed workflow. Confirm system access, integration work, business rules and approval controls with the organization.';
      label('Assumptions to validate',margin,259);
      write(clip(lines(assumptions,width,8.5),2,width,8.5),margin,264,8.5,false,MUTED,3.7);
      const sourceMap=new Map(report.sources.map(source=>[source.id,source]));
      if(item.intro) write(clip(lines(`${item.news.date} / ${item.news.headline}`,width,8),1,width,8),margin,274,8,false,MUTED);
      let linkX=margin;
      for(const id of item.news.source_ids) {
        const source=sourceMap.get(id);if(!source) continue;
        let host;try{const url=new URL(source.url);if(url.protocol!=='https:')continue;host=url.hostname.replace(/^www\./,'');}catch{continue;}
        font(8,false,GREEN);let text=`[${id}] ${host}`;
        const remaining=192-linkX;if(remaining<12){condensed=true;break;}
        text=clip(lines(text,remaining,8),1,remaining,8)[0];
        doc.text(text,linkX,278);const length=doc.getTextWidth(text);doc.link(linkX,274.5,length,5,{url:source.url});linkX+=length+6;
      }
      const capability=report.capability_sources?.[0];
      if(capability?.url?.startsWith('https://')) {font(8,false,GREEN);doc.text('Framework reference',margin,284);doc.link(margin,280.5,31,5,{url:capability.url});}
      font(7.5,false,MUTED);doc.text(condensed?'Condensed brief. Full workflow in the app.':'Proposed opportunity. Validate with your organization.',margin,291);
      doc.text(`${index+1} / ${report.cases.length}`,192,291,{align:'right'});
    });
    doc.setProperties({title:`Agent Mesh opportunities for ${plain(report.company)}`,subject:'Three sourced opportunity briefs, one case per page',creator:'SAM Cards',author:'Solace Agent Mesh'});
    return doc;
  }
  root.createResearchPDF=createResearchPDF;
  root.exportResearchPDF=function(report) {
    const doc=createResearchPDF(report,root.jspdf.jsPDF);
    const slug=report.company.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'company';
    doc.save(`Agent-Mesh-${slug}-${new Date(report.generated_at).toISOString().slice(0,10)}.pdf`);
  };
  if(typeof module!=='undefined'&&module.exports) module.exports={createResearchPDF};
})(typeof window!=='undefined'?window:globalThis);
