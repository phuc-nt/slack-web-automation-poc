// One chat completion against Amazon Bedrock (Converse API). Returns the answer text.
// Credentials come from the AWS default chain: the ECS task role on AWS, AWS_PROFILE on a laptop.

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const clients = new Map();

function clientFor(region) {
  if (!clients.has(region)) clients.set(region, new BedrockRuntimeClient({ region, maxAttempts: 3 }));
  return clients.get(region);
}

export async function bedrockChat({ region, model, messages, timeoutMs = 20_000, maxTokens = 2048, client = clientFor(region), onUsage }) {
  if (!model) throw new Error('BEDROCK_MODEL is not set');
  const text = (role) => messages.filter((m) => (m.role === 'system') === (role === 'system'));
  const started = Date.now();
  const response = await client.send(
    new ConverseCommand({
      modelId: model,
      system: text('system').map((m) => ({ text: m.content })),
      messages: text('chat').map((m) => ({ role: m.role, content: [{ text: m.content }] })),
      // Always set: left out, Bedrock reserves the model's maximum against the quota.
      inferenceConfig: { maxTokens, temperature: 0 },
    }),
    { abortSignal: AbortSignal.timeout(timeoutMs) },
  );
  // Reasoning models put a reasoning block first, so the answer is not always block 0.
  const content = (response.output?.message?.content || []).map((block) => block.text || '').join('');
  // Named input/output: the logger redacts any field whose name contains "token".
  onUsage?.({ model, input: response.usage?.inputTokens, output: response.usage?.outputTokens, ms: Date.now() - started });
  if (!content) throw new Error('The model returned an empty answer');
  return content;
}
