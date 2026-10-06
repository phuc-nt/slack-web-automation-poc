// The daily report with fake Slack, Jira and model. The last test calls the real model
// on the sample day and is skipped when no API key is configured.

import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { writeDailyReport } from '../src/llm/write-daily-report.js';
import { createDailyReporter, dayWindow, msUntil, splitForSlack, withoutMentions } from '../src/report/daily-report-service.js';
import { defaultJql, fetchJiraIssues } from '../src/report/jira-issues.js';
import { fetchChannelMessages, transcript } from '../src/report/slack-channel-history.js';
import { createSlackHandlers } from '../src/slack/slack-handlers.js';
import { SAMPLE_CHANNELS, SAMPLE_DATE, SAMPLE_EXPECTATIONS, SAMPLE_ISSUES } from './fixtures/daily-report-sample.js';

const at = (h, m) => String(new Date(2026, 9, 6, h, m).getTime() / 1000);
const NOW = new Date(2026, 9, 6, 18, 0);

function fakeSlack() {
  const calls = [];
  const users = { U1: { profile: { display_name: 'Mai' } }, U2: { real_name: 'Le Van Nam', profile: {} } };
  return {
    calls,
    auth: { test: async () => ({ bot_id: 'B0SELF' }) },
    users: { info: async ({ user }) => { calls.push(`users.info ${user}`); return { user: users[user] }; } },
    conversations: {
      info: async () => ({ channel: { name: 'proj-dev' } }),
      // Slack returns newest first, in pages.
      history: async ({ cursor }) => (cursor
        ? { messages: [{ ts: at(9, 0), user: 'U1', text: 'VIS-101 done, <@U2> please review', reply_count: 1 }] }
        : {
          messages: [
            { ts: at(17, 0), bot_id: 'B0SELF', text: 'Daily report 2026-10-05' },
            { ts: at(12, 0), bot_id: 'B0SELF', subtype: 'bot_message', username: 'Lan (QA)', text: 'seeded test message' },
            { ts: at(11, 0), user: 'U2', text: '', files: [{ name: 'design.pdf' }] },
            { ts: at(10, 0), user: 'U2', subtype: 'channel_join', text: 'joined' },
          ],
          response_metadata: { next_cursor: 'page2' },
        }),
      replies: async () => ({ messages: [{ ts: at(9, 0), user: 'U1', text: 'parent' }, { ts: at(9, 30), user: 'U2', text: 'looks good' }] }),
    },
    chat: { postMessage: async (args) => { calls.push(args); } },
  };
}

test('channel history comes back oldest first, with names, replies and without noise', async () => {
  const client = fakeSlack();
  const [channel] = await fetchChannelMessages(client, ['C1'], dayWindow('2026-10-06', NOW));
  assert.deepEqual(channel.messages, [
    { time: '09:00', user: 'Mai', text: 'VIS-101 done, @Le Van Nam please review', replies: [{ time: '09:30', user: 'Le Van Nam', text: 'looks good' }] },
    { time: '11:00', user: 'Le Van Nam', text: '[file: design.pdf]' },
    { time: '12:00', user: 'Lan (QA)', text: 'seeded test message' },
  ]);
  assert.equal(client.calls.filter((c) => c === 'users.info U2').length, 1, 'each user is looked up once');
  assert.match(transcript([channel]), /^## #proj-dev\n\[09:00\] Mai: .*\n {4}> \[09:30\] Le Van Nam: looks good/);
});

test('jira issues are read page by page and reduced to the report fields', async () => {
  const requests = [];
  const issue = (key, extra = {}) => ({ key, fields: { summary: `Summary ${key}`, status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } }, updated: '2026-10-06T09:00:00.000+0700', ...extra } });
  const fetchImpl = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(requests.length === 1
      ? { issues: [issue('VIS-1', { duedate: '2026-10-08', assignee: { displayName: 'Mai' } })], nextPageToken: 'next' }
      : { issues: [issue('VIS-2', { status: { name: 'Done', statusCategory: { key: 'done' } } })] }));
  };
  const issues = await fetchJiraIssues({ baseUrl: 'https://example.atlassian.net/', email: 'a@example.com', apiToken: 't', jql: defaultJql('VIS'), fetchImpl });

  assert.equal(requests[0].url, 'https://example.atlassian.net/rest/api/3/search/jql');
  assert.equal(requests[0].init.headers.authorization, `Basic ${Buffer.from('a@example.com:t').toString('base64')}`);
  assert.match(requests[0].body.jql, /^project = "VIS" AND/);
  assert.equal(requests[1].body.nextPageToken, 'next');
  assert.deepEqual(issues.map((i) => [i.key, i.done, i.dueDate, i.assignee, i.updated]), [['VIS-1', false, '2026-10-08', 'Mai', '2026-10-06'], ['VIS-2', true, '', '', '2026-10-06']]);
  assert.equal(issues[0].url, 'https://example.atlassian.net/browse/VIS-1');
});

test('a Jira error status is reported, not swallowed', async () => {
  const fetchImpl = async () => new Response('no', { status: 401 });
  await assert.rejects(fetchJiraIssues({ baseUrl: 'https://x.atlassian.net', email: 'a', apiToken: 't', jql: 'x', fetchImpl }), /HTTP 401/);
});

function sampleReporter(overrides = {}) {
  const seen = [];
  const client = fakeSlack();
  const reporter = createDailyReporter({
    client,
    channels: ['C1'],
    postChannel: 'C0REPORT',
    fetchMessages: async () => SAMPLE_CHANNELS,
    fetchIssues: async () => SAMPLE_ISSUES,
    writeReport: async (input) => { seen.push(input); return '*Summary*\n• ok'; },
    now: () => NOW,
    ...overrides,
  });
  return { reporter, seen, client };
}

