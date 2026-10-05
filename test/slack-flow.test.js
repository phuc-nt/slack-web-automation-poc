// Drives the Slack handlers with the payload shapes Slack sends, using a fake Web API
// client. Covers everything except the network hop to Slack itself.

import assert from 'node:assert/strict';
import test from 'node:test';
import { createSlackHandlers } from '../src/slack/slack-handlers.js';
import { readModalValues, registrationModal } from '../src/slack/registration-modal.js';
import { FIELDS } from '../src/core/registration-fields.js';
import { sampleRegistration, startStack } from './test-helpers.js';

function fakeClient() {
  const calls = [];
  const record = (name, result = {}) => async (args) => {
    calls.push({ name, args });
    return result;
  };
  return {
    calls,
    views: { open: record('views.open', { view: { id: 'V1' } }), update: record('views.update') },
    conversations: { open: record('conversations.open', { channel: { id: 'D1' } }) },
    chat: { postMessage: record('chat.postMessage'), update: record('chat.update') },
    files: { uploadV2: record('files.uploadV2') },
  };
}

/** Builds view.state.values the way Slack reports each input type. */
function submittedView(registration) {
  const values = {};
  for (const { key, type, options } of FIELDS) {
    const value = registration[key];
    const picked = (value || '').split(',').filter(Boolean).map((v) => ({ value: v }));
    const state = {
      date: { selected_date: value || null },
      time: { selected_time: value || null },
      choice: { selected_option: value ? { value } : null },
      multi: { selected_options: picked },
      flag: { selected_options: picked },
    }[type] ?? { value: value || null };
    values[key] = { value: { type: options ? 'select' : 'input', ...state } };
  }
  return { state: { values } };
}

const acker = () => {
  const acks = [];
  return { acks, ack: async (payload) => acks.push(payload) };
};

test('slash command with text pre-fills the modal from the parser', async () => {
  const client = fakeClient();
  const handlers = createSlackHandlers({ service: {}, parseRequest: async () => ({ visitorName: 'Tran Thi Mai', building: 'tower-a' }) });
  await handlers.onCommand({ ...acker(), command: { text: 'register Mai at tower A', trigger_id: 'T1' }, client });

  const update = client.calls.find((c) => c.name === 'views.update');
  assert.equal(update.args.view_id, 'V1');
  const blocks = update.args.view.blocks;
  assert.equal(blocks.find((b) => b.block_id === 'visitorName').element.initial_value, 'Tran Thi Mai');
  assert.equal(blocks.find((b) => b.block_id === 'building').element.initial_option.value, 'tower-a');
});

test('every field type is pre-filled and read back from the modal unchanged', () => {
  const registration = sampleRegistration();
  const element = (key) => registrationModal(registration).blocks.find((b) => b.block_id === key).element;
  assert.equal(element('visitorType').type, 'radio_buttons');
  assert.equal(element('visitorType').initial_option.value, 'contractor');
  assert.deepEqual(element('equipment').initial_options.map((o) => o.value), ['laptop', 'tools']);
  assert.equal(element('parking').initial_options.length, 1);
  assert.equal(element('floor').initial_value, '12');
  assert.equal(registrationModal().blocks.find((b) => b.block_id === 'equipment').element.initial_options, undefined);
  assert.deepEqual(readModalValues(submittedView(registration)), registration);
});

test('slash command without text opens an empty modal', async () => {
  const client = fakeClient();
  await createSlackHandlers({ service: {} }).onCommand({ ...acker(), command: { text: '', trigger_id: 'T1' }, client });
  assert.deepEqual(client.calls[0].args.view, registrationModal());
});

test('invalid modal input is returned to Slack as field errors', async () => {
  const client = fakeClient();
  const { acks, ack } = acker();
  await createSlackHandlers({ service: {} }).onModalSubmit({
    ack, client, body: { user: { id: 'U1' } }, view: submittedView(sampleRegistration({ hostName: '', endTime: '13:00' })),
  });
  assert.equal(acks[0].response_action, 'errors');
  assert.deepEqual(Object.keys(acks[0].errors).sort(), ['endTime', 'hostName']);
  assert.equal(client.calls.length, 0);
});

