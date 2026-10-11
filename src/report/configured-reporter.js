// Builds the daily reporter from configuration. Returns null when the report is not set up,
// so the rest of the app runs without it. Jira is optional: without it the report covers chat only.

import { configuredChat } from '../llm/configured-chat.js';
import { writeDailyReport } from '../llm/write-daily-report.js';
import { createDailyReporter } from './daily-report-service.js';
import { defaultJql, fetchJiraIssues } from './jira-issues.js';

/** Null when no LLM provider is configured. */
export function reportWriter(config, logger) {
  const chat = configuredChat(config, logger);
  return chat && ((input) => writeDailyReport(input, { llm: chat, model: config.reportModel, language: config.reportLanguage }));
}

export function configuredReporter(config, client, logger) {
  const writeReport = reportWriter(config, logger);
  if (!config.reportChannels.length || !config.reportPostChannel || !writeReport) return null;
  const jql = config.jiraJql || (config.jiraProjectKey && defaultJql(config.jiraProjectKey));
  const jiraReady = config.jiraBaseUrl && config.jiraEmail && config.jiraApiToken && jql;
  return createDailyReporter({
    client,
    channels: config.reportChannels,
    postChannel: config.reportPostChannel,
    writeReport,
    fetchIssues: jiraReady
      ? () => fetchJiraIssues({ baseUrl: config.jiraBaseUrl, email: config.jiraEmail, apiToken: config.jiraApiToken, jql })
      : null,
    logger,
  });
}
