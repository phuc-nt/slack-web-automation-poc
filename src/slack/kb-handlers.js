// Slack listeners of the knowledge base chatbot: `/ask <question>`, a mention in a channel,
// or a direct message. Each takes Bolt's argument object, so tests can call them with fakes.

import { silentLogger } from '../core/logger.js';

/** Allows `limit` questions per user in each window, so one person cannot run up the bill. */
export function createRateLimiter({ limit = 6, windowMs = 60_000, now = Date.now } = {}) {
  const seen = new Map();
  return (user) => {
    const recent = (seen.get(user) || []).filter((time) => now() - time < windowMs);
    if (recent.length >= limit) {
      seen.set(user, recent);
      return false;
    }
    seen.set(user, [...recent, now()]);
    return true;
  };
}

export function createKbHandlers({ ask, logger = silentLogger, allow = createRateLimiter() }) {
  // Slack can deliver one message more than once (a retry, or an edit of the message); answer it once.
  const handled = new Set();
  function firstTime(via, event) {
    const key = `${event.channel}:${event.ts}`;
    if (handled.has(key)) {
      logger.warn('kb_duplicate_event', { via, channel: event.channel, ts: event.ts, edited: Boolean(event.edited) });
      return false;
    }
    handled.add(key);
    if (handled.size > 500) handled.delete(handled.values().next().value);
    return true;
  }

  async function reply(via, user, question, send) {
    if (!allow(user)) {
      logger.warn('kb_rate_limited', { via, user });
      await send('You are asking faster than I can look things up. Please try again in a minute.');
      return;
    }
    const started = Date.now();
    logger.info('kb_question', { via, user, question });
    try {
      const { text, sources } = await ask(question);
      logger.info('kb_answered', { via, user, ms: Date.now() - started, sources: sources.map((source) => source.title), answer: text });
      await send(text);
    } catch (error) {
      logger.error('kb_answer_failed', { via, user, ms: Date.now() - started, message: error.message });
      await send('I could not reach the knowledge base just now. Please try again in a moment.');
    }
  }

  /** `/ask <question>`: the answer is visible to the person who asked only. */
  async function onAskCommand({ ack, command, respond }) {
    await ack();
    const send = (text) => respond({ response_type: 'ephemeral', text });
    if ((command.text || '').trim()) await send('Looking that up…');
    await reply('command', command.user_id, command.text || '', send);
  }

  /** `@bot <question>` in a channel: the answer goes in a thread under the question. */
  async function onMention({ event, client }) {
    if (!firstTime('mention', event)) return;
    const question = (event.text || '').replace(/<@[^>]+>/g, ' ').trim();
    const send = (text) => client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts || event.ts, text });
    await reply('mention', event.user, question, send);
  }

  /** A direct message to the bot. Edits, joins and the bot's own messages carry a subtype or bot_id. */
  async function onDirectMessage({ event, client }) {
    if (event.channel_type !== 'im' || event.subtype || event.bot_id || !event.user) return;
    if (!firstTime('direct_message', event)) return;
    const send = (text) => client.chat.postMessage({ channel: event.channel, thread_ts: event.thread_ts, text });
    await reply('direct_message', event.user, event.text || '', send);
  }

  return { onAskCommand, onMention, onDirectMessage };
}

export function registerKbHandlers(app, handlers) {
  app.command('/ask', handlers.onAskCommand);
  app.event('app_mention', handlers.onMention);
  app.event('message', handlers.onDirectMessage);
}
