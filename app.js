const industries = [
  { id: 'finance', name: 'Financial services', icon: '€' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '⚙' },
  { id: 'retail', name: 'Retail & CPG', icon: '▦' },
  { id: 'energy', name: 'Energy & utilities', icon: '⌁' },
  { id: 'logistics', name: 'Transport & logistics', icon: '→' },
  { id: 'pharma', name: 'Pharma & life sciences', icon: '+' }
];

const cases = {
  finance: [
    { title: 'Trade break prevention', summary: 'Catch a missing or mismatched confirmation before settlement.', pattern: 'One of several booking confirmations is missing or mismatched after T.', decision: 'Break class and likely cause.', action: 'Reconcile simple cases or route the evidence.', gate: 'Approve booking changes', owner: 'Operations desk', value: '30 to 60 minutes saved per break' },
    { title: 'Market move with context', summary: 'Join price, news and client flow into one desk brief.', pattern: 'A market move crosses a band with related news and order flow.', decision: 'Macro, flow driven or noise.', action: 'Send context and a pre-hedge proposal.', gate: 'Approve every hedge', owner: 'Trading desk', value: '5 to 10 minutes saved per move' },
    { title: 'Payment repair', summary: 'Repair routine failures and route sensitive exceptions.', pattern: 'A payment fails validation with beneficiary and screening context.', decision: 'Format, beneficiary, routing or screening.', action: 'Repair safe formats, hold or route the rest.', gate: 'Approve sensitive changes', owner: 'Payments operations', value: '10 to 15 minutes saved per repair' }
  ],
  manufacturing: [
    { title: 'Quote on live capacity', summary: 'Price an RFQ with current line load and material cost.', pattern: 'An RFQ arrives as capacity or commodity conditions change.', decision: 'Margin band and win likelihood.', action: 'Create the quote and customer narrative.', gate: 'Approve margin exceptions', owner: 'Sales lead', value: '1 to 2 hours saved per quote' },
    { title: 'Stoppage before it happens', summary: 'Spot equipment drift and a missing cycle early.', pattern: 'A tag drifts and cycle-complete is absent for two cycles.', decision: 'Tooling, material or operator cause.', action: 'Reserve a spare, propose a new sequence and alert.', gate: 'Approve resequencing', owner: 'Shift lead', value: 'Triage in about 2 minutes' },
    { title: 'Part change blast radius', summary: 'Find affected orders, assets and customers.', pattern: 'An engineering change meets open orders, fleet and inventory.', decision: 'Impact class and urgency.', action: 'Prepare a hold, impact list and notices.', gate: 'Approve hold and notices', owner: 'Quality manager', value: 'Analysis reduced from days to hours' }
  ],
  retail: [
    { title: 'Phantom inventory', summary: 'Find stock that exists in the system but not on the shelf.', pattern: 'Sales stop while stock is positive and the shelf is empty.', decision: 'Phantom stock, slow day or misplaced item.', action: 'Create a task, correct stock and reorder.', gate: 'Review stock correction', owner: 'Store manager', value: 'Recover missed sales in minutes' },
    { title: 'Promotion integrity', summary: 'Catch a price change that missed the point of sale.', pattern: 'POS transactions still use an old price after publication.', decision: 'Propagation failure or local override.', action: 'Correct price, hold campaign and queue refunds.', gate: 'Approve price changes', owner: 'Category manager', value: 'Detect errors before complaints' },
    { title: 'Order rescue', summary: 'Reroute a click-and-collect order before pickup.', pattern: 'Pick or handover is absent beyond the SLA.', decision: 'Another store, later slot or no rescue.', action: 'Reroute and notify the customer.', gate: 'Approve refunds', owner: 'Store operations', value: 'Protect recoverable order revenue' }
  ],
  energy: [
    { title: 'Alarm storm to one work order', summary: 'Turn many related alarms into one response.', pattern: 'Many alarms fire from one asset group in two minutes.', decision: 'Root-cause class with probability.', action: 'Create one work order and crew brief.', gate: 'Approve dispatch', owner: 'Control room', value: 'Hours of triage reduced to minutes' },
    { title: 'Imbalance to trade', summary: 'Connect generation drift with intraday price.', pattern: 'Forecast and actual generation diverge during a price spike.', decision: 'Rebalance, wait or hedge.', action: 'Send a sized trade proposal.', gate: 'Approve every trade', owner: 'Trading desk', value: 'React in about 1 minute' },
    { title: 'Data protection by design', summary: 'Start privacy review when sensitive data appears.', pattern: 'A new topic or schema includes personal data.', decision: 'DPIA required and template.', action: 'Open the DPIA, notify and collect context.', gate: 'Review the assessment', owner: 'Data protection officer', value: 'Days of preparation reduced to hours' }
  ],
  logistics: [
    { title: 'Train went dark', summary: 'Detect a missing heartbeat while the train is moving.', pattern: 'Telemetry is absent but the timetable shows an active journey.', decision: 'Comms loss, power event or genuine stop.', action: 'Send a triage brief and draft passenger information.', gate: 'Approve instructions', owner: 'Operations controller', value: 'Detect in about 1 minute' },
    { title: 'Shipment margin guardian', summary: 'Evaluate reroute economics when a vessel is delayed.', pattern: 'Delay, booking margin and reroute cost cross a threshold.', decision: 'Reroute, renegotiate or accept.', action: 'Present options with ROI.', gate: 'Approve reroutes', owner: 'Trade manager', value: 'Hours of analysis reduced to 20 minutes' },
    { title: 'Act before the call', summary: 'Resolve a device fault before a ticket exists.', pattern: 'Telemetry shows a fault signature with no ticket yet.', decision: 'Device, network or account issue.', action: 'Fix, replace or warn the customer.', gate: 'Approve replacements', owner: 'Service operations', value: 'Prevent avoidable tickets' }
  ],
  pharma: [
    { title: 'Cold-chain excursion', summary: 'Assess product stability while temperature drifts.', pattern: 'Temperature drift meets stability limits and location.', decision: 'Within budget, quarantine or destroy.', action: 'Open the deviation and propose disposition.', gate: 'Approve disposition', owner: 'Quality assurance', value: '4 to 8 hours reduced to about 1' },
    { title: 'Batch deviation to release', summary: 'Build the investigation pack while release continues.', pattern: 'A deviation meets batch, equipment and line history.', decision: 'Deviation class and release path.', action: 'Draft the investigation and corrective action.', gate: 'Approve release', owner: 'Qualified person', value: '10 to 20 hours saved per deviation' },
    { title: 'Adverse event signal', summary: 'Connect the same product and reaction across channels.', pattern: 'Matching signals appear across intake channels.', decision: 'Seriousness and expedited status.', action: 'Create, prefill and route the case.', gate: 'Approve submission', owner: 'Safety physician', value: '30 to 50 percent less intake effort' }
  ]
};

