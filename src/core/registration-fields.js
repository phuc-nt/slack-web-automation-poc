// The single definition of a visitor registration: field list, labels, input types and
// validation. Slack modal, LLM pre-fill, browser worker and mock portal all follow it.
//
// Every value is a string, so a registration can be compared, hashed and posted as-is:
//   list  -> names joined by "\n"         multi -> option values joined by ","
//   flag  -> "yes" or ""                  choice -> one option value

export const VISITOR_TYPES = [
  { value: 'guest', label: 'Guest' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'interview', label: 'Interview candidate' },
];

export const BUILDINGS = [
  { value: 'tower-a', label: 'Tower A', floors: 20 },
  { value: 'tower-b', label: 'Tower B', floors: 12 },
  { value: 'annex', label: 'Annex', floors: 3, closedOnWeekends: true },
];

export const EQUIPMENT = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'camera', label: 'Camera' },
  { value: 'tools', label: 'Tools' },
];

export const MAX_COMPANIONS = 4;
export const MAX_DAYS_AHEAD = 30;
export const OPENING_TIME = '07:00';
export const CLOSING_TIME = '19:00';
const COMPANY_REQUIRED_FOR = ['contractor', 'delivery'];

export const FIELDS = [
  { key: 'visitorType', label: 'Visitor type', type: 'choice', options: VISITOR_TYPES, required: true },
  { key: 'visitorName', label: 'Visitor name', type: 'text', required: true },
  { key: 'visitorCompany', label: 'Visitor company', type: 'text', hint: 'Required for contractors and deliveries' },
  { key: 'visitorPhone', label: 'Visitor phone', type: 'text' },
  { key: 'companions', label: 'Companions', type: 'list', hint: `One name per line, up to ${MAX_COMPANIONS}` },
  { key: 'visitDate', label: 'Visit date', type: 'date', required: true },
  { key: 'startTime', label: 'Start time', type: 'time', required: true },
  { key: 'endTime', label: 'End time', type: 'time', required: true },
  { key: 'building', label: 'Building', type: 'choice', options: BUILDINGS, required: true },
  { key: 'floor', label: 'Floor', type: 'number', required: true },
  { key: 'hostName', label: 'Host name', type: 'text', required: true },
  { key: 'purpose', label: 'Purpose', type: 'multiline', required: true },
  { key: 'equipment', label: 'Equipment brought in', type: 'multi', options: EQUIPMENT },
  { key: 'parking', label: 'Parking space needed', type: 'flag' },
  { key: 'vehiclePlate', label: 'Vehicle plate', type: 'text', hint: 'Required when a parking space is needed' },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^\+?[\d\s().-]+$/;

const pad = (n) => String(n).padStart(2, '0');
const asLocalDate = (value) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date, days) {
  const d = asLocalDate(date);
  d.setDate(d.getDate() + days);
  return localToday(d);
}

function isRealDate(value) {
  if (!DATE.test(value)) return false;
  return localToday(asLocalDate(value)) === value;
}

const isWeekend = (date) => [0, 6].includes(asLocalDate(date).getDay());
const building = (value) => BUILDINGS.find((b) => b.value === value);
const isPhone = (value) => PHONE.test(value) && value.replace(/\D/g, '').length >= 8 && value.replace(/\D/g, '').length <= 15;
const floorExists = (reg) => /^\d+$/.test(reg.floor) && Number(reg.floor) >= 1 && Number(reg.floor) <= (building(reg.building)?.floors ?? 99);

/** Callers hand in strings, arrays, numbers or booleans (Slack state, HTML form, LLM JSON). */
function parts(value, separator) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(separator);
  return [...new Set(items.map((item) => String(item ?? '').trim()).filter(Boolean))];
}

function normalizeValue({ type, options }, value) {
  switch (type) {
    case 'list':
      return parts(value, /[\n,;]/).join('\n');
    case 'multi': {
      const given = parts(value, ',');
      const known = options.map((o) => o.value).filter((v) => given.includes(v));
      return [...known, ...given.filter((v) => !known.includes(v))].join(',');
    }
    case 'flag':
      return value === true || ['yes', 'true', 'on'].includes(String(value ?? '').trim().toLowerCase()) ? 'yes' : '';
    case 'multiline':
      return String(value ?? '').replace(/\r\n?/g, '\n').trim();
    default:
      return ['string', 'number'].includes(typeof value) ? String(value).replace(/\s+/g, ' ').trim() : '';
  }
}

