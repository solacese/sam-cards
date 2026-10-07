/* jsPDF is vendored at 4.2.1 under its MIT license. No result leaves the browser. */
(function(root) {
  'use strict';
  function plain(value) {
    return String(value).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\u00a0/g,' ').replace(/→/g,'->').replace(/\s+$/,'');
  }
  function createResearchPDF(report, JsPDF) {
    const doc = new JsPDF({unit:'mm',format:'a4',compress:true});
    const margin = 18, width = 174, bottom = 272;
    let y = 0;
    const navy = [16,42,60], green = [0,84,62];
    const date = new Date(report.generated_at).toISOString().slice(0,10);
    function header() {
      doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text('SOLACE  |  Agent Mesh',margin,17);
      doc.setFont('helvetica','normal'); doc.setFontSize(9);
      doc.text(`${plain(report.company)}  |  Researched ${date}`,margin,24);
      doc.setDrawColor(86,113,104); doc.line(margin,28,192,28); y=38;
    }
    function nextPage() { doc.addPage(); header(); }
    function paragraph(text,size=11,bold=false) {
      doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(size); doc.setTextColor(...navy);
      const lines=doc.splitTextToSize(plain(text),width);
      for (const line of lines) {
        if (y>bottom-8) nextPage();
        doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(size); doc.text(line,margin,y); y+=size*.43;
      }
      y+=3;
    }
    function section(label,text) {
      doc.setFont('helvetica','normal');doc.setFontSize(11);
      const lines=doc.splitTextToSize(plain(text),width);
      if (y+7+lines.length*4.73>bottom) nextPage();
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...green);doc.text(label.toUpperCase(),margin,y);y+=5;
      paragraph(text);
    }
    report.cases.forEach((item,index)=> {
      if (index>0) doc.addPage();
      header();
      paragraph(`${index+1}. ${item.title}`,17,true);
      paragraph(`${item.news.date} - ${item.news.headline}`,10);
      paragraph(`News sources: ${item.news.source_ids.map(id=>`[${id}]`).join(', ')}`,9);
      section('Reduce risk',item.risk);
      section('Grow or protect revenue',item.revenue);
      section('When it starts',item.trigger);
      section(`${item.agents.length} focused agents`,item.agents.map(agent=>`${agent.name}: ${agent.role}`).join('\n'));
      section('What they do',item.action);
      section('Why Agent Mesh fits',item.why_mesh);
      section('Human approval',item.human);
      section('How it improves',item.learning);
      section('Measure in a pilot',item.metric);
      section('Ask the customer',item.question);
    });
    nextPage(); paragraph('News and capability sources',17,true);
    paragraph(report.overview,11);
    report.sources.forEach(source=> {
      if (y>bottom-30) nextPage();
      paragraph(`[${source.id}] ${source.title}${source.date?' - '+source.date:''}`,10,true);
      const lines=doc.splitTextToSize(plain(source.url),width);
      const top=y-3;
      paragraph(source.url,9);
      doc.link(margin,top,width,lines.length*3.9+3,{url:source.url});
    });
    for (const source of report.capability_sources) {
      paragraph(source.title,10,true);
      const top=y-3;paragraph(source.url,9);doc.link(margin,top,width,y-top,{url:source.url});
    }
    section('Read this as a proposal','These are AI-generated opportunities based on public news, not verified customer workflows or guaranteed results. Validate integrations, controls and business value. Outcome feedback, evaluation and human-approved updates implement improvement; agents do not rewrite themselves. LangGraph and Azure can support these patterns with additional event and integration services.');
    const count=doc.getNumberOfPages();
    for(let page=1;page<=count;page++) {
      doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...navy);
      doc.text('Proposed opportunity - validate with the customer',margin,286);
      doc.text(`${page} / ${count}`,192,286,{align:'right'});
    }
    doc.setProperties({title:`Agent Mesh opportunities for ${plain(report.company)}`,subject:'Three sourced, event-triggered business opportunities',creator:'SAM Cards',author:'Solace Agent Mesh research tool'});
    return doc;
  }
  root.createResearchPDF = createResearchPDF;
  root.exportResearchPDF = function(report) {
    const doc=createResearchPDF(report,root.jspdf.jsPDF);
    const slug=report.company.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'company';
    doc.save(`Agent-Mesh-${slug}-${new Date(report.generated_at).toISOString().slice(0,10)}.pdf`);
  };
  if(typeof module!=='undefined'&&module.exports) module.exports={createResearchPDF};
})(typeof window!=='undefined'?window:globalThis);
