// Calls the real model. Skipped when no API key is configured.

import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { parseFreeTextRequest } from '../src/llm/parse-free-text-request.js';
import { FREE_TEXT_REQUESTS, REFERENCE_NOW } from './fixtures/free-text-requests.js';

const config = loadConfig();

for (const { name, text, expect, mayFail } of FREE_TEXT_REQUESTS) {
  test(`free text: ${name}`, { skip: !config.openRouterApiKey && 'OPENROUTER_API_KEY not set' }, async () => {
    let parsed;
    try {
      parsed = await parseFreeTextRequest(text, { apiKey: config.openRouterApiKey, model: config.openRouterModel, now: REFERENCE_NOW });
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
