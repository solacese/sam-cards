const cases = [
  {industry:'finance', industryLabel:'Financial services', title:'Trade break prevention', summary:'Catch a missing or mismatched confirmation before it becomes a settlement break.', pattern:'A product is booked across several systems, but one confirmation is missing or mismatched after the agreed window.', decision:'Classify the break and its likely cause with a probability and supporting evidence.', action:'Reconcile simple classes or route a complete evidence pack to the right desk.', gate:'Approve before act', owner:'Operations desk', value:'Compress evidence assembly from 30–60 minutes to a few minutes; reduce penalties and leakage.'},
  {industry:'finance', industryLabel:'Financial services', title:'Market move with context', summary:'Turn a price move, news event and order-flow shift into one decision-ready brief.', pattern:'A market moves beyond a defined band while a news or calendar event and client flow change occur.', decision:'Classify the move as macro-driven, flow-driven or noise.', action:'Deliver a context pack and a pre-hedge proposal to the desk.', gate:'Approve before act', owner:'Trading desk', value:'Give traders back 5–10 minutes per material move and help them react with context.'},
  {industry:'finance', industryLabel:'Financial services', title:'Payment repair', summary:'Repair routine payment failures while protecting sensitive changes and screening decisions.', pattern:'A payment fails validation and is correlated with prior beneficiary and screening data.', decision:'Classify format, beneficiary, routing or screening issues.', action:'Auto-repair safe format issues, hold sensitive cases and route exceptions.', gate:'Tiered approval', owner:'Payments operations', value:'Reduce many manual repairs from 10–15 minutes to under a minute.'},

  {industry:'manufacturing', industryLabel:'Manufacturing', title:'Quote on live capacity', summary:'Respond to an RFQ using live line load, supply position and margin guardrails.', pattern:'An RFQ arrives as capacity and commodity conditions change across operational systems.', decision:'Calculate margin band and win likelihood.', action:'Generate an in-band quote and draft the customer narrative.', gate:'Approve exceptions', owner:'Sales lead', value:'Cut quote work by 1–2 hours and move turnaround from days to minutes.'},
  {industry:'manufacturing', industryLabel:'Manufacturing', title:'Stoppage before it happens', summary:'Spot equipment drift and a missing cycle before production stops.', pattern:'Equipment tags drift and an expected cycle-complete event goes missing.', decision:'Classify tooling wear, material starvation or an operator issue.', action:'Reserve a spare, propose a sequence change and alert the shift lead.', gate:'Tiered approval', owner:'Shift lead', value:'Turn 30–60 minutes of triage into a two-minute, evidence-led response.'},
  {industry:'manufacturing', industryLabel:'Manufacturing', title:'Part-change blast radius', summary:'Know which orders, assets and customers a design change touches before release.', pattern:'An engineering change appears while related orders, installed assets and inventory remain active.', decision:'Assess impact class and urgency.', action:'Prepare a quality hold, impacted-fleet list and draft notices.', gate:'Approve before act', owner:'Quality manager', value:'Compress cross-team impact analysis from days to hours.'},

  {industry:'retail', industryLabel:'Retail & CPG', title:'Phantom inventory', summary:'Find the shelf that looks stocked in the system but is losing sales in real life.', pattern:'An everyday item stops selling while stock says positive and shelf signals say empty.', decision:'Distinguish phantom stock, a slow day and a misplaced item.', action:'Create a store task, correct stock and propose a reorder.', gate:'Act, then review', owner:'Store manager', value:'Move detection from the next count to minutes and recover missed sales.'},
  {industry:'retail', industryLabel:'Retail & CPG', title:'Promotion integrity', summary:'Catch a price change that failed to reach the point of sale.', pattern:'A promotion is published, but transactions at some stores still use the old price.', decision:'Classify a propagation failure or a local override.', action:'Propose the corrected price, hold the campaign and queue affected refunds.', gate:'Approve price change', owner:'Category manager', value:'Replace complaint-led detection with an enterprise-wide response in minutes.'},
  {industry:'retail', industryLabel:'Retail & CPG', title:'Order rescue', summary:'Reroute a click-and-collect order before the customer arrives disappointed.', pattern:'An order is placed but a pick or handover event is absent beyond its SLA.', decision:'Determine whether another store or a later slot can rescue the order.', action:'Reroute and proactively update the customer.', gate:'Act, then review', owner:'Store operations', value:'Save service handling and protect revenue from recoverable failed orders.'},

  {industry:'energy', industryLabel:'Energy & utilities', title:'Alarm storm to one work order', summary:'Turn dozens of related alarms into one root-cause brief and coordinated response.', pattern:'Many alarms fire from one asset group inside a short window.', decision:'Identify the likely root-cause class with confidence.', action:'Create one consolidated work order and attach a crew brief.', gate:'Approve dispatch', owner:'Control room', value:'Reduce multi-hour alarm triage to roughly 15 minutes and accelerate restoration.'},
  {industry:'energy', industryLabel:'Energy & utilities', title:'Imbalance to trade', summary:'Connect generation drift and intraday price movement before the position worsens.', pattern:'Forecast and actual generation diverge as an intraday price spike appears.', decision:'Recommend rebalance, wait or hedge, with sizing.', action:'Send an evidence-backed trade proposal.', gate:'Approve before act', owner:'Trading desk', value:'Bring a 10–15 minute reaction down toward one minute.'},
  {industry:'energy', industryLabel:'Energy & utilities', title:'Data protection by design', summary:'Start the privacy workflow the moment sensitive data appears on the mesh.', pattern:'A new topic or schema is published with fields that may contain personal data.', decision:'Determine whether an impact assessment is needed and select the template.', action:'Open the assessment, notify the owner and collect available context.', gate:'Act, then review', owner:'Data protection officer', value:'Reduce days of assessment preparation to about half a day.'},

  {industry:'logistics', industryLabel:'Transport & logistics', title:'Train went dark', summary:'Detect a missing heartbeat while the timetable says the train should be moving.', pattern:'Telemetry stops while journey and timetable data indicate active movement.', decision:'Classify communications loss, power event or genuine stop.', action:'Create a triage brief, alert the depot and draft passenger information.', gate:'Approve instructions', owner:'Operations controller', value:'Move incident detection from 15–30 minutes to around one minute.'},
  {industry:'logistics', industryLabel:'Transport & logistics', title:'Shipment margin guardian', summary:'Evaluate reroute economics the moment delay and cost cross a threshold.', pattern:'A vessel delay combines with booking margin and reroute cost to threaten the shipment.', decision:'Recommend reroute, renegotiate or accept for each booking.', action:'Present options with expected return and operational impact.', gate:'Approve before act', owner:'Trade manager', value:'Compress hours of delay analysis to roughly 20 minutes and protect margin.'},
  {industry:'logistics', industryLabel:'Transport & logistics', title:'Act before the call', summary:'Resolve a connected-device fault before it becomes a service ticket.', pattern:'Telemetry shows a failure signature while no customer ticket exists yet.', decision:'Classify device, network or account fault.', action:'Fix, replace or warn the customer upstream of the service desk.', gate:'Tiered approval', owner:'Service operations', value:'Move first response from hours to minutes and prevent avoidable tickets.'},

  {industry:'pharma', industryLabel:'Life sciences', title:'Cold-chain excursion', summary:'Assess product stability as temperature drift happens, not after the shipment arrives.', pattern:'Temperature drifts over time and is joined with product stability limits and shipment location.', decision:'Classify within budget, quarantine or destroy.', action:'Open the deviation, assemble evidence and propose disposition.', gate:'Approve before act', owner:'Quality assurance', value:'Cut investigation from 4–8 hours to about one hour and avoid unnecessary write-offs.'},
  {industry:'pharma', industryLabel:'Life sciences', title:'Batch deviation to release', summary:'Assemble a complete investigation pack while production and release decisions continue.', pattern:'A deviation is correlated with the batch record, equipment events and prior line history.', decision:'Classify the deviation and whether release work can proceed in parallel.', action:'Prepare the investigation, draft corrective action and flag the release decision.', gate:'Approve before act', owner:'Qualified person', value:'Save 10–20 quality hours per deviation and shorten closure cycles.'},
  {industry:'pharma', industryLabel:'Life sciences', title:'Adverse-event signal', summary:'Connect the same product and reaction across channels before the clock is lost.', pattern:'Matching product and reaction signals appear across intake channels within a window.', decision:'Classify seriousness and whether expedited handling applies.', action:'Create and prefill the case, route it and start the reporting clock.', gate:'Approve submission', owner:'Safety physician', value:'Reduce intake and triage effort while protecting regulated reporting timelines.'}
];

