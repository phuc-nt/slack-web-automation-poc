// Runs the Slack app in Socket Mode: it dials out to Slack, so a laptop needs no public URL.

import bolt from '@slack/bolt';
import { loadConfig } from '../config.js';
import { consoleAndFileSink, createLogger } from '../core/logger.js';
import { RegistrationService } from '../core/registration-service.js';
import { EnvSecretStore } from '../core/secret-store.js';
import { configuredChat } from '../llm/configured-chat.js';
import { parseFreeTextRequest } from '../llm/parse-free-text-request.js';
import { configuredReporter } from '../report/configured-reporter.js';
import { scheduleDaily } from '../report/daily-report-service.js';
import { answerQuestion } from '../kb/answer-question.js';
import { createKnowledgeBaseClient } from '../kb/gateway-mcp-client.js';
import { createKbHandlers, registerKbHandlers } from './kb-handlers.js';
import { createSlackHandlers, registerSlackHandlers } from './slack-handlers.js';

const config = loadConfig();
const logger = createLogger(consoleAndFileSink(config.logFile));
if (!config.slackBotToken || !config.slackAppToken) {
  console.error('SLACK_BOT_TOKEN and SLACK_APP_TOKEN must be set. See README, "Run with a real Slack workspace".');
  process.exit(1);
}

const service = new RegistrationService({
  portalBaseUrl: config.portalBaseUrl,
  secretStore: new EnvSecretStore(),
  headless: config.headless,
  approvalTtlMs: config.approvalTtlMs,
  artifactsDir: config.artifactsDir,
  logger,
});
const chat = configuredChat(config, logger);
const parseRequest = chat ? (text) => parseFreeTextRequest(text, { llm: chat, model: config.llmModel }) : null;

const app = new bolt.App({ token: config.slackBotToken, appToken: config.slackAppToken, socketMode: true });
const reporter = configuredReporter(config, app.client, logger);
registerSlackHandlers(app, createSlackHandlers({ service, parseRequest, reporter, reportChannel: config.reportPostChannel, logger }));
// Knowledge base chatbot: needs the gateway's MCP URL and an LLM to write the answer.
const knowledgeBase = config.kbMcpUrl && chat
  ? createKnowledgeBaseClient({ url: config.kbMcpUrl, region: config.kbRegion, target: config.kbMcpTarget })
  : null;
if (knowledgeBase) {
  const ask = (question) => answerQuestion(question, { retrieve: knowledgeBase.retrieve, llm: chat, model: config.kbModel, results: config.kbResults });
  registerKbHandlers(app, createKbHandlers({ ask, logger }));
}
await app.start();
if (reporter && config.reportTime) scheduleDaily(config.reportTime, () => reporter.post(), { logger });
logger.info('slack_app_started', { portal: config.portalBaseUrl, llmProvider: chat ? config.llmProvider : 'none', llmModel: config.llmModel, llmPrefill: Boolean(parseRequest), dailyReport: Boolean(reporter), knowledgeBase: Boolean(knowledgeBase), reportTime: config.reportTime });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await service.shutdown();
    await knowledgeBase?.close();
    await app.stop();
    process.exit(0);
  });
}
