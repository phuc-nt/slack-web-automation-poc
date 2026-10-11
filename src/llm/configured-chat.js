// Picks the LLM provider from configuration. Returns null when no provider is set up,
// so the app runs without the LLM. The result is a function ({ model, messages, ... }) => text.

import { bedrockChat } from './bedrock-chat.js';
import { chatCompletion } from './openrouter-chat.js';

export function configuredChat(config, logger) {
  if (config.llmProvider === 'bedrock') {
    const onUsage = logger && ((usage) => logger.info('llm_call', { provider: 'bedrock', ...usage }));
    return (request) => bedrockChat({ region: config.bedrockRegion, onUsage, ...request });
  }
  if (!config.openRouterApiKey) return null;
  return (request) => chatCompletion({ apiKey: config.openRouterApiKey, ...request });
}
