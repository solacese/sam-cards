const industries = [
  { id: 'finance', name: 'Finance', icon: '€' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '⚙' },
  { id: 'retail', name: 'Retail / CPG', icon: '▦' },
  { id: 'energy', name: 'Energy & utilities', icon: '⌁' },
  { id: 'logistics', name: 'Logistics', icon: '→' },
  { id: 'pharma', name: 'Life sciences', icon: '+' }
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
    { title: 'Alarm storm to one work order', summary: 'Turn many related alarms into one response.', pattern: '40 alarms from one substation or asset group inside two minutes.', decision: 'Root-cause class with probability.', action: 'Create one consolidated work order with a crew brief.', gate: 'Approve dispatch', owner: 'Control room', value: 'Triage reduced from 2 to 4 hours to about 15 minutes' },
    { title: 'Imbalance to trade', summary: 'Connect generation drift with intraday price.', pattern: 'Forecast versus actual generation drifts past a band during a price spike.', decision: 'Rebalance now, wait or hedge.', action: 'Send a trade proposal with sizing.', gate: 'Approve every trade', owner: 'Trading desk', value: 'Reaction reduced from 10 to 15 minutes to about 1 minute' },
    { title: 'Data protection by design', summary: 'Start privacy review when sensitive data appears.', pattern: 'A new topic or schema is published with PII fields present.', decision: 'DPIA required or not, and which template.', action: 'Open the DPIA, notify the data owner and collect first answers.', gate: 'Review the assessment', owner: 'Data protection officer', value: 'DPIA effort reduced from 2 to 5 days to about half a day' }
  ],
  logistics: [
    { title: 'Train went dark', summary: 'Detect a missing heartbeat while the train is moving.', pattern: 'Telemetry is absent but the timetable shows an active journey.', decision: 'Comms loss, power event or genuine stop.', action: 'Send a triage brief and draft passenger information.', gate: 'Approve instructions', owner: 'Operations controller', value: 'Detection reduced from 15 to 30 minutes to about 1 minute' },
    { title: 'Shipment margin guardian', summary: 'Evaluate reroute economics when a vessel is delayed.', pattern: 'Delay, booking margin and reroute cost cross a threshold.', decision: 'Reroute, renegotiate or accept.', action: 'Present options with ROI.', gate: 'Approve reroutes', owner: 'Trade manager', value: 'Analysis reduced from hours to about 20 minutes' },
    { title: 'Act before the call', summary: 'Resolve a device fault before a ticket exists.', pattern: 'Telemetry shows a fault signature with no ticket yet.', decision: 'Device, network or account issue.', action: 'Fix, replace or warn the customer.', gate: 'Approve replacements', owner: 'Service operations', value: 'Prevent avoidable tickets and reduce handling cost' }
  ],
  pharma: [
    { title: 'Cold-chain excursion', summary: 'Assess product stability while temperature drifts.', pattern: 'Temperature drift meets stability limits and shipment location.', decision: 'Within budget, quarantine or destroy.', action: 'Open the deviation, assemble evidence and propose disposition.', gate: 'Approve disposition', owner: 'Quality assurance', value: 'Investigation reduced from 4 to 8 hours to about 1 hour' },
    { title: 'Batch deviation to release', summary: 'Build the investigation pack while release continues.', pattern: 'A deviation meets batch, equipment and line history.', decision: 'Deviation class and release path.', action: 'Draft the investigation and corrective action.', gate: 'Approve release', owner: 'Qualified person', value: '10 to 20 hours saved per deviation' },
    { title: 'Adverse event signal', summary: 'Connect the same product and reaction across channels.', pattern: 'Matching signals appear across intake channels.', decision: 'Seriousness and expedited status.', action: 'Create, prefill and route the case.', gate: 'Approve submission', owner: 'Safety physician', value: '30 to 50 percent less intake and triage effort' }
  ]
};