test('overdue and not-in-chat are decided in code before the model sees the issues', async () => {
  const { reporter, seen } = sampleReporter();
  const report = await reporter.build(SAMPLE_DATE);
  const flags = Object.fromEntries(seen[0].issues.map((i) => [i.key, [i.overdue, i.mentionedInChat]]));
  assert.deepEqual(flags, {
    'VIS-101': [false, true], 'VIS-102': [false, true], 'VIS-103': [false, true],
    'VIS-104': [true, false], 'VIS-105': [false, false], 'VIS-107': [false, true],
  });
  assert.deepEqual(report.stats, { messages: 10, issues: 6 });
  assert.match(report.text, /^\*Daily report 2026-10-06\*\n_10 messages from #proj-visitor-dev, #proj-visitor-qa; 6 Jira issues\./);
});

test('the report is still written when Jira cannot be read, and says so', async () => {
  const { reporter, seen } = sampleReporter({ fetchIssues: async () => { throw new Error('Jira request failed with HTTP 401'); } });
  const report = await reporter.build(SAMPLE_DATE);
  assert.deepEqual(seen[0].issues, []);
  assert.match(report.text, /Jira could not be read \(Jira request failed with HTTP 401\)/);
});

test('a day with nothing to report does not call the model', async () => {
  const { reporter, seen } = sampleReporter({ fetchMessages: async () => [{ id: 'C1', name: 'proj-dev', messages: [] }], fetchIssues: null });
  const report = await reporter.build(SAMPLE_DATE);
  assert.equal(seen.length, 0);
  assert.match(report.text, /No messages/);
});

test('posting goes to the report channel, in parts, and cannot ping anyone', async () => {
  const long = Array.from({ length: 6 }, (_, i) => `*Section ${i}*\n${'• point\n'.repeat(120)}`).join('\n\n');
  const { reporter, client } = sampleReporter({ writeReport: async () => `<!channel> <@U123> see <https://example.com|the doc>\n\n${long}` });
  await reporter.post(SAMPLE_DATE);
  const posts = client.calls.filter((c) => typeof c === 'object');
  assert.ok(posts.length > 1);
  assert.ok(posts.every((p) => p.channel === 'C0REPORT' && p.text.length <= 3500));
  const all = posts.map((p) => p.text).join('\n');
  assert.ok(!/<[@!]/.test(all));
  assert.match(all, /@channel U123 see <https:\/\/example\.com\|the doc>/);
});

test('helpers: day window, mention stripping, splitting, next run time', () => {
  const window = dayWindow('2026-10-06', NOW);
  assert.equal(window.from.getTime(), new Date(2026, 9, 6).getTime());
  assert.equal(window.to.getTime(), NOW.getTime(), 'a running day stops at now');
  assert.equal(dayWindow('2026-10-05', NOW).to.getTime(), new Date(2026, 9, 6).getTime());
  assert.throws(() => dayWindow('2026-10-07', NOW), /future/);
  assert.throws(() => dayWindow('2026-02-30', NOW), /not a real date/);
  assert.throws(() => dayWindow('yesterday', NOW), /YYYY-MM-DD/);
  assert.equal(withoutMentions('<!here> <!subteam^S1|@devs> <@U1|mai>'), '@here @subteam^S1 U1');
  assert.deepEqual(splitForSlack('a\n\nb', 10), ['a\n\nb']);
  assert.deepEqual(splitForSlack('aaaa\n\nbbbb\n\ncccc', 10), ['aaaa\n\nbbbb', 'cccc']);
  assert.equal(msUntil('18:30', NOW), 30 * 60 * 1000);
  assert.equal(msUntil('18:00', NOW), 24 * 60 * 60 * 1000, 'the same minute means tomorrow');
});

test('/daily-report posts through the reporter and only points the requester to the channel', async () => {
  const replies = [];
  const asked = [];
  const reporter = { post: async (date) => { asked.push(date); return { date: date || '2026-10-06' }; } };
  const handlers = createSlackHandlers({ service: {}, reporter, reportChannel: 'C0REPORT' });
  const args = (text) => ({ ack: async () => {}, command: { text }, respond: async (r) => replies.push(r) });

  await handlers.onReportCommand(args(''));
  await handlers.onReportCommand(args(' 2026-10-05 '));
  assert.deepEqual(asked, [undefined, '2026-10-05']);
  assert.ok(replies.every((r) => r.response_type === 'ephemeral'));
  assert.match(replies.at(-1).text, /2026-10-05 posted in <#C0REPORT>/);

  replies.length = 0;
  await createSlackHandlers({ service: {} }).onReportCommand(args(''));
  assert.match(replies[0].text, /not configured/);
});

const config = loadConfig();

test('real model: the sample day yields a report that carries the facts that matter', { skip: !config.openRouterApiKey && 'OPENROUTER_API_KEY not set' }, async () => {
  const { reporter } = sampleReporter({
    writeReport: (input) => writeDailyReport(input, { apiKey: config.openRouterApiKey, model: config.reportModel, language: config.reportLanguage }),
  });
  const { text } = await reporter.build(SAMPLE_DATE);
  const missing = SAMPLE_EXPECTATIONS.filter(({ pattern }) => !pattern.test(text)).map(({ name }) => name);
  assert.deepEqual(missing, [], text);
  for (const section of ['Summary', 'Done today', 'In progress', 'Blockers and risks', 'Decisions', 'Open questions', 'Jira check', 'Next steps']) {
    assert.ok(text.includes(`*${section}*`), `missing section ${section}\n${text}`);
  }
});
