// Reads the messages of the project channels for one time window, with thread replies
// and display names, in the order they were written. The bot must be a member of each channel.

const SKIPPED_SUBTYPES = new Set([
  'channel_join', 'channel_leave', 'channel_topic', 'channel_purpose', 'channel_name', 'channel_archive',
  'bot_add', 'bot_remove', 'pinned_item',
]);

const pad = (n) => String(n).padStart(2, '0');
const asSeconds = (date) => (date.getTime() / 1000).toFixed(6);

function clock(ts) {
  const d = new Date(Number(ts) * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function allPages(call, args, key) {
  const items = [];
  let cursor;
  do {
    const page = await call({ ...args, limit: 200, cursor });
    items.push(...(page[key] || []));
    cursor = page.response_metadata?.next_cursor;
  } while (cursor);
  return items;
}

export async function fetchChannelMessages(client, channelIds, { from, to }) {
  // The bot's own posts are earlier reports; reading them back would summarise a summary.
  // Its posts under a custom username are simulated people (`npm run seed`) and are kept.
  const { bot_id: ownBotId } = await client.auth.test();
  const names = new Map();
  const userName = (id) => {
    if (!names.has(id)) {
      names.set(id, client.users.info({ user: id })
        .then(({ user }) => user.profile?.display_name || user.real_name || user.name || id)
        .catch(() => id));
    }
    return names.get(id);
  };
  const withNames = async (text) => {
    const ids = [...new Set([...text.matchAll(/<@([A-Z0-9]+)>/g)].map((m) => m[1]))];
    for (const id of ids) text = text.replaceAll(`<@${id}>`, `@${await userName(id)}`);
    return text;
  };
  const kept = (message) => !SKIPPED_SUBTYPES.has(message.subtype) && !(ownBotId && message.bot_id === ownBotId && !message.username);
  const simplify = async (message) => {
    const files = (message.files || []).map((f) => `[file: ${f.name || f.title || 'unnamed'}]`);
    return {
      time: clock(message.ts),
      user: message.username || (message.user ? await userName(message.user) : 'bot'),
      text: [await withNames(message.text || ''), ...files].filter(Boolean).join(' '),
    };
  };

  const channels = [];
  for (const channel of channelIds) {
    const info = await client.conversations.info({ channel });
    const window = { channel, oldest: asSeconds(from), latest: asSeconds(to) };
    const history = (await allPages(client.conversations.history, window, 'messages')).filter(kept).reverse();
    const messages = [];
    for (const message of history) {
      const entry = await simplify(message);
      if (message.reply_count) {
        const thread = await allPages(client.conversations.replies, { channel, ts: message.ts }, 'messages');
        entry.replies = await Promise.all(thread.filter((m) => m.ts !== message.ts && kept(m)).map(simplify));
      }
      messages.push(entry);
    }
    channels.push({ id: channel, name: info.channel?.name || channel, messages });
  }
  return channels;
}

/** The plain-text form the model reads. */
export function transcript(channels) {
  return channels.map(({ name, messages }) => {
    const lines = messages.flatMap((m) => [
      `[${m.time}] ${m.user}: ${m.text}`,
      ...(m.replies || []).map((r) => `    > [${r.time}] ${r.user}: ${r.text}`),
    ]);
    return `## #${name}\n${lines.join('\n') || '(no messages)'}`;
  }).join('\n\n');
}
