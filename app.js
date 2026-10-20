const form = document.querySelector('#research-form');
const companyInput = document.querySelector('#company');
const researchButton = document.querySelector('#research-button');
const status = document.querySelector('#research-status');
const timer = document.querySelector('#timer');
const errorMessage = document.querySelector('#error-message');
const results = document.querySelector('#results');
const exportButton = document.querySelector('#export-button');
let currentReport = null;
let busy = false;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function displayDate(value) {
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value));
}

function sourceLink(source, label) {
  if (!source) return '';
  try {
    const url = new URL(source.url);
    if (url.protocol !== 'https:') return '';
    return `<a href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label || source.title)}</a>`;
  } catch { return ''; }
}

function section(title, text) {
  return `<div class="case-section"><h4>${title}</h4><p>${escapeHTML(text)}</p></div>`;
}

function renderCriteria(criteria) {
  const summary = document.querySelector('#criteria-summary');
  const entries = window.Tailoring.summaryEntries(criteria);
  summary.hidden = !entries.length;
  summary.innerHTML = entries.length ? `<h3>Tailored to your brief</h3><dl>${entries.map(([label,value])=>`<div><dt>${escapeHTML(label)}:</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl><p>User-provided context. System use, access and integrations need validation.</p>` : '';
}

function fitSummary(fit) {
  if (!fit) return '';
  return `<div class="case-fit"><h4>Fit to your brief · proposed</h4>${fit.departments.map(item=>`<p><strong>${escapeHTML(item.name)}:</strong> ${escapeHTML(item.role)}</p>`).join('')}${fit.topic ? `<p><strong>Topic:</strong> ${escapeHTML(fit.topic)}</p>` : ''}<p><strong>Assumptions to validate:</strong> ${escapeHTML(fit.assumptions)}</p></div>`;
}

function businessValues(item) {
  const values = item.fit?.outcomes.length ? item.fit.outcomes.map(outcome=>[outcome.name,outcome.impact]) : [['Reduce risk',item.risk],['Grow or protect revenue',item.revenue]];
  return `<div class="case-values">${values.map(([label,text])=>`<div class="value-item"><h4>${escapeHTML(label)}</h4><p>${escapeHTML(text)}</p></div>`).join('')}</div>`;
}

function renderReport(report) {
  const sourceMap = new Map(report.sources.map(item => [item.id,item]));
  document.querySelector('#results-title').textContent = `3 opportunities for ${report.company}`;
  document.querySelector('#results-date').textContent = `Researched ${displayDate(report.generated_at)} · ${report.cached ? 'Recent saved research' : `${report.elapsed_seconds}s research`} · Perplexity`;
  document.querySelector('#results-overview').textContent = report.overview;
  renderCriteria(report.tailoring);
  document.querySelector('#case-grid').innerHTML = report.cases.map((item,index) => `
    <article class="case-card" aria-labelledby="case-title-${index+1}">
      <header class="case-head"><span class="case-number">0${index+1}</span><h3 id="case-title-${index+1}">${escapeHTML(item.title)}</h3><p class="case-news">${sourceLink(sourceMap.get(item.news.source_ids[0]),item.news.headline)}<time datetime="${escapeHTML(item.news.date)}">${displayDate(item.news.date)}</time></p></header>
      ${fitSummary(item.fit)}
      ${businessValues(item)}
      ${section('What they do',item.action)}
      ${section('Why Agent Mesh fits',item.why_mesh)}
      <details class="case-details"><summary>${item.agents.length} agents · approval & improvement</summary>
      ${section('When it starts',item.trigger)}
      <div class="case-section"><h4>${item.agents.length} focused agents</h4><ul class="agent-list">${item.agents.map(agent=>`<li><strong>${escapeHTML(agent.name)}</strong><span>${escapeHTML(agent.role)}</span></li>`).join('')}</ul></div>
      ${item.fit?.systems.length ? `<div class="case-section"><h4>Proposed system roles</h4><p>User-provided systems; use and integrations are unverified.</p><ul class="system-role-list">${item.fit.systems.map(system=>`<li><strong>${escapeHTML(system.name)}:</strong> ${escapeHTML(system.role)}</li>`).join('')}</ul></div>` : ''}
      ${section('Human approval',item.human)}
      ${section('How it improves',item.learning)}
      <div class="case-question"><h4>Ask the customer</h4><p>${escapeHTML(item.question)}</p></div>
      <p class="case-metric"><strong>Measure in a pilot:</strong> ${escapeHTML(item.metric)}</p></details>
    </article>`).join('');
  document.querySelector('#sources-list').innerHTML = report.sources.map(source=>`<li value="${Number(source.id)}">${sourceLink(source)}${source.date ? ` · ${displayDate(source.date)}` : ''}</li>`).join('');
  results.hidden = false;
  document.body.classList.add('has-results');
  document.title = `${report.company} | Agent Mesh opportunities`;
  document.querySelector('#results-title').focus({preventScroll:true});
  results.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

form.addEventListener('submit',async event=> {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const company = companyInput.value.trim();
  if (!company) { companyInput.focus(); return; }
  const tailoring = window.Tailoring.collect();
  if (!tailoring) return;
  const request = {company};
  if (Object.keys(tailoring).length) request.tailoring = tailoring;
  const endpoint = window.SAM_CARDS_CONFIG?.apiUrl;
  if (!endpoint) { errorMessage.textContent = 'Research is being configured. Please try again shortly.'; errorMessage.hidden=false; return; }
  busy = true;
  currentReport = null;
  results.hidden = true;
  document.body.classList.remove('has-results');
  errorMessage.hidden = true;
  status.hidden = false;
  researchButton.disabled = true;
  companyInput.readOnly = true;
  window.Tailoring.setBusy(true);
  exportButton.disabled = true;
  timer.textContent='20s';
  const controller = new AbortController();
  const started = Date.now();
  const ticker = setInterval(()=>{timer.textContent=`${Math.max(0,20-Math.floor((Date.now()-started)/1000))}s`;},250);
  const timeout = setTimeout(()=>controller.abort(),20000);
  try {
    const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:controller.signal});
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || 'Research is temporarily unavailable. Please try again.');
    if (!Array.isArray(report.cases) || report.cases.length!==3 || !Array.isArray(report.sources) || report.cases.some(item=>!Array.isArray(item.agents)||item.agents.length<2||item.agents.length>3)) {
      throw new Error('The report was incomplete. Please try again.');
    }
    if (request.tailoring && (!report.tailoring || report.cases.some(item=>!item.fit))) {
      throw new Error('The tailored report was incomplete. Please try again.');
    }
    currentReport = report;
    renderReport(report);
    exportButton.disabled = false;
  } catch(error) {
    errorMessage.textContent = error.name==='AbortError' ? 'Research reached the 20-second limit. Please try again.' : error.message==='Failed to fetch' ? 'Could not reach the research service. Check your connection and try again.' : error.message;
    errorMessage.hidden = false;
  } finally {
    clearInterval(ticker); clearTimeout(timeout);
    status.hidden = true;
    researchButton.disabled = false;
    companyInput.readOnly = false;
    window.Tailoring.setBusy(false);
    busy = false;
  }
});

exportButton.addEventListener('click',()=> {
  if (!currentReport) return;
  try { window.exportResearchPDF(currentReport); }
  catch { errorMessage.textContent='PDF export could not be completed. Please try again.'; errorMessage.hidden=false; }
});

document.querySelector('.skip-link').addEventListener('click',event=> {event.preventDefault();document.querySelector('#main-content').focus();});
