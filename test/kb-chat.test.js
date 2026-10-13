// Knowledge base chatbot: the MCP client against a local stand-in for the gateway, the
// answer writer with a fake LLM, and the Slack listeners with a fake Web API client.

import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { answerQuestion, MAX_QUESTION_LENGTH } from '../src/kb/answer-question.js';
import { createKnowledgeBaseClient, parseRetrieveResult, signingFetch } from '../src/kb/gateway-mcp-client.js';
import { createKbHandlers, createRateLimiter } from '../src/slack/kb-handlers.js';

const CREDENTIALS = { accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'test-only-secret' };

const RESULTS = {
  retrievalResults: [
    { content: { type: 'TEXT', text: 'Lock L9 has a 24-month warranty.' }, location: { type: 'SHAREPOINT', sharePointLocation: { url: 'https://example.sharepoint.com/sites/kb/Warranty%20policy.docx' } }, score: 0.9 },
    { content: { type: 'TEXT', text: 'Batteries are covered for 6 months.' }, location: { type: 'SHAREPOINT', sharePointLocation: { url: 'https://example.sharepoint.com/sites/kb/Warranty%20policy.docx' } }, score: 0.7 },
    { content: { type: 'TEXT', text: 'Error E401 means low battery.' }, location: { type: 'CONFLUENCE', confluenceLocation: { url: 'https://example.atlassian.net/wiki/spaces/KB/pages/1/Error+codes' } }, metadata: { title: 'Error codes' }, score: 0.5 },
  ],
};