const grid = document.querySelector('#pattern-grid');
const dialog = document.querySelector('#case-dialog');
const dialogContent = document.querySelector('#dialog-content');
const visibleCount = document.querySelector('#visible-count');

const safe = value => String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));

function cardTemplate(item, index) {
  return `
    <button class="pattern-card reveal" type="button" data-industry="${safe(item.industry)}" data-index="${index}">
      <span class="card-meta">
        <span class="industry-tag">${safe(item.industryLabel)}</span>
        <span class="gate-tag">${safe(item.gate)}</span>
      </span>
      <h3>${safe(item.title)}</h3>
      <p>${safe(item.summary)}</p>
      <footer><span>Explore pattern</span><span aria-hidden="true">→</span></footer>
    </button>`;
}

grid.innerHTML = cases.map(cardTemplate).join('');

function openCase(index) {
  const item = cases[index];
  if (!item) return;
  dialogContent.innerHTML = `
    <p class="dialog-eyebrow">${safe(item.industryLabel)} · Opportunity card</p>
    <h2 id="dialog-title">${safe(item.title)}</h2>
    <p class="dialog-lead">${safe(item.summary)}</p>
    <div class="dialog-steps">
      <div class="dialog-step"><span>01 · Pattern</span><p>${safe(item.pattern)}</p></div>
      <div class="dialog-step"><span>02 · Decision</span><p>${safe(item.decision)}</p></div>
      <div class="dialog-step"><span>03 · Action</span><p>${safe(item.action)}</p></div>
    </div>
    <div class="dialog-bottom">
      <div class="dialog-gate"><span>Human gate</span><p><strong>${safe(item.gate)}</strong><br>${safe(item.owner)} owns the decision.</p></div>
      <div><span>Value to validate</span><p>${safe(item.value)}</p></div>
    </div>
    <p class="dialog-note">Illustrative pattern and value hypothesis. Validate process volumes, controls and outcomes with your own data during discovery.</p>`;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}

grid.addEventListener('click', event => {
  const card = event.target.closest('.pattern-card');
  if (card) openCase(Number(card.dataset.index));
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });

const filters = [...document.querySelectorAll('.filter')];
filters.forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  filters.forEach(item => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  let count = 0;
  document.querySelectorAll('.pattern-card').forEach(card => {
    const visible = filter === 'all' || card.dataset.industry === filter;
    card.hidden = !visible;
    if (visible) count += 1;
  });
  visibleCount.textContent = count;
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .09 });

document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
window.addEventListener('scroll', () => document.querySelector('#site-header').classList.toggle('scrolled', window.scrollY > 18), { passive: true });
