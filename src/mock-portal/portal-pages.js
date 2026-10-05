// HTML for the mock building-access portal. Labels, roles and data-testid attributes
// are the contract the browser worker relies on. The registration form is a three-step
// wizard with the things real portals have: a radio group, rows added on demand, a
// dropdown whose options are loaded after another dropdown changes, and a field that
// only appears once a checkbox is ticked.

import { BUILDINGS, displayValue, EQUIPMENT, FIELDS, MAX_COMPANIONS, VISITOR_TYPES } from '../core/registration-fields.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px}
label{display:block;margin-top:12px;font-weight:600}input,select,textarea{width:100%;padding:8px;box-sizing:border-box}
input[type=radio],input[type=checkbox]{width:auto;margin-right:6px}fieldset{margin-top:12px;border:1px solid #ccc}
fieldset label,.inline{font-weight:400;margin-top:4px}button{margin:16px 8px 0 0;padding:10px 16px}
.error{color:#b00020}.steps{display:flex;gap:16px;padding:0;list-style:none}.steps .current{font-weight:700;text-decoration:underline}
td,th{text-align:left;padding:6px 12px 6px 0;vertical-align:top}[hidden]{display:none}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

export function loginPage(error = '') {
  return page('Building Access Portal: Sign in', `
${error ? `<p class="error" data-testid="login-error">${escapeHtml(error)}</p>` : ''}
<form method="post" action="/login">
  <label for="username">Username</label><input id="username" name="username" autocomplete="off">
  <label for="password">Password</label><input id="password" name="password" type="password">
  <button type="submit">Sign in</button>
</form>`);
}

// Runs in the browser. No template placeholders in here: it is sent as written.
const WIZARD_SCRIPT = `
const form = document.querySelector('[data-testid="registration-form"]');
const steps = [...form.querySelectorAll('[data-step]')];
function show(index) {
  steps.forEach((s, i) => { s.hidden = i !== index; });
  document.querySelectorAll('.steps li').forEach((li, i) => li.classList.toggle('current', i === index));
}
form.addEventListener('click', (event) => {
  const index = steps.indexOf(event.target.closest('[data-step]'));
  if (event.target.matches('[data-next]')) show(index + 1);
  if (event.target.matches('[data-back]')) show(index - 1);
  if (event.target.matches('[data-remove]')) { event.target.closest('.companion').remove(); renumber(); }
});

const rows = document.getElementById('companions');
const addButton = document.getElementById('add-companion');
function renumber() {
  [...rows.children].forEach((row, i) => {
    row.querySelector('label').htmlFor = 'companion-' + (i + 1);
    row.querySelector('label').textContent = 'Companion ' + (i + 1);
    row.querySelector('input').id = 'companion-' + (i + 1);
  });
  addButton.disabled = rows.children.length >= Number(rows.dataset.max);
}
function addCompanion(name) {
  const row = document.createElement('div');
  row.className = 'companion';
  row.innerHTML = '<label></label><input name="companion"><button type="button" data-remove>Remove</button>';
  row.querySelector('input').value = name || '';
  rows.append(row);
  renumber();
}
addButton.addEventListener('click', () => addCompanion(''));
JSON.parse(rows.dataset.initial).forEach(addCompanion);

// Floors depend on the building and arrive from the server a moment later.
const building = document.getElementById('building');
const floor = document.getElementById('floor');
async function loadFloors(selected) {
  floor.innerHTML = '<option value="">Loading…</option>';
  floor.disabled = true;
  const floors = building.value ? await (await fetch('/api/floors?building=' + encodeURIComponent(building.value))).json() : [];
  floor.innerHTML = '<option value="">Select…</option>' + floors.map((n) => '<option value="' + n + '">Floor ' + n + '</option>').join('');
  floor.value = floors.includes(Number(selected)) ? selected : '';
  floor.disabled = !building.value;
}
building.addEventListener('change', () => loadFloors(''));
loadFloors(floor.dataset.selected);

const parking = document.getElementById('parking');
const plate = document.getElementById('plate-field');
const syncPlate = () => { plate.hidden = !parking.checked; };
parking.addEventListener('change', syncPlate);
syncPlate();

const firstError = form.querySelector('.error');
show(firstError ? steps.indexOf(firstError.closest('[data-step]')) : 0);
`;

export function registrationPage(values = {}, errors = {}) {
  const v = (key) => escapeHtml(values[key] ?? '');
  const err = (key) => (errors[key] ? `<p class="error" data-testid="error-${key}">${escapeHtml(errors[key])}</p>` : '');
  const text = (key, label, type = 'text') =>
    `<label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" value="${v(key)}">${err(key)}`;
  const ticks = (name, options, type, chosen) =>
    options.map((o) => `<label><input type="${type}" name="${name}" value="${o.value}"${chosen.includes(o.value) ? ' checked' : ''}>${escapeHtml(o.label)}</label>`).join('');
  const buildings = BUILDINGS.map(
    (b) => `<option value="${b.value}"${values.building === b.value ? ' selected' : ''}>${escapeHtml(b.label)}</option>`,
  ).join('');
  const companions = (values.companions ?? '').split('\n').filter(Boolean);
  const problems = Object.values(errors);

  return page('Visitor registration', `
${problems.length ? `<p class="error" data-testid="error-summary">Please correct ${problems.length} field(s) before continuing.</p>` : ''}
<ol class="steps"><li>1. Visitor</li><li>2. Visit</li><li>3. Access</li></ol>
<form method="post" action="/visitors/confirm" data-testid="registration-form" novalidate>
  <section data-step="1">
    <fieldset><legend>Visitor type</legend>${ticks('visitorType', VISITOR_TYPES, 'radio', [values.visitorType])}</fieldset>${err('visitorType')}
    ${text('visitorName', 'Visitor name')}
    ${text('visitorCompany', 'Visitor company')}
    ${text('visitorPhone', 'Visitor phone', 'tel')}
    <div id="companions" data-testid="companions" data-max="${MAX_COMPANIONS}" data-initial="${escapeHtml(JSON.stringify(companions))}"></div>${err('companions')}
    <button type="button" id="add-companion">Add companion</button>
    <div><button type="button" data-next>Next</button></div>
  </section>
  <section data-step="2" hidden>
    ${text('visitDate', 'Visit date', 'date')}
    ${text('startTime', 'Start time', 'time')}
    ${text('endTime', 'End time', 'time')}
    <label for="building">Building</label><select id="building" name="building"><option value="">Select…</option>${buildings}</select>${err('building')}
    <label for="floor">Floor</label><select id="floor" name="floor" data-selected="${v('floor')}" disabled></select>${err('floor')}
    ${text('hostName', 'Host name')}
    <label for="purpose">Purpose</label><textarea id="purpose" name="purpose" rows="3">${v('purpose')}</textarea>${err('purpose')}
    <div><button type="button" data-back>Back</button><button type="button" data-next>Next</button></div>
  </section>
  <section data-step="3" hidden>
    <fieldset><legend>Equipment brought in</legend>${ticks('equipment', EQUIPMENT, 'checkbox', (values.equipment ?? '').split(','))}</fieldset>${err('equipment')}
    <label class="inline"><input type="checkbox" id="parking" name="parking" value="yes"${values.parking === 'yes' ? ' checked' : ''}>Parking space needed</label>
    <div id="plate-field" hidden>${text('vehiclePlate', 'Vehicle plate')}</div>
    <div><button type="button" data-back>Back</button><button type="submit">Review</button></div>
  </section>
</form>
<script>${WIZARD_SCRIPT}</script>`);
}

export function confirmationPage(values) {
  const rows = FIELDS.map(
    ({ key, label }) => `<tr><th>${escapeHtml(label)}</th><td data-testid="confirm-${key}">${escapeHtml(displayValue(key, values))}</td></tr>`,
  ).join('');
  return page('Confirm visitor registration', `
<p>Nothing has been submitted yet. Check the details below.</p>
<table data-testid="confirmation-table">${rows}</table>
<form method="post" action="/visitors/submit"><button type="submit" data-testid="submit-registration">Submit registration</button></form>
<p><a href="/visitors/new">Back to edit</a></p>`);
}

export function successPage(referenceCode) {
  return page('Registration submitted', `
<p>Reference code: <strong data-testid="reference-code">${escapeHtml(referenceCode)}</strong></p>`);
}
