/* Native disclosure controls and checkboxes keep multi-selection keyboard accessible. */
(function(root) {
  'use strict';
  const labels = {departments:'Target department',topic:'Topic',outcomes:'Desired business outcome',systems:'Systems involved'};
  function summaryEntries(criteria = {}) {
    return Object.entries(labels).flatMap(([key,label]) => {
      const value = Array.isArray(criteria[key]) ? criteria[key].join(', ') : criteria[key];
      return value ? [[label,value]] : [];
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {summaryEntries};
  if (typeof document === 'undefined') return;
  const suggestions = {
    departments:['HR','Finance','Logistics','Procurement','Operations','IT','Legal','Sales','Customer Service'],
    outcomes:['Protect revenue','Reduce risk','Reduce costs','Improve efficiency','Improve customer experience','Ensure compliance'],
    systems:['Salesforce','SharePoint','SAP','ServiceNow','Microsoft Dynamics','Workday']
  };
  const nouns = {departments:'department',outcomes:'outcome',systems:'system'};
  const fields = document.querySelector('#tailoring-fields');
  const feedback = document.querySelector('#tailoring-feedback');
  const widgets = [];
  function element(tag,text,className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  document.querySelectorAll('[data-multi]').forEach(container => {
    const key = container.dataset.multi, label = labels[key];
    const caption = element('span',label,'field-label'); caption.id = `${key}-label`;
    const dropdown = element('details',null,'multi-select');
    const summary = element('summary');
    const count = element('span'); count.id = `${key}-count`;
    summary.setAttribute('aria-labelledby',`${caption.id} ${count.id}`); summary.append(count);
    const popup = element('div',null,'multi-popup');
    const checklist = element('div',null,'multi-checklist');
    checklist.setAttribute('role','group'); checklist.setAttribute('aria-label',`${label} options`);
    const customRow = element('div',null,'custom-entry');
    const input = element('input'); input.type = 'text'; input.maxLength = 80;
    input.id = `${key}-custom`; input.placeholder = `Custom ${nouns[key]}`;
    const inputLabel = element('label',`Custom ${nouns[key]}`,'sr-only'); inputLabel.htmlFor = input.id;
    const add = element('button','Add'); add.type = 'button'; add.setAttribute('aria-label',`Add custom ${nouns[key]}`);
    customRow.append(inputLabel,input,add);
    const chips = element('ul',null,'selection-chips'); chips.setAttribute('aria-label',`Selected ${label.toLowerCase()}`);
    popup.append(checklist,customRow); dropdown.append(summary,popup); container.append(caption,dropdown,chips);
    const options = () => [...checklist.querySelectorAll('input')];
    const selected = () => options().filter(option=>option.checked);
    function update() {
      count.textContent = selected().length ? `${selected().length} selected` : `Choose ${nouns[key]}s`;
      chips.replaceChildren();
      selected().forEach(option => {
        const chip = element('li'), remove = element('button',`${option.value} ×`);
        remove.type = 'button'; remove.setAttribute('aria-label',`Remove ${option.value} from ${label.toLowerCase()}`);
        remove.addEventListener('click',()=> { option.checked=false; update(); feedback.textContent=`Removed ${option.value}.`; summary.focus(); });
        chip.append(remove); chips.append(chip);
      });
    }
    function option(value) {
      const row = element('label',null,'multi-option'), checkbox = element('input');
      checkbox.type = 'checkbox'; checkbox.value = value;
      checkbox.addEventListener('change',()=> {
        if (selected().length > 8) { checkbox.checked=false; feedback.textContent='Choose up to eight entries per field.'; }
        else feedback.textContent='';
        update();
      });
      row.append(checkbox,element('span',value)); checklist.append(row); return checkbox;
    }
    suggestions[key].forEach(option);
    function commit() {
      const value = input.value.normalize('NFKC').trim().replace(/\s+/g,' ');
      if (!value) { input.value=''; return true; }
      if (value.length>80 || /[\u0000-\u001f\u007f]/.test(value)) {
        feedback.textContent='Use up to 80 plain-text characters per entry.'; input.focus(); return false;
      }
      const existing = options().find(item=>item.value.toLocaleLowerCase()===value.toLocaleLowerCase());
      if (!existing?.checked && selected().length>=8) {
        feedback.textContent='Choose up to eight entries per field.'; input.focus(); return false;
      }
      (existing || option(value)).checked = true;
      input.value=''; update(); feedback.textContent=`Added ${value}.`; return true;
    }
    add.addEventListener('click',()=> { if (commit()) input.focus(); });
    input.addEventListener('keydown',event=> { if (event.key==='Enter') { event.preventDefault(); commit(); } });
    dropdown.addEventListener('toggle',()=> {
      if (dropdown.open) widgets.forEach(widget=> { if (widget.dropdown!==dropdown) widget.dropdown.open=false; });
    });
    dropdown.addEventListener('keydown',event=> {
      if (event.key==='Escape') { event.preventDefault(); event.stopPropagation(); dropdown.open=false; summary.focus(); }
    });
    widgets.push({key,dropdown,commit,values:()=>selected().map(item=>item.value)}); update();
  });
  document.addEventListener('click',event=>widgets.forEach(widget=> {
    if (!widget.dropdown.contains(event.target)) widget.dropdown.open=false;
  }));
  root.Tailoring = {
    summaryEntries,
    collect() {
      for (const widget of widgets) if (!widget.commit()) return null;
      const criteria = {};
      widgets.forEach(widget=> { const values=widget.values(); if (values.length) criteria[widget.key]=values; });
      const topic = document.querySelector('#topic').value.trim(); if (topic) criteria.topic=topic;
      feedback.textContent=''; return criteria;
    },
    setBusy(value) { fields.disabled=value; widgets.forEach(widget=> { widget.dropdown.open=false; }); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