const industryScreen = document.querySelector('#industry-screen');
const cardsScreen = document.querySelector('#cards-screen');
const industryGrid = document.querySelector('#industry-grid');
const caseGrid = document.querySelector('#case-grid');
const cardsEyebrow = document.querySelector('#cards-eyebrow');
const cardsTitle = document.querySelector('#cards-title');
const backButton = document.querySelector('#back-button');
const homeButton = document.querySelector('#home-button');
const dialog = document.querySelector('#case-dialog');
const dialogContent = document.querySelector('#dialog-content');

function showIndustries() {
  cardsScreen.hidden = true;
  industryScreen.hidden = false;
  backButton.hidden = true;
  document.title = 'Solace Agent Mesh Sales Cards';
  window.scrollTo(0, 0);
}

function showIndustry(id) {
  const industry = industries.find(item => item.id === id);
  if (!industry) return;
  cardsEyebrow.textContent = industry.name;
  cardsTitle.textContent = 'Three agent patterns';
  caseGrid.innerHTML = cases[id].map((item, index) => `
    <button class="case-card" type="button" data-industry="${id}" data-index="${index}">
      <span class="case-number">0${index + 1}</span>
      <h2>${item.title}</h2>
      <p>${item.summary}</p>
      <span class="case-tags"><span class="gate-tag">${item.gate}</span><span class="value-tag">${item.value}</span></span>
      <span class="open-label">Open card <span aria-hidden="true">→</span></span>
    </button>`).join('');
  industryScreen.hidden = true;
  cardsScreen.hidden = false;
  backButton.hidden = false;
  document.title = `${industry.name} | Solace Agent Mesh`;
  window.scrollTo(0, 0);
}

function openCase(industryId, index) {
  const industry = industries.find(item => item.id === industryId);
  const item = cases[industryId]?.[index];
  if (!industry || !item) return;
  dialogContent.innerHTML = `
    <p class="dialog-industry">${industry.name}</p>
    <h2 id="dialog-title">${item.title}</h2>
    <div class="dialog-grid">
      <div class="dialog-item"><span>Pattern</span><p>${item.pattern}</p></div>
      <div class="dialog-item"><span>Decision</span><p>${item.decision}</p></div>
      <div class="dialog-item"><span>Action</span><p>${item.action}</p></div>
      <div class="dialog-item gate"><span>Human gate</span><p><strong>${item.gate}</strong><br>${item.owner}</p></div>
      <div class="dialog-item"><span>Value</span><p>${item.value}</p></div>
    </div>`;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}

industryGrid.innerHTML = industries.map((industry, index) => `
  <button class="industry-card" type="button" data-industry="${industry.id}">
    <span class="industry-icon" aria-hidden="true">${industry.icon}</span>
    <h2>${industry.name}</h2>
    <p>3 agent patterns</p>
    <span class="card-arrow" aria-hidden="true">→</span>
  </button>`).join('');

industryGrid.addEventListener('click', event => {
  const card = event.target.closest('.industry-card');
  if (card) showIndustry(card.dataset.industry);
});

caseGrid.addEventListener('click', event => {
  const card = event.target.closest('.case-card');
  if (card) openCase(card.dataset.industry, Number(card.dataset.index));
});

backButton.addEventListener('click', showIndustries);
homeButton.addEventListener('click', showIndustries);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
