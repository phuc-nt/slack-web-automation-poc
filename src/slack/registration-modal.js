// Builds the Slack modal and reads it back. block_id of every input is the field key,
// so validation errors can be returned to Slack keyed the same way.

import { displayValue, FIELDS } from '../core/registration-fields.js';

export const MODAL_CALLBACK_ID = 'visitor_registration';
const plain = (text) => ({ type: 'plain_text', text });

const option = (o) => ({ text: plain(o.label), value: o.value });
const FLAG_OPTION = { text: plain('Yes'), value: 'yes' };

/** One Slack input element per field type, with the pre-filled value when there is one. */
function element({ type, options }, value) {
  const base = { action_id: 'value' };
  const chosen = (value || '').split(',').filter(Boolean);
  switch (type) {
    case 'date':
      return { ...base, type: 'datepicker', ...(value && { initial_date: value }) };
    case 'time':
      return { ...base, type: 'timepicker', ...(value && { initial_time: value }) };
    case 'choice':
      return {
        ...base,
        type: options.length <= 4 && options[0].floors === undefined ? 'radio_buttons' : 'static_select',
        options: options.map(option),
        ...(value && { initial_option: option(options.find((o) => o.value === value)) }),
      };
    case 'multi':
      return {
        ...base,
        type: 'checkboxes',
        options: options.map(option),
        ...(chosen.length && { initial_options: options.filter((o) => chosen.includes(o.value)).map(option) }),
      };
    case 'flag':
      return { ...base, type: 'checkboxes', options: [FLAG_OPTION], ...(value && { initial_options: [FLAG_OPTION] }) };
    case 'number':
      return { ...base, type: 'number_input', is_decimal_allowed: false, min_value: '1', ...(value && { initial_value: value }) };
    default:
      return { ...base, type: 'plain_text_input', multiline: type !== 'text', ...(value && { initial_value: value }) };
  }
}

/**
 * `context` rides along in the modal and comes back on submit:
 *   responseUrl - the slash command's reply address, to answer in the same channel
 *   replaces    - { jobId, channel, ts } of the waiting request this modal edits
 */
export function registrationModal(prefill = {}, note = '', context = {}) {
  const metadata = JSON.stringify(context);
  return {
    type: 'modal',
    callback_id: MODAL_CALLBACK_ID,
    ...(metadata !== '{}' && { private_metadata: metadata }),
    title: plain('Visitor registration'),
    submit: plain('Fill the form'),
    close: plain('Cancel'),
    blocks: [
      ...(note ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: note }] }] : []),
      ...FIELDS.map((field) => ({
        type: 'input',
        block_id: field.key,
        optional: !field.required,
        label: plain(field.label),
        ...(field.hint && { hint: plain(field.hint) }),
        element: element(field, prefill[field.key]),
      })),
    ],
  };
}

export function loadingModal() {
  return {
    type: 'modal',
    title: plain('Visitor registration'),
    close: plain('Cancel'),
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Reading your request…' } }],
  };
}

export function readModalContext(view) {
  return view.private_metadata ? JSON.parse(view.private_metadata) : {};
}

export function readModalValues(view) {
  const out = {};
  for (const { key } of FIELDS) {
    const state = view.state.values[key]?.value ?? {};
    out[key] = state.value ?? state.selected_date ?? state.selected_time ?? state.selected_option?.value
      ?? state.selected_options?.map((o) => o.value).join(',') ?? '';
  }
  return out;
}

export function summaryText(registration) {
  return FIELDS.map(({ key, label }) => `*${label}:* ${displayValue(key, registration) || '—'}`).join('\n');
}

export function approvalBlocks(jobId, registration) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `The portal form is filled and *not submitted yet*. Check the screenshot in this conversation.\n\n${summaryText(registration)}` } },
    {
      type: 'actions',
      elements: [
        { type: 'button', style: 'primary', action_id: 'approve_registration', text: plain('Submit registration'), value: jobId },
        { type: 'button', action_id: 'edit_registration', text: plain('Edit'), value: jobId },
        { type: 'button', style: 'danger', action_id: 'cancel_registration', text: plain('Cancel'), value: jobId },
      ],
    },
  ];
}
