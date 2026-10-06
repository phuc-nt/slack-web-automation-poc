// Posts an invented working day into a Slack channel, as test data for the daily report.
// Each message is posted by the bot under the name of a simulated person, which needs the
// chat:write.customize scope. The bot must be a member of the channel.
//
//   npm run seed -- C0123456789            (show what would be posted)
//   npm run seed -- C0123456789 --post     (post it)
//   npm run seed -- C0123456789 --rekey    (rewrite the issue keys in today's seeded messages)
//
// After `npm run seed:jira`, the issue numbers in the chat (101, 102 ...) become the real
// issue keys recorded in artifacts/jira-seed-keys.json.

import { readFile } from 'node:fs/promises';
import bolt from '@slack/bolt';
import { loadConfig } from '../src/config.js';
import { CHANNEL_DUMP } from '../test/fixtures/channel-dump.js';

const args = process.argv.slice(2);
const channel = args.find((a) => !a.startsWith('--'));
const config = loadConfig();
const key = config.jiraProjectKey || 'VIS';
if (!channel) {
  console.error('Usage: npm run seed -- <channel ID> [--post]');
  process.exit(1);
}

const realKeys = JSON.parse(await readFile('artifacts/jira-seed-keys.json', 'utf8').catch(() => '{}'));
const withKeys = (text) => text.replace(/\{KEY\}-(\d+)/g, (_, ref) => realKeys[ref] || `${key}-${ref}`);
const posts = CHANNEL_DUMP.map((m) => ({ ...m, text: withKeys(m.text), replies: (m.replies || []).map((r) => ({ ...r, text: withKeys(r.text) })) }));
const total = posts.reduce((n, m) => n + 1 + m.replies.length, 0);

if (!args.includes('--post') && !args.includes('--rekey')) {
  for (const m of posts) {
    console.log(`${m.user}: ${m.text}`);
    for (const r of m.replies) console.log(`    > ${r.user}: ${r.text}`);
  }
  console.log(`\n${total} messages for ${channel}. Nothing was posted; add --post to post.`);
  process.exit(0);
}

const { client } = new bolt.App({ token: config.slackBotToken, appToken: config.slackAppToken, socketMode: true });
// Slack allows about one post per second per channel.
const pause = () => new Promise((resolve) => setTimeout(resolve, 1100));
const send = async ({ user, text }, thread_ts) => {
  const sent = await client.chat.postMessage({ channel, text, username: user, thread_ts });
  await pause();
  return sent.ts;
};

// Messages seeded before the Jira issues existed carry the chat's own numbers.
async function rekey() {
  const { bot_id: ownBotId } = await client.auth.test();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const { messages } = await client.conversations.history({ channel, oldest: String(midnight.getTime() / 1000), limit: 200 });
  const all = [];
  for (const message of messages) {
    all.push(message);
    if (message.reply_count) {
      const thread = await client.conversations.replies({ channel, ts: message.ts, limit: 200 });
      all.push(...thread.messages.filter((m) => m.ts !== message.ts));
    }
  }
  let changed = 0;
  for (const message of all) {
    if (message.bot_id !== ownBotId || !message.username) continue;
    const text = message.text.replace(/\b[A-Z][A-Z0-9]*-(\d+)\b/g, (found, ref) => realKeys[ref] || found);
    if (text === message.text) continue;
    await client.chat.update({ channel, ts: message.ts, text });
    await pause();
    changed += 1;
  }
  console.log(`Rewrote the issue keys in ${changed} messages in ${channel}.`);
}

try {
  if (args.includes('--rekey')) {
    await rekey();
    process.exit(0);
  }
  for (const message of posts) {
    const ts = await send(message);
    for (const reply of message.replies) await send(reply, ts);
  }
  console.log(`Posted ${total} messages to ${channel}.`);
} catch (error) {
  console.error(`Stopped: ${error.data?.error || error.message}${error.data?.needed ? ` (needs scope ${error.data.needed})` : ''}`);
  process.exitCode = 1;
}