/** Bring every field to its canonical string form and drop unknown keys. */
export function normalize(input = {}) {
  return Object.fromEntries(FIELDS.map((field) => [field.key, normalizeValue(field, input[field.key])]));
}

/** What a person reads on the portal's confirmation screen and in Slack. */
export function displayValue(key, registration) {
  const field = FIELDS.find((f) => f.key === key);
  const value = registration[key] ?? '';
  const label = (v) => field.options.find((o) => o.value === v)?.label ?? v;
  switch (field.type) {
    case 'choice':
      return label(value);
    case 'multi':
      return value ? value.split(',').map(label).join(', ') : '';
    case 'list':
      return value.split('\n').filter(Boolean).join(', ');
    case 'flag':
      return value === 'yes' ? 'Yes' : 'No';
    default:
      return value;
  }
}

/** Returns { fieldKey: message } for every problem; empty object means valid. */
export function validate(input, { today = localToday() } = {}) {
  const reg = normalize(input);
  const errors = {};
  for (const { key, label, required } of FIELDS) {
    if (required && !reg[key]) errors[key] = `${label} is required`;
  }
  for (const { key, label, type, options } of FIELDS) {
    if (!reg[key] || !options) continue;
    const given = type === 'multi' ? reg[key].split(',') : [reg[key]];
    if (given.some((v) => !options.some((o) => o.value === v))) errors[key] = `${label} has an unknown option`;
  }

  if (!reg.visitorCompany && COMPANY_REQUIRED_FOR.includes(reg.visitorType)) {
    errors.visitorCompany = 'Visitor company is required for contractors and deliveries';
  }
  if (reg.visitorPhone && !isPhone(reg.visitorPhone)) errors.visitorPhone = 'Visitor phone must have 8 to 15 digits';
  if (reg.companions.split('\n').filter(Boolean).length > MAX_COMPANIONS) errors.companions = `At most ${MAX_COMPANIONS} companions`;

  if (reg.visitDate && !isRealDate(reg.visitDate)) errors.visitDate = 'Visit date must be a real date (YYYY-MM-DD)';
  else if (reg.visitDate && reg.visitDate < today) errors.visitDate = 'Visit date cannot be in the past';
  else if (reg.visitDate && reg.visitDate > addDays(today, MAX_DAYS_AHEAD)) errors.visitDate = `Visit date must be within ${MAX_DAYS_AHEAD} days`;
  else if (reg.visitDate && building(reg.building)?.closedOnWeekends && isWeekend(reg.visitDate)) {
    errors.visitDate = `${building(reg.building).label} is closed on weekends`;
  }

  if (reg.startTime && !TIME.test(reg.startTime)) errors.startTime = 'Start time must be HH:MM';
  else if (reg.startTime && reg.startTime < OPENING_TIME) errors.startTime = `The building opens at ${OPENING_TIME}`;
  if (reg.endTime && !TIME.test(reg.endTime)) errors.endTime = 'End time must be HH:MM';
  else if (reg.endTime && reg.endTime > CLOSING_TIME) errors.endTime = `The building closes at ${CLOSING_TIME}`;
  else if (!errors.startTime && reg.startTime && reg.endTime && reg.endTime <= reg.startTime) {
    errors.endTime = 'End time must be after start time';
  }

  if (reg.floor && !errors.building && !floorExists(reg)) {
    errors.floor = building(reg.building) ? `${building(reg.building).label} has floors 1 to ${building(reg.building).floors}` : 'Floor must be a number';
  }
  if (reg.parking && !reg.vehiclePlate) errors.vehiclePlate = 'Vehicle plate is required when a parking space is needed';
  if (!reg.parking && reg.vehiclePlate) errors.vehiclePlate = 'Tick "Parking space needed" or clear the vehicle plate';
  return errors;
}

/**
 * Keep only values that are individually well-formed. Used on LLM output, which is a
 * suggestion for the form and must never be trusted as a complete registration.
 */
export function keepWellFormed(input = {}) {
  const reg = normalize(input);
  for (const { key, type, options } of FIELDS) {
    if (type === 'choice' && !options.some((o) => o.value === reg[key])) reg[key] = '';
    if (type === 'multi') reg[key] = reg[key].split(',').filter((v) => options.some((o) => o.value === v)).join(',');
  }
  if (!isRealDate(reg.visitDate)) reg.visitDate = '';
  if (!TIME.test(reg.startTime)) reg.startTime = '';
  if (!TIME.test(reg.endTime)) reg.endTime = '';
  if (!floorExists(reg)) reg.floor = '';
  if (!isPhone(reg.visitorPhone)) reg.visitorPhone = '';
  return reg;
}
