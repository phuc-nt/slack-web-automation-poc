// Builds the daily reporter from configuration. Returns null when the report is not set up,
// so the rest of the app runs without it. Jira is optional: without it the report covers chat only.

import { writeDailyReport } from '../llm/write-daily-report.js';
import { createDailyReporter } from './daily-report-service.js';
import { defaultJql, fetchJiraIssues } from './jira-issues.js';

export function reportWriter(config) {
  return (input) => writeDailyReport(input, { apiKey: config.openRouterApiKey, model: config.reportModel, language: config.reportLanguage });
}

export function configuredReporter(config, client, logger) {
  if (!config.reportChannels.length || !config.reportPostChannel || !config.openRouterApiKey) return null;
  const jql = config.jiraJql || (config.jiraProjectKey && defaultJql(config.jiraProjectKey));
  const jiraReady = config.jiraBaseUrl && config.jiraEmail && config.jiraApiToken && jql;
  return createDailyReporter({
    client,
    channels: config.reportChannels,
    postChannel: config.reportPostChannel,
    writeReport: reportWriter(config),
    fetchIssues: jiraReady
      ? () => fetchJiraIssues({ baseUrl: config.jiraBaseUrl, email: config.jiraEmail, apiToken: config.jiraApiToken, jql })
      : null,
    logger,
  });
}
