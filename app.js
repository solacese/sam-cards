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
    {
      title: 'Fix incomplete financial trades before they fail',
      summary: 'The operations team receives the evidence it needs before an incomplete trade causes a delay or extra cost.',
      pattern: 'A trade is recorded in several systems, but one confirmation is missing or contains different information.',
      decision: 'The system identifies the type of problem and its most likely cause.',
      action: 'It fixes simple problems automatically or sends the complete evidence to the correct operations team.',
      gate: 'A person approves any change to the trade.',
      owner: 'Operations team',
      value: 'Save 30 to 60 minutes for each problem.'
    },
    {
      title: 'Explain sudden market moves',
      summary: 'Traders receive one clear explanation instead of checking market data, news, calendars and customer orders separately.',
      pattern: 'A market price moves sharply while related news, scheduled announcements or customer orders also change.',
      decision: 'The system decides whether the move is caused by economic news, customer activity or normal market noise.',
      action: 'It sends the trader a clear summary and a suggested response.',
      gate: 'A trader approves every financial transaction.',
      owner: 'Trading desk',
      value: 'Save 5 to 10 minutes for each major market move.'
    },
    {
      title: 'Fix rejected payments',
      summary: 'Routine payment errors are corrected quickly, while sensitive cases are sent to a person for review.',
      pattern: 'A payment is rejected because of its format, recipient details, route or screening result.',
      decision: 'The system identifies why the payment failed and whether it is safe to correct.',
      action: 'It fixes simple formatting errors, holds sensitive payments and sends other cases to the correct team.',
      gate: 'A person approves changes to recipient details and all screening cases.',
      owner: 'Payments team',
      value: 'Save 10 to 15 minutes for each rejected payment.'
    }
  ],
  manufacturing: [
    {
      title: 'Respond to quote requests using live factory capacity',
      summary: 'Sales teams can answer customers quickly without using old capacity or material cost information.',
      pattern: 'A quote request arrives while factory capacity, material prices or delivery conditions are changing.',
      decision: 'The system calculates an acceptable profit range and the chance of winning the order.',
      action: 'It prepares the price, delivery estimate and customer response.',
      gate: 'A sales manager approves quotes outside the agreed profit range.',
      owner: 'Sales team',
      value: 'Save 1 to 2 hours for each quote.'
    },
    {
      title: 'Prevent production line stoppages',
      summary: 'The shift team receives an early warning and a practical response before production stops.',
      pattern: 'Machine readings begin to drift and an expected production cycle does not finish on time.',
      decision: 'The system decides whether the likely cause is worn equipment, missing material or an operating problem.',
      action: 'It reserves a spare part, suggests a new production sequence and alerts the shift leader.',
      gate: 'The shift leader approves any change to the production sequence.',
      owner: 'Shift leader',
      value: 'Reduce investigation time from 30 to 60 minutes to about 2 minutes.'
    },
    {
      title: 'Find everything affected by a part change',
      summary: 'Engineering and quality teams can see the full impact of a change before affected products reach customers.',
      pattern: 'A part or design changes while related orders, installed equipment and stock are still active.',
      decision: 'The system identifies what is affected and how urgently each item must be handled.',
      action: 'It prepares a quality hold, a list of affected products and draft customer notices.',
      gate: 'A quality manager approves the hold and every customer notice.',
      owner: 'Quality team',
      value: 'Reduce impact analysis from several days to a few hours.'
    }
  ],
  retail: [
    {
      title: 'Find missing stock on store shelves',
      summary: 'Store teams can refill empty shelves even when the stock system incorrectly says that products are available.',
      pattern: 'A popular product stops selling, the stock system shows available items and the shelf appears empty.',
      decision: 'The system decides whether the stock record is wrong, the product is misplaced or sales are simply slow.',
      action: 'It creates a store task, corrects the stock record and starts a reorder when needed.',
      gate: 'The store manager reviews stock corrections and approves large reorders.',
      owner: 'Store manager',
      value: 'Recover sales that would otherwise be lost until the next stock count.'
    },
    {
      title: 'Make sure promotional prices reach every store',
      summary: 'Pricing teams can correct failed price changes before customers complain or receive the wrong price.',
      pattern: 'A new promotional price is published, but some stores continue to charge the old price.',
      decision: 'The system identifies whether the price failed to reach the store or was changed locally.',
      action: 'It prepares the correct price, pauses the affected promotion and identifies customers who need a refund.',
      gate: 'A category manager approves every price change.',
      owner: 'Category team',
      value: 'Find pricing errors within minutes instead of waiting for complaints.'
    },
    {
      title: 'Rescue delayed customer orders',
      summary: 'Customers receive another collection option before they arrive for an order that is not ready.',
      pattern: 'An order is placed, but picking or handover does not happen before the promised deadline.',
      decision: 'The system checks whether another store or a later collection time can save the order.',
      action: 'It reroutes the order and tells the customer about the new collection plan.',
      gate: 'A person approves every refund or customer voucher.',
      owner: 'Store operations team',
      value: 'Protect sales that would otherwise be lost when an order is delayed.'
    }
  ],
  energy: [
    {
      title: 'Turn an alarm storm into one clear response',
      summary: 'The control room receives one useful incident instead of dozens of separate alarms for the same problem.',
      pattern: 'Many alarms from the same substation or group of equipment arrive within two minutes.',
      decision: 'The system identifies the most likely root cause and shows how confident it is.',
      action: 'It creates one combined work order and prepares a clear briefing for the field crew.',
      gate: 'The control room approves every crew dispatch.',
      owner: 'Control room',
      value: 'Reduce investigation time from 2 to 4 hours to about 15 minutes.'
    },
    {
      title: 'Respond to power imbalance before costs rise',
      summary: 'The trading team receives a clear recommendation as soon as actual generation moves away from the forecast.',
      pattern: 'Actual power generation moves outside the forecast range while the short-term market price is rising.',
      decision: 'The system recommends whether to rebalance now, wait for more information or protect the position with a trade.',
      action: 'It prepares a transaction proposal with the recommended amount and supporting evidence.',
      gate: 'A trader approves every transaction.',
      owner: 'Trading desk',
      value: 'Reduce response time from 10 to 15 minutes to about 1 minute.'
    },
    {
      title: 'Start privacy reviews when sensitive data appears',
      summary: 'The privacy team learns about sensitive data as soon as it appears, rather than during a later audit.',
      pattern: 'A new data stream or schema is published and includes information that can identify a person.',
      decision: 'The system decides whether a privacy impact assessment is required and selects the correct form.',
      action: 'It opens the assessment, informs the data owner and collects the information that is already available.',
      gate: 'The data protection officer reviews and closes the assessment.',
      owner: 'Data protection officer',
      value: 'Reduce preparation from 2 to 5 days to about half a day.'
    }
  ],
  logistics: [
    {
      title: 'Detect when a moving train stops sending data',
      summary: 'The operations centre can investigate immediately instead of waiting for a driver, station or passenger to report a problem.',
      pattern: 'A train stops sending status information even though the timetable shows that it should still be moving.',
      decision: 'The system decides whether the likely cause is lost communication, a power problem or a stopped train.',
      action: 'It sends a clear incident summary, alerts the depot and prepares passenger information.',
      gate: 'An operations controller approves every operational instruction.',
      owner: 'Operations centre',
      value: 'Reduce detection time from 15 to 30 minutes to about 1 minute.'
    },
    {
      title: 'Protect shipment profit when vessels are delayed',
      summary: 'Shipping teams can compare the financial effect of each option before a delay removes the profit from a booking.',
      pattern: 'A vessel is delayed and the cost of rerouting threatens the expected profit from a shipment.',
      decision: 'The system recommends whether to reroute, renegotiate with the customer or accept the delay.',
      action: 'It presents each option with its cost, expected return and operational effect.',
      gate: 'A trade manager approves every reroute or customer renegotiation.',
      owner: 'Trade management team',
      value: 'Reduce analysis from several hours to about 20 minutes.'
    },
    {
      title: 'Fix device problems before customers call',
      summary: 'The service team can solve or explain a connected-device problem before it becomes a support ticket.',
      pattern: 'Device data shows a known fault, but the customer has not contacted support yet.',
      decision: 'The system identifies whether the problem is with the device, network or customer account.',
      action: 'It fixes the problem, warns the customer or prepares a replacement device.',
      gate: 'A person approves every replacement shipment.',
      owner: 'Service operations team',
      value: 'Prevent avoidable support tickets and reduce handling costs.'
    }
  ],
  pharma: [
    {
      title: 'Respond quickly to temperature problems in transit',
      summary: 'Quality teams can protect medicine and avoid unnecessary disposal when a shipment becomes too warm or too cold.',
      pattern: 'A shipment temperature moves outside its normal range while the product is in transit.',
      decision: 'The system checks the product limits and recommends whether to accept, quarantine or dispose of it.',
      action: 'It opens the quality case, collects the evidence and prepares a recommended decision.',
      gate: 'Quality assurance approves every final product decision.',
      owner: 'Quality assurance',
      value: 'Reduce investigation time from 4 to 8 hours to about 1 hour.'
    },
    {
      title: 'Speed up batch investigations and release',
      summary: 'Quality teams receive a prepared investigation instead of collecting records from several systems by hand.',
      pattern: 'A manufacturing problem occurs and must be compared with the batch record, equipment data and previous problems.',
      decision: 'The system identifies the type of problem and whether release work can continue safely.',
      action: 'It prepares the investigation, drafts the corrective action and highlights the release decision.',
      gate: 'The qualified person approves every batch release.',
      owner: 'Quality team',
      value: 'Save 10 to 20 hours for each manufacturing problem.'
    },
    {
      title: 'Detect serious medicine safety patterns earlier',
      summary: 'Safety teams can connect related reports across channels before an important reporting deadline is missed.',
      pattern: 'The same medicine and reaction appear in calls, emails, published literature or partner reports.',
      decision: 'The system decides how serious the event may be and whether faster reporting is required.',
      action: 'It creates the case, fills in available information and sends it to the correct medical reviewer.',
      gate: 'A safety physician approves every medical assessment and regulatory submission.',
      owner: 'Medicine safety team',
      value: 'Reduce intake and review work by 30 to 50 percent.'
    }
  ]
};

