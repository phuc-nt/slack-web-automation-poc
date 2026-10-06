// Runs the Slack app in Socket Mode: it dials out to Slack, so a laptop needs no public URL.

import bolt from '@slack/bolt';
import { loadConfig } from '../config.js';
import { createLogger } from '../core/logger.js';
import { RegistrationService } from '../core/registration-service.js';
import { EnvSecretStore } from '../core/secret-store.js';
import { parseFreeTextRequest } from '../llm/parse-free-text-request.js';
import { configuredReporter } from '../report/configured-reporter.js';
import { scheduleDaily } from '../report/daily-report-service.js';
import { createSlackHandlers, registerSlackHandlers } from './slack-handlers.js';

const config = loadConfig();
const logger = createLogger();
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
const parseRequest = config.openRouterApiKey
  ? (text) => parseFreeTextRequest(text, { apiKey: config.openRouterApiKey, model: config.openRouterModel })
  : null;

const app = new bolt.App({ token: config.slackBotToken, appToken: config.slackAppToken, socketMode: true });
const reporter = configuredReporter(config, app.client, logger);
registerSlackHandlers(app, createSlackHandlers({ service, parseRequest, reporter, reportChannel: config.reportPostChannel, logger }));
await app.start();
if (reporter && config.reportTime) scheduleDaily(config.reportTime, () => reporter.post(), { logger });
logger.info('slack_app_started', { portal: config.portalBaseUrl, llmPrefill: Boolean(parseRequest), dailyReport: Boolean(reporter), reportTime: config.reportTime });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await service.shutdown();
    await app.stop();
    process.exit(0);
  });
}