const objections = [
  { title: 'We already have an AI platform. Why another layer?', answer: 'Do not add another place to build agents. Connect the agents and systems you already have through business events, shared context and one audit trail.', ask: 'What tells your agent to start: a schedule, a person or the business change itself?' },
  { title: 'What does it cost end to end?', answer: 'Keep platform and model costs separate. Use deterministic logic where possible, minimize context and measure cost per completed task.', ask: 'What is your cost per completed task today, and who can see it?' },
  { title: 'Our data and events are not ready.', answer: 'Start with one process, two systems and one existing event stream. This is a focused operational pilot, not a data-platform program.', ask: 'Which process already publishes events today?' },
  { title: 'Will it pass security and governance?', answer: 'Carry identity through the workflow, scope access with broker controls and require a human gate for consequential actions.', ask: 'Who signs off an agent for production, and what evidence do they need?' },
  { title: 'Show me the use case that pays.', answer: 'Pick one exception the team handles every week. Measure reaction time, accuracy, effort and the cost of one miss.', ask: 'Which exception keeps a team busy every Monday?' }
];

const homeScreen = document.querySelector('#home-screen');
const detailScreen = document.querySelector('#detail-screen');
const industryGrid = document.querySelector('#industry-grid');
const detailList = document.querySelector('#detail-list');
const detailEyebrow = document.querySelector('#detail-eyebrow');
const detailTitle = document.querySelector('#detail-title');
const backButton = document.querySelector('#back-button');

function showHome() {
  detailScreen.hidden = true;
  homeScreen.hidden = false;
  backButton.hidden = true;
  document.title = 'Solace Agent Mesh Sales Cards';
  window.scrollTo(0, 0);
}

function renderCase(item, index) {
  return `
    <article class="full-card">
      <header class="full-card-head">
        <span class="card-number">0${index + 1}</span>
        <h2>${item.title}</h2>
        <span class="value-pill">${item.value}</span>
      </header>
      <div class="card-sequence">
        <div class="card-block"><span>Pattern</span><p>${item.pattern}</p></div>
        <div class="card-block"><span>Decision</span><p>${item.decision}</p></div>
        <div class="card-block"><span>Action</span><p>${item.action}</p></div>
      </div>
      <footer class="card-footer">
        <span class="card-summary">${item.summary}</span>
        <div class="gate-block"><span>Human gate</span><p>${item.gate}</p><small>${item.owner}</small></div>
      </footer>
    </article>`;
}

function showIndustry(id) {
  const industry = industries.find(item => item.id === id);
  if (!industry) return;
  detailEyebrow.textContent = 'Industry cards';
  detailTitle.textContent = industry.name;
  detailList.innerHTML = cases[id].map(renderCase).join('');
  homeScreen.hidden = true;
  detailScreen.hidden = false;
  backButton.hidden = false;
  document.title = `${industry.name} | Solace Agent Mesh`;
  window.scrollTo(0, 0);
}

function showObjections() {
  detailEyebrow.textContent = 'Sales responses';
  detailTitle.textContent = 'Top 5 objections';
  detailList.innerHTML = objections.map((item, index) => `
    <article class="objection-card">
      <span class="objection-number">0${index + 1}</span>
      <div>
        <h2>${item.title}</h2>
        <p class="objection-answer">${item.answer}</p>
        <p class="objection-question"><strong>Ask</strong><br>${item.ask}</p>
      </div>
    </article>`).join('');
  homeScreen.hidden = true;
  detailScreen.hidden = false;
  backButton.hidden = false;
  document.title = 'Top 5 Objections | Solace Agent Mesh';
  window.scrollTo(0, 0);
}

industryGrid.innerHTML = industries.map(industry => `
  <button class="industry-card" type="button" data-industry="${industry.id}">
    <span class="industry-icon" aria-hidden="true">${industry.icon}</span>
    <h2>${industry.name}</h2>
    <span class="card-arrow" aria-hidden="true">→</span>
  </button>`).join('');

industryGrid.addEventListener('click', event => {
  const card = event.target.closest('.industry-card');
  if (card) showIndustry(card.dataset.industry);
});

document.querySelector('#objections-button').addEventListener('click', showObjections);
document.querySelector('#home-button').addEventListener('click', showHome);
backButton.addEventListener('click', showHome);
