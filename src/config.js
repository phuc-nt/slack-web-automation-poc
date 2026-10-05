// Central place for environment-driven settings, so no module reads process.env directly.

function flag(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return !['false', '0', 'no'].includes(String(value).toLowerCase());
}

export function loadConfig(env = process.env) {
  return {
    portalBaseUrl: env.PORTAL_BASE_URL || 'http://localhost:4010',
    mockPortalPort: Number(env.MOCK_PORTAL_PORT || 4010),
    headless: flag(env.BROWSER_HEADLESS, true),
    approvalTtlMs: Number(env.APPROVAL_TTL_SECONDS || 600) * 1000,
    artifactsDir: env.ARTIFACTS_DIR || 'artifacts',
    openRouterApiKey: env.OPENROUTER_API_KEY || '',
    openRouterModel: env.OPENROUTER_MODEL || 'deepseek/deepseek-v4.1-flash',
    slackBotToken: env.SLACK_BOT_TOKEN || '',
    slackAppToken: env.SLACK_APP_TOKEN || '',
  };
}
