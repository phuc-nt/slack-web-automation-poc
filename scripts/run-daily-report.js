// The daily report from a terminal. Prints the report; posts it only with --post.
//
//   npm run report -- --sample            (invented project day; needs only OPENROUTER_API_KEY)
//   npm run report                        (today, from the configured channels and Jira)
//   npm run report -- 2026-10-05          (another day)
//   npm run report -- --post              (also post to REPORT_POST_CHANNEL)

import bolt from '@slack/bolt';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/core/logger.js';
import { configuredReporter, reportWriter } from '../src/report/configured-reporter.js';
import { createDailyReporter } from '../src/report/daily-report-service.js';

const args = process.argv.slice(2);
const date = args.find((a) => !a.startsWith('--'));
const config = loadConfig();
const logger = createLogger((line) => console.error(line));

let reporter;
let reportDate = date;
if (args.includes('--sample')) {
  // Loaded on demand: the container image ships without test/.
  const { SAMPLE_CHANNELS, SAMPLE_DATE, SAMPLE_ISSUES } = await import('../test/fixtures/daily-report-sample.js');
  reportDate = SAMPLE_DATE;
  reporter = createDailyReporter({
    channels: [],
    writeReport: reportWriter(config),
    fetchMessages: async () => SAMPLE_CHANNELS,
    fetchIssues: async () => SAMPLE_ISSUES,
    logger,
  });
} else {
  if (!config.slackBotToken) {
    console.error('SLACK_BOT_TOKEN must be set, or use --sample.');
    process.exit(1);
  }
  const app = new bolt.App({ token: config.slackBotToken, appToken: config.slackAppToken, socketMode: true });
  reporter = configuredReporter(config, app.client, logger);
  if (!reporter) {
    console.error('Set REPORT_CHANNELS, REPORT_POST_CHANNEL and OPENROUTER_API_KEY, or use --sample.');
    process.exit(1);
  }
}

try {
  const post = args.includes('--post') && !args.includes('--sample');
  const report = await (post ? reporter.post(reportDate) : reporter.build(reportDate));
  console.log(report.text);
  console.error(`\n${report.stats.messages} messages, ${report.stats.issues} issues${post ? '; posted' : '; not posted'}`);
} catch (error) {
  console.error(`Could not write the report: ${error.message}`);
  process.exitCode = 1;
}