/** Speaks just enough MCP over HTTP: initialize, tools/list and tools/call. */
async function startFakeGateway() {
  const requests = [];
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') return res.writeHead(405).end();
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const message = JSON.parse(body);
      requests.push({ headers: req.headers, message });
      if (message.id === undefined) return res.writeHead(202).end();
      const result = {
        initialize: { protocolVersion: message.params?.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'fake-gateway', version: '1' } },
        'tools/list': { tools: [{ name: 'managed-kb___Retrieve', inputSchema: { type: 'object' } }] },
        'tools/call': { content: [{ type: 'text', text: JSON.stringify(RESULTS) }], isError: false },
      }[message.method];
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { requests, url: `http://127.0.0.1:${server.address().port}/mcp`, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('the MCP client signs its requests and returns the passages of the Retrieve tool', async () => {
  const gateway = await startFakeGateway();
  const client = createKnowledgeBaseClient({ url: gateway.url, region: 'eu-west-1', fetchImpl: signingFetch({ region: 'eu-west-1', credentials: CREDENTIALS }) });
  try {
    assert.deepEqual(await client.listTools(), ['managed-kb___Retrieve']);
    const passages = await client.retrieve('warranty of the lock', 5);
    assert.equal(passages.length, 3);
    assert.deepEqual(passages[0], {
      text: 'Lock L9 has a 24-month warranty.', score: 0.9, sourceType: 'SHAREPOINT',
      url: 'https://example.sharepoint.com/sites/kb/Warranty%20policy.docx', title: 'Warranty policy.docx',
    });
    assert.equal(passages[2].title, 'Error codes');

    const call = gateway.requests.find((request) => request.message.method === 'tools/call');
    assert.equal(call.message.params.name, 'managed-kb___Retrieve');
    assert.deepEqual(call.message.params.arguments, {
      retrievalQuery: { text: 'warranty of the lock' },
      retrievalConfiguration: { managedSearchConfiguration: { numberOfResults: 5 } },
    });
    for (const request of gateway.requests) {
      assert.match(request.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/eu-west-1\/bedrock-agentcore\/aws4_request/);
    }
  } finally {
    await client.close();
    await gateway.close();
  }
});

test('a tool error is raised, not read as an empty result', () => {
  assert.throws(() => parseRetrieveResult({ isError: true, content: [{ type: 'text', text: 'AccessDenied' }] }), /AccessDenied/);
  assert.deepEqual(parseRetrieveResult({ content: [{ type: 'text', text: '{"retrievalResults":[]}' }] }), []);
});

test('the answer cites numbered sources and lists only the ones cited', async () => {
  const prompts = [];
  const llm = async (request) => {
    prompts.push(request);
    return 'The lock is covered for 24 months [1].';
  };
  const { text, sources } = await answerQuestion('  How long is the\nlock warranty? ', { retrieve: async () => parseRetrieveResult({ content: [{ type: 'text', text: JSON.stringify(RESULTS) }] }), llm, model: 'test-model' });
  assert.equal(sources.length, 2, 'two passages of one document share a number');
  const user = prompts[0].messages[1].content;
  assert.match(user, /\[1\] Lock L9 has a 24-month warranty\./);
  assert.match(user, /\[1\] Batteries are covered/);
  assert.match(user, /\[2\] Error E401/);
  assert.match(user, /Question: How long is the lock warranty\?$/);
  assert.equal(text, 'The lock is covered for 24 months [1].\n\n*Sources*\n[1] <https://example.sharepoint.com/sites/kb/Warranty%20policy.docx|Warranty policy.docx>');
});

test('empty, oversized and unanswerable questions never reach the LLM', async () => {
  const llm = async () => assert.fail('the LLM must not be called');
  const searched = [];
  const retrieve = async (query) => { searched.push(query); return []; };
  assert.match((await answerQuestion('   ', { retrieve, llm })).text, /Ask me a question/);
  assert.match((await answerQuestion('x'.repeat(MAX_QUESTION_LENGTH + 1), { retrieve, llm })).text, /too long/);
  assert.deepEqual(searched, []);
  assert.match((await answerQuestion('Anything about llamas?', { retrieve, llm })).text, /could not find/);
});

test('/ask answers the requester only', async () => {
  const replies = [];
  const handlers = createKbHandlers({ ask: async (question) => ({ text: `answer to ${question}`, sources: [] }) });
  await handlers.onAskCommand({ ack: async () => {}, command: { text: 'warranty?', user_id: 'U1' }, respond: async (message) => replies.push(message) });
  assert.deepEqual(replies, [
    { response_type: 'ephemeral', text: 'Looking that up…' },
    { response_type: 'ephemeral', text: 'answer to warranty?' },
  ]);
});

test('a mention is answered in a thread, without the mention in the question', async () => {
  const posts = [];
  const asked = [];
  const handlers = createKbHandlers({ ask: async (question) => { asked.push(question); return { text: 'answer', sources: [] }; } });
  const client = { chat: { postMessage: async (args) => posts.push(args) } };
  await handlers.onMention({ event: { text: '<@U0BOT> what is E401?', user: 'U1', channel: 'C1', ts: '100.1' }, client });
  assert.deepEqual(asked, ['what is E401?']);
  assert.deepEqual(posts, [{ channel: 'C1', thread_ts: '100.1', text: 'answer' }]);
});

test('direct messages are answered; bot messages, edits and channel messages are ignored', async () => {
  const posts = [];
  const handlers = createKbHandlers({ ask: async () => ({ text: 'answer', sources: [] }) });
  const client = { chat: { postMessage: async (args) => posts.push(args) } };
  await handlers.onDirectMessage({ event: { channel_type: 'im', bot_id: 'B1', user: 'U0BOT', channel: 'D1', text: 'hi' }, client });
  await handlers.onDirectMessage({ event: { channel_type: 'im', subtype: 'message_changed', channel: 'D1' }, client });
  await handlers.onDirectMessage({ event: { channel_type: 'channel', user: 'U1', channel: 'C1', text: 'hi' }, client });
  assert.equal(posts.length, 0);
  await handlers.onDirectMessage({ event: { channel_type: 'im', user: 'U1', channel: 'D1', text: 'return policy?' }, client });
  assert.deepEqual(posts, [{ channel: 'D1', thread_ts: undefined, text: 'answer' }]);
});

test('failures and bursts get a plain message instead of an error', async () => {
  const replies = [];
  const send = { ack: async () => {}, respond: async (message) => replies.push(message.text) };
  const failing = createKbHandlers({ ask: async () => { throw new Error('gateway timeout'); } });
  await failing.onAskCommand({ ...send, command: { text: 'q', user_id: 'U1' } });
  assert.match(replies.at(-1), /could not reach the knowledge base/);

  let time = 0;
  const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });
  const limited = createKbHandlers({ ask: async () => ({ text: 'answer', sources: [] }), allow });
  for (let i = 0; i < 3; i += 1) await limited.onAskCommand({ ...send, command: { text: 'q', user_id: 'U2' } });
  assert.match(replies.at(-1), /try again in a minute/);
  time = 2000;
  await limited.onAskCommand({ ...send, command: { text: 'q', user_id: 'U2' } });
  assert.equal(replies.at(-1), 'answer');
});

test('a message delivered twice is answered once', async () => {
  const posts = [];
  const client = { chat: { postMessage: async (message) => posts.push(message) } };
  const handlers = createKbHandlers({ ask: async () => ({ text: 'answer', sources: [] }) });
  const event = { user: 'U1', channel: 'C1', ts: '1.1', text: '<@UBOT> return policy?' };
  await handlers.onMention({ event, client });
  await handlers.onMention({ event: { ...event, edited: { user: 'U1' } }, client });
  await handlers.onMention({ event: { ...event, ts: '1.2' }, client });
  assert.equal(posts.length, 2);
});