const objections = [
  {
    title: 'We already have an AI platform. Why do we need another layer?',
    answer: 'You do not need another place to build agents. Solace Agent Mesh connects the agents and systems you already use, so they can respond to the same business event and keep one complete record of what happened.',
    ask: 'What starts your agents today: a schedule, a person or a change in the business?'
  },
  {
    title: 'How much will the complete solution cost?',
    answer: 'Keep the platform cost and the AI model cost separate. Use normal software logic for predictable work, use AI only when judgment is needed and measure the cost of each completed task.',
    ask: 'Do you know the cost of one completed task today, and who can see it?'
  },
  {
    title: 'Our data and events are not ready.',
    answer: 'Start with one business process, two systems and one event stream that already exists. The first project is a focused operational improvement, not a large data-platform programme.',
    ask: 'Which important business process already produces events today?'
  },
  {
    title: 'Will security and governance teams approve it?',
    answer: 'The user identity follows the complete process, access is limited for every agent and a person approves important actions. The complete decision and its evidence remain available for review.',
    ask: 'Who approves an agent for production today, and what evidence do they require?'
  },
  {
    title: 'Show me a use case that will deliver real value.',
    answer: 'Choose one recurring exception that crosses two systems and requires manual work every week. Measure the response time, accuracy, effort saved and cost of one failure.',
    ask: 'Which recurring exception takes the most time from your team each week?'
  }
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
        <div class="card-block"><span>What happens</span><p>${item.pattern}</p></div>
        <div class="card-block"><span>What the system decides</span><p>${item.decision}</p></div>
        <div class="card-block"><span>What the system does</span><p>${item.action}</p></div>
      </div>
      <footer class="card-footer">
        <div class="gate-block"><span>Human approval</span><p>${item.gate}</p><small>${item.owner}</small></div>
      </footer>
    </article>`;
}

function showIndustry(id) {
  const industry = industries.find(item => item.id === id);
  if (!industry) return;
  detailEyebrow.textContent = 'Industry examples';
  detailTitle.textContent = industry.name;
  detailList.innerHTML = cases[id].map(renderCase).join('');
  homeScreen.hidden = true;
  detailScreen.hidden = false;
  backButton.hidden = false;
  document.title = `${industry.name} | Solace Agent Mesh`;
  window.scrollTo(0, 0);
}

function showObjections() {
  detailEyebrow.textContent = 'Common sales questions';
  detailTitle.textContent = 'Top 5 objections';
  detailList.innerHTML = objections.map((item, index) => `
    <article class="objection-card">
      <span class="objection-number">0${index + 1}</span>
      <div>
        <h2>${item.title}</h2>
        <p class="objection-answer">${item.answer}</p>
        <p class="objection-question"><strong>Question to ask</strong><br>${item.ask}</p>
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
