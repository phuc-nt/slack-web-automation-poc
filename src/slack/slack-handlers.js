// Slack listeners. Each handler takes Bolt's argument object, which keeps them callable
// from tests with a fake client.

import { validate } from '../core/registration-fields.js';
import { silentLogger } from '../core/logger.js';
import { approvalBlocks, loadingModal, MODAL_CALLBACK_ID, readModalContext, readModalValues, registrationModal } from './registration-modal.js';

/** Answers in the channel where the slash command was typed, visible to the requester only. */
async function postEphemeralReply(responseUrl, text) {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response_type: 'ephemeral', text }),
  });
}

export function createSlackHandlers({ service, parseRequest = null, reporter = null, reportChannel = '', logger = silentLogger, replyInChannel = postEphemeralReply }) {
  /** `/visitor` opens the form; `/visitor <free text>` pre-fills it with the LLM's reading. */
  async function onCommand({ ack, command, client }) {
    await ack();
    const text = (command.text || '').trim();
    const context = { responseUrl: command.response_url };
    if (!text || !parseRequest) {
      await client.views.open({ trigger_id: command.trigger_id, view: registrationModal({}, '', context) });
      return;
    }
    // trigger_id expires in 3 seconds, so open first and fill in after the LLM answers.
    const opened = await client.views.open({ trigger_id: command.trigger_id, view: loadingModal() });
    let prefill = {};
    let note = 'Pre-filled from your message. Check every field before continuing.';
    try {
      prefill = await parseRequest(text);
    } catch (error) {
      logger.warn('prefill_failed', { message: error.message });
      note = 'Could not read your message automatically. Please fill in the form.';
    }
    await client.views.update({ view_id: opened.view.id, view: registrationModal(prefill, note, context) });
  }

  async function onShortcut({ ack, shortcut, client }) {
    await ack();
    await client.views.open({ trigger_id: shortcut.trigger_id, view: registrationModal() });
  }

  async function onModalSubmit({ ack, body, view, client }) {
    const registration = readModalValues(view);
    const errors = validate(registration);
    if (Object.keys(errors).length) {
      await ack({ response_action: 'errors', errors });
      return;
    }
    await ack();

    const user = body.user.id;
    const { responseUrl, replaces } = readModalContext(view);
    const { channel } = await client.conversations.open({ users: user });
    if (replaces) {
      // An edit replaces the waiting request: close its browser first, so the old
      // confirmation screen can no longer be submitted. If it is already gone
      // (submitted, cancelled, expired), stop here rather than create a second one.
      try {
        await service.cancel(replaces.jobId, user);
      } catch (error) {
        await client.chat.postMessage({ channel: channel.id, text: `Your changes were not applied: ${error.message}` });
        return;
      }
      await client.chat.update({ channel: replaces.channel, ts: replaces.ts, text: 'Replaced by an edited request. Nothing was submitted from this one.', blocks: [] });
      await client.chat.postMessage({ channel: channel.id, text: 'Changes received. Filling the portal form again…' });
    } else {
      await client.chat.postMessage({ channel: channel.id, text: 'Request received. Filling the portal form now…' });
    }
    // Visitor details and the screenshot stay in the direct message; the channel only gets a pointer.
    if (responseUrl) {
      await replyInChannel(responseUrl, `Request received. I sent the details to our direct message: <#${channel.id}>`)
        .catch((error) => logger.warn('channel_reply_failed', { message: error.message }));
    }
    try {
      const job = await service.prepare({ requestedBy: user, registration });
      await client.files.uploadV2({
        channel_id: channel.id,
        file: job.screenshot,
        filename: 'confirmation-screen.png',
        title: 'Portal confirmation screen',
      });
      await client.chat.postMessage({
        channel: channel.id,
        text: 'The portal form is filled and waiting for your approval.',
        blocks: approvalBlocks(job.jobId, job.registration),
      });
      logger.info('approval_requested', { jobId: job.jobId, channel: channel.id });
    } catch (error) {
      logger.error('prepare_failed', { code: error.code, message: error.message });
      await client.chat.postMessage({ channel: channel.id, text: `Could not fill the form: ${error.message}` });
    }
  }

  async function onApprove({ ack, body, action, respond }) {
    await ack();
    try {
      const { referenceCode } = await service.approve(action.value, body.user.id);
      await respond({ replace_original: true, text: `Registration submitted. Reference code: *${referenceCode}*` });
    } catch (error) {
      await respond({ replace_original: false, text: `Could not submit: ${error.message}` });
    }
  }

  /** Reopens the form with the waiting request's data; submitting it replaces that request. */
  async function onEdit({ ack, body, action, client, respond }) {
    await ack();
    try {
      const registration = service.view(action.value, body.user.id);
      const replaces = { jobId: action.value, channel: body.channel.id, ts: body.message.ts };
      const note = 'Editing a filled form. Saving closes the current one and fills the portal again.';
      await client.views.open({ trigger_id: body.trigger_id, view: registrationModal(registration, note, { replaces }) });
    } catch (error) {
      await respond({ replace_original: false, text: `Could not edit: ${error.message}` });
    }
  }

  async function onCancel({ ack, body, action, respond }) {
    await ack();
    try {
      await service.cancel(action.value, body.user.id);
      await respond({ replace_original: true, text: 'Request cancelled. Nothing was submitted.' });
    } catch (error) {
      await respond({ replace_original: false, text: `Could not cancel: ${error.message}` });
    }
  }

  /** `/daily-report [YYYY-MM-DD]`: the report goes to the report channel; the requester only gets a pointer. */
  async function onReportCommand({ ack, command, respond }) {
    await ack();
    const reply = (text) => respond({ response_type: 'ephemeral', text });
    if (!reporter) {
      await reply('The daily report is not configured on this app.');
      return;
    }
    const date = (command.text || '').trim() || undefined;
    await reply(`Writing the daily report${date ? ` for ${date}` : ''}…`);
    try {
      const report = await reporter.post(date);
      await reply(`Daily report for ${report.date} posted in <#${reportChannel}>.`);
    } catch (error) {
      logger.error('daily_report_failed', { message: error.message });
      await reply(`Could not write the daily report: ${error.message}`);
    }
  }

  return { onCommand, onShortcut, onModalSubmit, onApprove, onEdit, onCancel, onReportCommand };
}

export function registerSlackHandlers(app, handlers) {
  app.command('/visitor', handlers.onCommand);
  app.command('/daily-report', handlers.onReportCommand);
  app.shortcut('register_visitor', handlers.onShortcut);
  app.view(MODAL_CALLBACK_ID, handlers.onModalSubmit);
  app.action('approve_registration', handlers.onApprove);
  app.action('edit_registration', handlers.onEdit);
  app.action('cancel_registration', handlers.onCancel);
}
