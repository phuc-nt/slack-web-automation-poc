// Central place for environment-driven settings, so no module reads process.env directly.

function flag(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return !['false', '0', 'no'].includes(String(value).toLowerCase());
}

const list = (value) => (value || '').split(',').map((v) => v.trim()).filter(Boolean);

export function loadConfig(env = process.env) {
  const llmProvider = (env.LLM_PROVIDER || 'openrouter').toLowerCase();
  const llmModel = llmProvider === 'bedrock'
    ? env.BEDROCK_MODEL || 'zai.glm-4.7-flash'
    : env.OPENROUTER_MODEL || 'deepseek/deepseek-v4.1-flash';
  return {
    portalBaseUrl: env.PORTAL_BASE_URL || 'http://localhost:4010',
    mockPortalPort: Number(env.MOCK_PORTAL_PORT || 4010),
    headless: flag(env.BROWSER_HEADLESS, true),
    approvalTtlMs: Number(env.APPROVAL_TTL_SECONDS || 600) * 1000,
    artifactsDir: env.ARTIFACTS_DIR || 'artifacts',
    logFile: env.LOG_FILE || `${env.ARTIFACTS_DIR || 'artifacts'}/logs/slack-bot.jsonl`,
    llmProvider,
    llmModel,
    openRouterApiKey: env.OPENROUTER_API_KEY || '',
    bedrockRegion: env.BEDROCK_REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION || '',
    slackBotToken: env.SLACK_BOT_TOKEN || '',
    slackAppToken: env.SLACK_APP_TOKEN || '',
    reportChannels: list(env.REPORT_CHANNELS),
    reportPostChannel: env.REPORT_POST_CHANNEL || '',
    reportTime: env.REPORT_TIME || '',
    reportLanguage: env.REPORT_LANGUAGE || 'Vietnamese',
    reportModel: env.REPORT_MODEL || llmModel,
    jiraBaseUrl: env.JIRA_BASE_URL || '',
    jiraEmail: env.JIRA_EMAIL || '',
    jiraApiToken: env.JIRA_API_TOKEN || '',
    jiraProjectKey: env.JIRA_PROJECT_KEY || '',
    jiraJql: env.JIRA_JQL || '',
    kbMcpUrl: env.KB_MCP_URL || '',
    kbMcpTarget: env.KB_MCP_TARGET || 'managed-kb',
    kbRegion: env.KB_REGION || env.BEDROCK_REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION || '',
    kbModel: env.KB_MODEL || llmModel,
    kbResults: Number(env.KB_RESULTS || 8),
  };
}