test('modal submit fills the portal, approval button submits it', async () => {
  const stack = await startStack();
  try {
    const client = fakeClient();
    const channelReplies = [];
    const replyInChannel = async (url, text) => channelReplies.push({ url, text });
    const handlers = createSlackHandlers({ service: stack.service, replyInChannel });
    const registration = sampleRegistration();
    const view = { ...submittedView(registration), private_metadata: JSON.stringify({ responseUrl: 'https://hooks.example/reply' }) };
    await handlers.onModalSubmit({ ...acker(), client, body: { user: { id: 'U1' } }, view });

    // The channel where the command was typed gets a pointer, never the visitor details.
    assert.equal(channelReplies.length, 1);
    assert.equal(channelReplies[0].url, 'https://hooks.example/reply');
    assert.ok(!channelReplies[0].text.includes(registration.visitorName));

    const upload = client.calls.find((c) => c.name === 'files.uploadV2');
    assert.equal(upload.args.channel_id, 'D1');
    assert.ok(upload.args.file.length > 1000);
    const approval = client.calls.filter((c) => c.name === 'chat.postMessage').at(-1);
    const button = approval.args.blocks.at(-1).elements.find((e) => e.action_id === 'approve_registration');
    assert.equal(stack.portal.submissions.length, 0);

    // A different user pressing the button must not submit.
    const replies = [];
    const respond = async (message) => replies.push(message);
    await handlers.onApprove({ ...acker(), respond, body: { user: { id: 'U2' } }, action: { value: button.value } });
    assert.equal(stack.portal.submissions.length, 0);
    assert.equal(replies[0].replace_original, false);

    await handlers.onApprove({ ...acker(), respond, body: { user: { id: 'U1' } }, action: { value: button.value } });
    assert.equal(stack.portal.submissions.length, 1);
    assert.deepEqual({ ...stack.portal.submissions[0], referenceCode: undefined }, { ...registration, referenceCode: undefined });
    assert.match(replies[1].text, new RegExp(stack.portal.submissions[0].referenceCode));
  } finally {
    await stack.stop();
  }
});

/** Submits the modal and returns the job id carried by the approval buttons. */
async function requestApproval(handlers, client, view) {
  await handlers.onModalSubmit({ ...acker(), client, body: { user: { id: 'U1' } }, view });
  return client.calls.filter((c) => c.name === 'chat.postMessage').at(-1).args.blocks.at(-1).elements[0].value;
}

const editClick = (jobId, user, respond) => ({
  ...acker(), respond, body: { user: { id: user }, trigger_id: 'T2', channel: { id: 'D1' }, message: { ts: '111.222' } }, action: { value: jobId },
});

test('editing a filled form replaces it: the old one can no longer be submitted', async () => {
  const stack = await startStack();
  try {
    const client = fakeClient();
    const handlers = createSlackHandlers({ service: stack.service });
    const registration = sampleRegistration();
    const firstJob = await requestApproval(handlers, client, submittedView(registration));

    // Someone else cannot open the requester's data.
    const replies = [];
    const respond = async (message) => replies.push(message);
    await handlers.onEdit({ ...editClick(firstJob, 'U2', respond), client });
    assert.equal(client.calls.filter((c) => c.name === 'views.open').length, 0);
    assert.match(replies[0].text, /Only the person/);

    await handlers.onEdit({ ...editClick(firstJob, 'U1', respond), client });
    const modal = client.calls.find((c) => c.name === 'views.open').args.view;
    assert.equal(modal.blocks.find((b) => b.block_id === 'visitorName').element.initial_value, registration.visitorName);
    assert.equal(modal.blocks.find((b) => b.block_id === 'endTime').element.initial_time, '15:30');

    const edited = { ...registration, endTime: '16:45', equipment: 'camera' };
    const secondJob = await requestApproval(handlers, client, { ...submittedView(edited), private_metadata: modal.private_metadata });
    assert.notEqual(secondJob, firstJob);
    assert.deepEqual(client.calls.find((c) => c.name === 'chat.update').args, {
      channel: 'D1', ts: '111.222', text: 'Replaced by an edited request. Nothing was submitted from this one.', blocks: [],
    });

    await handlers.onApprove({ ...acker(), respond, body: { user: { id: 'U1' } }, action: { value: firstJob } });
    assert.equal(stack.portal.submissions.length, 0, 'the replaced form must not be submittable');
    await handlers.onApprove({ ...acker(), respond, body: { user: { id: 'U1' } }, action: { value: secondJob } });
    assert.equal(stack.portal.submissions.length, 1);
    assert.equal(stack.portal.submissions[0].endTime, '16:45');
    assert.equal(stack.portal.submissions[0].equipment, 'camera');
  } finally {
    await stack.stop();
  }
});

test('an edit saved after the request was already submitted changes nothing', async () => {
  const stack = await startStack();
  try {
    const client = fakeClient();
    const handlers = createSlackHandlers({ service: stack.service });
    const registration = sampleRegistration();
    const jobId = await requestApproval(handlers, client, submittedView(registration));
    const respond = async () => {};
    await handlers.onEdit({ ...editClick(jobId, 'U1', respond), client });
    const modal = client.calls.find((c) => c.name === 'views.open').args.view;
    await handlers.onApprove({ ...acker(), respond, body: { user: { id: 'U1' } }, action: { value: jobId } });

    const edited = { ...registration, purpose: 'Changed my mind' };
    await handlers.onModalSubmit({ ...acker(), client, body: { user: { id: 'U1' } }, view: { ...submittedView(edited), private_metadata: modal.private_metadata } });
    assert.match(client.calls.at(-1).args.text, /not applied/);
    assert.equal(client.calls.filter((c) => c.name === 'chat.update').length, 0);
    assert.equal(stack.portal.submissions.length, 1);
    assert.equal(stack.portal.submissions[0].purpose, registration.purpose);

    // The button on an already handled request says so instead of opening the form.
    const replies = [];
    await handlers.onEdit({ ...editClick(jobId, 'U1', async (m) => replies.push(m)), client });
    assert.match(replies[0].text, /no longer waiting/);
  } finally {
    await stack.stop();
  }
});
