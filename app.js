const industries = [
  { id: 'finance', name: 'Financial services', description: 'Trades, market moves and payments' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Quotes, production and part changes' },
  { id: 'retail', name: 'Retail & consumer goods', description: 'Shelf stock, pricing and customer orders' },
  { id: 'energy', name: 'Energy & utilities', description: 'Equipment alarms, generation and data privacy' },
  { id: 'logistics', name: 'Transport & logistics', description: 'Trains, shipments and connected devices' },
  { id: 'pharma', name: 'Life sciences', description: 'Shipment temperature, batches and medicine safety' }
];

const cases = {
  finance: [
    {
      title: 'Catch incomplete trades',
      summary: 'Bring missing or mismatched trade details to the operations team before they cause a delay.',
      pattern: 'One system records a trade, but another sends no confirmation or sends different details.',
      decision: 'Compare the records and suggest the likely cause of the mismatch.',
      action: 'Prepare a correction or send the evidence to the right operations team.',
      gate: 'The operations team approves every change to a trade.',
      ask: 'How much time does your team spend gathering records for one incomplete trade?',
      benefit: 'Less time chasing trade records',
      owner: 'Operations team',
      value: 'Save 30 to 60 minutes for each problem.'
    },
    {
      title: 'Explain a sudden market move',
      summary: 'Give traders a brief that brings prices, news and customer orders together.',
      pattern: 'A price moves sharply as news, scheduled announcements or customer orders change.',
      decision: 'Check which signals may explain the move and flag uncertainty.',
      action: 'Send a short explanation with the evidence and a possible response.',
      gate: 'A trader approves every transaction.',
      ask: 'When a price moves suddenly, how many sources does your desk check?',
      benefit: 'Faster context for the trading desk',
      owner: 'Trading desk',
      value: 'Save 5 to 10 minutes for each major market move.'
    },
    {
      title: 'Resolve rejected payments',
      summary: 'Separate routine payment errors from cases that need a person’s judgment.',
      pattern: 'A payment fails because of its format, recipient details, route or screening result.',
      decision: 'Identify the error and check which corrections are allowed.',
      action: 'Correct permitted formatting errors; hold or route other cases for review.',
      gate: 'A person approves recipient changes and reviews every screening case.',
      ask: 'Which payment errors are repetitive, and which always need review?',
      benefit: 'Less manual payment repair',
      owner: 'Payments team',
      value: 'Save 10 to 15 minutes for each rejected payment.'
    }
  ],
  manufacturing: [
    {
      title: 'Prepare quotes with current capacity',
      summary: 'Help sales answer with current factory availability, material costs and delivery estimates.',
      pattern: 'A quote request arrives while capacity, costs or delivery conditions change.',
      decision: 'Check available capacity and suggest a price within the agreed profit range.',
      action: 'Draft a quote with a price, delivery estimate and customer response.',
      gate: 'A sales manager approves quotes outside agreed limits before they are sent.',
      ask: 'How many people or systems do you check before sending a quote?',
      benefit: 'Quicker, better-informed quotes',
      owner: 'Sales team',
      value: 'Save 1 to 2 hours for each quote.'
    },
    {
      title: 'Spot trouble before a line stops',
      summary: 'Give the shift leader an early warning and a practical next step.',
      pattern: 'Machine readings drift and an expected production cycle does not finish on time.',
      decision: 'Check whether equipment wear, missing material or an operating issue is the likely cause.',
      action: 'Suggest a spare part and a revised production sequence; alert the shift leader.',
      gate: 'The shift leader approves production changes and reviews spare-part reservations.',
      ask: 'What warning signs appear before a stoppage, and who sees them today?',
      benefit: 'Earlier response to production problems',
      owner: 'Shift leader',
      value: 'Reduce investigation time from 30 to 60 minutes to about 2 minutes.'
    },
    {
      title: 'Trace the impact of a part change',
      summary: 'Show quality teams which stock, orders and installed equipment may be affected.',
      pattern: 'A part or design changes while related products and orders are still active.',
      decision: 'Find affected items and suggest which ones need attention first.',
      action: 'Prepare a list of affected products, a proposed hold and draft customer notices.',
      gate: 'A quality manager approves holds and customer notices.',
      ask: 'How long does it take to find every order affected by a part change?',
      benefit: 'Faster impact analysis',
      owner: 'Quality team',
      value: 'Reduce impact analysis from several days to a few hours.'
    }
  ],
  retail: [
    {
      title: 'Find stock missing from the shelf',
      summary: 'Help store teams refill a shelf when the stock record says the product is still available.',
      pattern: 'A popular item stops selling, stock is recorded as available, and the shelf appears empty.',
      decision: 'Check whether the record is wrong, the item is misplaced or demand has fallen.',
      action: 'Ask the store to check the shelf and prepare a stock correction or reorder.',
      gate: 'The store manager reviews corrections and approves large reorders.',
      ask: 'How do you find an empty shelf when your system still shows stock?',
      benefit: 'Fewer sales lost to empty shelves',
      owner: 'Store manager',
      value: 'Recover sales that would otherwise be lost until the next stock count.'
    },
    {
      title: 'Catch promotional price errors',
      summary: 'Find stores charging the wrong price before customers have to point it out.',
      pattern: 'A promotion starts, but some stores still charge the old price.',
      decision: 'Check whether the update failed to arrive or the price was changed locally.',
      action: 'Prepare the correct price and identify orders that may need a refund.',
      gate: 'A category manager approves price changes; a person approves refunds.',
      ask: 'How do you confirm a promotional price actually reached every store?',
      benefit: 'Earlier detection of pricing errors',
      owner: 'Category team',
      value: 'Find pricing errors within minutes instead of waiting for complaints.'
    },
    {
      title: 'Rescue delayed collection orders',
      summary: 'Offer customers a workable alternative before they arrive for an order that is not ready.',
      pattern: 'An order is placed, but picking or handover misses the promised deadline.',
      decision: 'Check whether another store or a later collection time can fulfil the order.',
      action: 'Propose a new collection plan and prepare a customer update.',
      gate: 'A person approves refunds, vouchers and changes requiring customer agreement.',
      ask: 'When an order is late, can your team offer an alternative before the customer arrives?',
      benefit: 'More orders fulfilled successfully',
      owner: 'Store operations team',
      value: 'Protect sales that would otherwise be lost when an order is delayed.'
    }
  ],
  energy: [
    {
      title: 'Make sense of an alarm flood',
      summary: 'Give the control room one incident brief instead of many alarms for the same issue.',
      pattern: 'Several alarms arrive from the same substation or equipment group within two minutes.',
      decision: 'Group related alarms, suggest the likely cause and show uncertainty.',
      action: 'Create a combined work order and prepare a briefing for the field crew.',
      gate: 'The control room approves every crew dispatch.',
      ask: 'When alarms arrive together, how does your team find the underlying problem?',
      benefit: 'Less time sorting through alarms',
      owner: 'Control room',
      value: 'Reduce investigation time from 2 to 4 hours to about 15 minutes.'
    },
    {
      title: 'Respond to a power imbalance',
      summary: 'Help the trading team compare options when generation moves away from the forecast.',
      pattern: 'Power generation moves outside the forecast range while short-term prices rise.',
      decision: 'Compare rebalancing now, waiting for more information or proposing a protective trade.',
      action: 'Prepare a proposed transaction with the amount and supporting evidence.',
      gate: 'A trader approves every transaction.',
      ask: 'How quickly can you turn a forecast miss into an informed trading decision?',
      benefit: 'Quicker assessment of an imbalance',
      owner: 'Trading desk',
      value: 'Reduce response time from 10 to 15 minutes to about 1 minute.'
    },
    {
      title: 'Start privacy reviews earlier',
      summary: 'Notify the privacy team when a new data stream may contain personal information.',
      pattern: 'A new data stream or format includes information that could identify a person.',
      decision: 'Flag a possible need for a privacy assessment and suggest the relevant form.',
      action: 'Open a draft assessment, notify the data owner and gather available information.',
      gate: 'The data protection officer decides what review is needed and closes the assessment.',
      ask: 'How does your privacy team learn that a new data stream contains personal information?',
      benefit: 'Less work preparing a privacy review',
      owner: 'Data protection officer',
      value: 'Reduce preparation from 2 to 5 days to about half a day.'
    }
  ],
  logistics: [
    {
      title: 'Notice when a train goes silent',
      summary: 'Alert operations when an expected train update fails to arrive.',
      pattern: 'A train stops sending status updates while the timetable says it should be moving.',
      decision: 'Check for a communication failure, power issue or stopped train.',
      action: 'Prepare an incident brief, notify the depot and draft passenger information.',
      gate: 'An operations controller approves operational instructions and passenger notices.',
      ask: 'How long can a train stop sending updates before someone investigates?',
      benefit: 'Earlier detection of missing updates',
      owner: 'Operations centre',
      value: 'Reduce detection time from 15 to 30 minutes to about 1 minute.'
    },
    {
      title: 'Compare options for a delayed shipment',
      summary: 'Show shipping teams the cost and service impact of each response to a vessel delay.',
      pattern: 'A vessel delay makes a shipment more expensive and puts its expected profit at risk.',
      decision: 'Compare rerouting, renegotiating with the customer and accepting the delay.',
      action: 'Present the cost, expected return and operational impact of each option.',
      gate: 'A trade manager approves reroutes and customer renegotiations.',
      ask: 'How much work goes into comparing options when a vessel is delayed?',
      benefit: 'Faster decisions on shipment delays',
      owner: 'Trade management team',
      value: 'Reduce analysis from several hours to about 20 minutes.'
    },
    {
      title: 'Catch device faults before a support call',
      summary: 'Help service teams investigate a known device fault before the customer reports it.',
      pattern: 'Device data shows a known fault, but no support ticket has arrived.',
      decision: 'Check whether the issue is with the device, network or customer account.',
      action: 'Suggest a permitted fix, draft a customer update or prepare a replacement request.',
      gate: 'A person approves replacement shipments and reviews automated fixes.',
      ask: 'Which recurring device faults could you spot before a customer calls?',
      benefit: 'Fewer avoidable support tickets',
      owner: 'Service operations team',
      value: 'Prevent avoidable support tickets and reduce handling costs.'
    }
  ],
  pharma: [
    {
      title: 'Review temperature problems in transit',
      summary: 'Bring shipment evidence to quality teams so they can assess medicine exposed to heat or cold.',
      pattern: 'A shipment moves outside the product’s allowed temperature range.',
      decision: 'Compare the readings with product limits and suggest options for review.',
      action: 'Open a quality case, gather the evidence and prepare a recommendation.',
      gate: 'Quality assurance approves every decision to release, quarantine or dispose of the product.',
      ask: 'How many systems do you check to assess a temperature problem in transit?',
      benefit: 'Quicker temperature investigations',
      owner: 'Quality assurance',
      value: 'Reduce investigation time from 4 to 8 hours to about 1 hour.'
    },
    {
      title: 'Prepare batch investigations faster',
      summary: 'Gather batch records, equipment data and previous issues into one investigation.',
      pattern: 'A manufacturing problem needs to be checked against batch and equipment records.',
      decision: 'Classify the issue and highlight evidence relevant to the release decision.',
      action: 'Prepare the investigation and draft a corrective action for review.',
      gate: 'The qualified person approves every batch release.',
      ask: 'What takes longer in a batch investigation: gathering records or assessing them?',
      benefit: 'Less manual evidence gathering',
      owner: 'Quality team',
      value: 'Save 10 to 20 hours for each manufacturing problem.'
    },
    {
      title: 'Connect medicine safety reports',
      summary: 'Help safety teams spot related reports across calls, emails, literature and partners.',
      pattern: 'Reports mention the same medicine and reaction across several channels.',
      decision: 'Flag related reports and possible urgency for medical review.',
      action: 'Prepare a case with available information and route it to the medical reviewer.',
      gate: 'A safety physician approves medical assessments and regulatory submissions.',
      ask: 'How does your team connect related reports received through different channels?',
      benefit: 'Earlier review of related safety reports',
      owner: 'Medicine safety team',
      value: 'Reduce intake and review work by 30 to 50 percent.'
    }
  ]
};

const objections = [
  {
    icon: 'platform',
    title: '“We already have AI.”',
    answer: 'Connect existing agents and systems so they can respond together to business events.',
    ask: 'Do agents start from prompts, schedules or business events?'
  },
  {
    icon: 'cost',
    title: '“What will it cost?”',
    answer: 'Budget for platform, models, integration and support. Measure cost per task.',
    ask: 'What does one completed task cost today?'
  },
  {
    icon: 'data',
    title: '“Our data isn’t ready.”',
    answer: 'Start with one event and two systems. Check their data quality and access.',
    ask: 'Which process already produces useful events?'
  },
  {
    icon: 'control',
    title: '“How do we keep control?”',
    answer: 'Set access limits, approvals and an audit trail. Validate them before production.',
    ask: 'Which actions need human approval?'
  },
  {
    icon: 'value',
    title: '“Where’s the value?”',
    answer: 'Measure effort, response time, errors and costs before and after a focused pilot.',
    ask: 'Which recurring issue takes the most time?'
  }
];

const homeScreen = document.querySelector('#home-screen');
const detailScreen = document.querySelector('#detail-screen');
const industryGrid = document.querySelector('#industry-grid');
const detailList = document.querySelector('#detail-list');
const detailTitle = document.querySelector('#detail-title');
const backButton = document.querySelector('#back-button');
const homeTitle = document.querySelector('#home-title');
let homeScroll = 0;

function renderCase(item, index) {
  return `
    <article class="full-card" id="case-${index + 1}" aria-labelledby="case-title-${index + 1}">
      <header class="full-card-head">
        <span class="card-number" aria-hidden="true">0${index + 1}</span>
        <div><h2 id="case-title-${index + 1}">${item.title}</h2><p class="case-summary">${item.summary}</p></div>
      </header>
      <div class="case-benefit"><strong>${item.benefit}</strong></div>
      <div class="card-sequence">
        <div class="card-block"><h3>The problem</h3><p>${item.pattern}</p></div>
        <div class="card-block"><h3>What to check</h3><p>${item.decision}</p></div>
        <div class="card-block"><h3>The response</h3><p>${item.action}</p></div>
      </div>
      <div class="approval-block"><h3>Human approval · ${item.owner}</h3><p>${item.gate}</p></div>
      <footer class="card-footer"><h3>Ask the customer</h3><p>${item.ask}</p></footer>
      <p class="estimate-block"><strong>Illustrative estimate:</strong> ${item.value} Validate with the customer.</p>
    </article>`;
}

function showRoute({ focus = true } = {}) {
  const route = location.hash.slice(1).split('/');
  const industry = industries.find(item => item.id === route[0]);
  const isQuestions = route[0] === 'questions';
  const isHome = !industry && !isQuestions;
  homeScreen.hidden = !isHome;
  detailScreen.hidden = isHome;
  backButton.hidden = isHome;
  detailScreen.classList.toggle('questions-screen', isQuestions);
  detailList.classList.toggle('questions-list', isQuestions);
  if (isHome) {
    document.title = 'Solace Agent Mesh | Conversation cards';
    if (focus) { homeTitle.focus({ preventScroll: true }); window.scrollTo(0, homeScroll); }
    return;
  }
  if (isQuestions) {
    detailTitle.textContent = 'Common questions';
    detailList.innerHTML = objections.map((item, index) => `
      <article class="objection-card" aria-labelledby="question-title-${index + 1}">
        <header class="objection-heading"><span class="question-icon" aria-hidden="true"><img src="assets/icons/${item.icon}.svg" alt="" width="28" height="28"></span><h2 id="question-title-${index + 1}">${item.title}</h2></header>
        <div class="objection-answer"><h3>Say</h3><p>${item.answer}</p></div>
        <div class="objection-question"><h3>Ask</h3><p>${item.ask}</p></div>
      </article>`).join('');
    document.title = 'Common questions | Solace Agent Mesh';
  } else {
    detailTitle.textContent = industry.name;
    detailList.innerHTML = cases[industry.id].map(renderCase).join('');
    document.title = `${industry.name} | Solace Agent Mesh`;
  }
  const caseIndex = Number(route[1]);
  const target = industry && Number.isInteger(caseIndex) && caseIndex >= 1 && caseIndex <= cases[industry.id].length
    ? document.querySelector(`#case-${caseIndex}`) : null;
  if (target) {
    const heading = target.querySelector('h2');
    heading.tabIndex = -1;
    if (focus) heading.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  } else {
    if (focus) detailTitle.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

industryGrid.innerHTML = industries.map(industry => `
  <a class="industry-card" href="#${industry.id}">
    <span class="industry-icon" aria-hidden="true"><img src="assets/icons/${industry.id}.svg" alt="" width="30" height="30"></span>
    <div class="industry-copy"><h2>${industry.name}</h2><p>${industry.description}</p></div>
    <span class="card-arrow" aria-hidden="true">→</span>
  </a>`).join('');

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  const main = document.querySelector('#main-content');
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: 'start' });
});

homeScreen.addEventListener('click', event => { if (event.target.closest('a[href^="#"]')) homeScroll = window.scrollY; });
window.addEventListener('hashchange', () => showRoute());
showRoute({ focus: false });
