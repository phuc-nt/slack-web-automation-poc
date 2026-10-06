// One chat completion against OpenRouter. Returns the answer text.

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export async function chatCompletion({ apiKey, model, messages, timeoutMs = 20_000, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0, messages }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`LLM request failed with HTTP ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('The model returned an empty answer');
  return content;
}
