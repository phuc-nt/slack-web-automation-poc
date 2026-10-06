// Builds the daily report (channel messages + Jira issues -> LLM) and posts it to one
// fixed channel. The report always goes to that channel, never to whoever asked for it,
// so asking cannot be used to read channels the asker is not in.

import { localToday } from '../core/registration-fields.js';
import { silentLogger } from '../core/logger.js';
import { fetchChannelMessages, transcript } from './slack-channel-history.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CHAT_CHARS = 120_000;
const MAX_MESSAGE_CHARS = 3500;

/** Local midnight to local midnight, cut off at `now` for a day that is still running. */
export function dayWindow(date, now = new Date()) {
  if (!DATE.test(date)) throw new Error('The date must be YYYY-MM-DD');
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(y, m - 1, d);
  if (localToday(from) !== date) throw new Error(`${date} is not a real date`);
  if (from > now) throw new Error(`${date} is in the future`);
  const end = new Date(y, m - 1, d + 1);
  return { from, to: end < now ? end : now };
}

/** The model's text is posted by the bot, so a message quoted from chat must not ping anyone. */
export function withoutMentions(text) {
  return text.replace(/<([@!])([^>|]*)(?:\|[^>]*)?>/g, (_, kind, target) => (kind === '!' ? `@${target}` : target));
}

export function splitForSlack(text, limit = MAX_MESSAGE_CHARS) {
  const parts = [];
  let current = '';
  for (const paragraph of text.split(/\n{2,}/)) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) parts.push(current);
    current = paragraph;
    while (current.length > limit) {
      const cut = current.lastIndexOf('\n', limit);
      const at = cut > 0 ? cut : limit;
      parts.push(current.slice(0, at));
      current = current.slice(at).trimStart();
    }
  }
  if (current) parts.push(current);
  return parts;
}

export function createDailyReporter({
  client, channels, postChannel, writeReport, fetchIssues = null, fetchMessages = fetchChannelMessages, logger = silentLogger, now = () => new Date(),
}) {
  async function build(date = localToday(now())) {
    const window = dayWindow(date, now());
    const history = await fetchMessages(client, channels, window);
    const messageCount = history.reduce((sum, c) => sum + c.messages.length + c.messages.reduce((n, m) => n + (m.replies?.length || 0), 0), 0);
    let chat = transcript(history);
    if (chat.length > MAX_CHAT_CHARS) chat = `${chat.slice(0, MAX_CHAT_CHARS)}\n(cut: the day's chat was longer than the report reads)`;

    let issues = [];
    let jiraNote = fetchIssues ? '' : 'Jira is not configured';
    if (fetchIssues) {
      try {
        issues = (await fetchIssues()).map((issue) => ({
          ...issue,
          overdue: Boolean(issue.dueDate) && issue.dueDate < date && !issue.done,
          mentionedInChat: new RegExp(`\\b${issue.key}\\b`).test(chat),
        }));
      } catch (error) {
        logger.warn('jira_read_failed', { message: error.message });
        jiraNote = `Jira could not be read (${error.message})`;
      }
    }

    const stats = { messages: messageCount, issues: issues.length };
    if (!messageCount && !issues.length) {
      return { date, stats, text: `*Daily report ${date}*\nNo messages in the project channels and no Jira issues to report.` };
    }
    const body = await writeReport({ date, chat, issues, jiraNote });
    const sources = `_${messageCount} messages from ${history.map((c) => `#${c.name}`).join(', ')}; ${jiraNote || `${issues.length} Jira issues`}. Written by an LLM: check before relying on it._`;
    return { date, stats, text: `*Daily report ${date}*\n${sources}\n\n${withoutMentions(body.trim())}` };
  }

  async function post(date) {
    const report = await build(date);
    for (const text of splitForSlack(report.text)) {
      await client.chat.postMessage({ channel: postChannel, text, unfurl_links: false, unfurl_media: false });
    }
    logger.info('daily_report_posted', { date: report.date, channel: postChannel, ...report.stats });
    return report;
  }

  return { build, post };
}

/** Milliseconds from `now` to the next local HH:MM. */
export function msUntil(time, now = new Date()) {
  const [h, m] = time.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

/** Runs `task` every day at local HH:MM while the process lives. Returns a stop function. */
export function scheduleDaily(time, task, { logger = silentLogger } = {}) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('REPORT_TIME must be HH:MM');
  let timer;
  const arm = () => {
    timer = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        logger.error('scheduled_report_failed', { message: error.message });
      }
      arm();
    }, msUntil(time));
  };
  arm();
  return () => clearTimeout(timer);
}
