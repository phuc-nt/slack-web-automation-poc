// Calls the real model. Skipped when no LLM provider is configured.

import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { bedrockChat } from '../src/llm/bedrock-chat.js';
import { configuredChat } from '../src/llm/configured-chat.js';
import { parseFreeTextRequest } from '../src/llm/parse-free-text-request.js';
import { FREE_TEXT_REQUESTS, REFERENCE_NOW } from './fixtures/free-text-requests.js';

const config = loadConfig();
const chat = configuredChat(config);

for (const { name, text, expect, mayFail } of FREE_TEXT_REQUESTS) {
  test(`free text: ${name}`, { skip: !chat && 'no LLM provider configured' }, async () => {
    let parsed;
    try {
      parsed = await parseFreeTextRequest(text, { llm: chat, model: config.llmModel, now: REFERENCE_NOW });
    } catch (error) {
      if (mayFail) return;
      throw error;
    }
    const wrong = Object.entries(expect).filter(([key, wanted]) => (wanted instanceof RegExp ? !wanted.test(parsed[key]) : parsed[key] !== wanted));
    assert.deepEqual(wrong.map(([key, wanted]) => `${key}: got ${JSON.stringify(parsed[key])}, wanted ${wanted}`), []);
  });
}

test('a non-JSON model answer is an error, not a registration', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Sorry, I cannot help.' } }] }));
  await assert.rejects(parseFreeTextRequest('x', { apiKey: 'k', model: 'm', fetchImpl }), /did not return JSON/);
});

test('bedrock: system prompts are sent apart, and the answer is the text after a reasoning block', async () => {
  const sent = [];
  const client = {
    send: async (command) => {
      sent.push(command.input);
      return { output: { message: { content: [{ reasoningContent: { reasoningText: { text: 'thinking' } } }, { text: '{"a":1}' }] } }, usage: { inputTokens: 7, outputTokens: 3 } };
    },
  };
  const usage = [];
  const messages = [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }];
  assert.equal(await bedrockChat({ model: 'm', messages, client, onUsage: (u) => usage.push(u) }), '{"a":1}');
  assert.deepEqual(sent[0].system, [{ text: 'S' }]);
  assert.deepEqual(sent[0].messages, [{ role: 'user', content: [{ text: 'U' }] }]);
  assert.equal(sent[0].inferenceConfig.maxTokens, 2048);
  assert.deepEqual([usage[0].input, usage[0].output], [7, 3]);
});

test('bedrock: an answer without text is an error', async () => {
  const client = { send: async () => ({ output: { message: { content: [{ reasoningContent: {} }] } } }) };
  await assert.rejects(bedrockChat({ model: 'm', messages: [{ role: 'user', content: 'U' }], client }), /empty answer/);
});
