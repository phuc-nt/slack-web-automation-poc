// Creates invented issues in a real Jira project, as test data for the daily report.
// They go into the project JIRA_PROJECT_KEY with the label daily-report-seed. The real issue
// keys are written to artifacts/jira-seed-keys.json so that `npm run seed` can use them in chat.
//
//   npm run seed:jira              (show what would be created)
//   npm run seed:jira -- --post    (create it)

import { mkdir, writeFile } from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { localToday } from '../src/core/registration-fields.js';
import { JIRA_SEED_ISSUES, JIRA_SEED_LABEL } from '../test/fixtures/jira-seed-issues.js';

const KEYS_FILE = 'artifacts/jira-seed-keys.json';
const STATUS_CATEGORY = { progress: 'indeterminate', done: 'done' };

const config = loadConfig();
const projectKey = config.jiraProjectKey;
const site = config.jiraBaseUrl.replace(/\/+$/, '');

function dueDate(days) {
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localToday(d);
}

if (!process.argv.includes('--post')) {
  for (const i of JIRA_SEED_ISSUES) {
    console.log(`${i.ref} | ${i.type} | ${i.status} | ${i.priority} | due ${dueDate(i.due) || '-'} | ${i.mine ? 'assigned' : 'unassigned'} | ${i.summary}\n      ${i.pattern}`);
  }
  console.log(`\n${JIRA_SEED_ISSUES.length} issues for project ${projectKey || '(JIRA_PROJECT_KEY not set)'} on ${site || '(JIRA_BASE_URL not set)'}. Nothing was created; add --post to create.`);
  process.exit(0);
}

if (!site || !config.jiraEmail || !config.jiraApiToken || !projectKey) {
  console.error('Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN and JIRA_PROJECT_KEY.');
  process.exit(1);
}

async function jira(method, path, body) {
  const response = await fetch(`${site}/rest/api/3${path}`, {
    method,
    headers: {
      authorization: `Basic ${Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString('base64')}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = [...(data.errorMessages || []), ...Object.entries(data.errors || {}).map(([k, v]) => `${k}: ${v}`)].join('; ');
    const error = new Error(`${method} ${path} failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const paragraph = (text) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

try {
  const me = await jira('GET', '/myself');

  // Each issue type has its own set of fields; sending one it lacks fails the whole request.
  const { issueTypes } = await jira('GET', `/issue/createmeta/${projectKey}/issuetypes`);
  const types = new Map();
  for (const type of issueTypes) {
    const { fields } = await jira('GET', `/issue/createmeta/${projectKey}/issuetypes/${type.id}?maxResults=200`);
    types.set(type.subtask ? 'Sub-task' : type.name, { id: type.id, fields: new Set(fields.map((f) => f.key)) });
  }

  const seeded = await jira('POST', '/search/jql', { jql: `project = "${projectKey}" AND labels = "${JIRA_SEED_LABEL}"`, maxResults: 1, fields: ['summary'] });
  if (seeded.issues?.length) {
    console.error(`Project ${projectKey} already has seeded issues (label ${JIRA_SEED_LABEL}). Nothing was created.`);
    process.exit(1);
  }

  const keys = {};
  for (const issue of JIRA_SEED_ISSUES) {
    try {
      const type = types.get(issue.type);
      if (!type) throw new Error(`the project has no issue type ${issue.type}`);
      const wanted = {
        description: paragraph(`Test data for the daily report. Case: ${issue.pattern}.`),
        priority: { name: issue.priority },
        labels: [JIRA_SEED_LABEL],
        duedate: dueDate(issue.due),
        assignee: issue.mine ? { accountId: me.accountId } : null,
        parent: issue.parent ? { key: keys[issue.parent] } : null,
      };
      const fields = { project: { key: projectKey }, issuetype: { id: type.id }, summary: issue.summary };
      for (const [name, value] of Object.entries(wanted)) {
        if (value && type.fields.has(name)) fields[name] = value;
      }
      const { key } = await jira('POST', '/issue', { fields });
      keys[issue.ref] = key;

      const category = STATUS_CATEGORY[issue.status];
      if (category) {
        const { transitions } = await jira('GET', `/issue/${key}/transitions`);
        const transition = transitions.find((t) => t.to?.statusCategory?.key === category);
        if (!transition) throw new Error(`${key} has no transition to ${issue.status}`);
        await jira('POST', `/issue/${key}/transitions`, { transition: { id: transition.id } });
      }
      console.log(`${issue.ref} -> ${key} | ${issue.status} | ${issue.summary}`);
    } catch (error) {
      console.error(`${issue.ref} skipped: ${error.message}`);
    }
  }

  await mkdir('artifacts', { recursive: true });
  await writeFile(KEYS_FILE, `${JSON.stringify(keys, null, 2)}\n`);
  console.log(`\n${Object.keys(keys).length} of ${JIRA_SEED_ISSUES.length} issues created in ${site}/browse/${projectKey}. Keys saved to ${KEYS_FILE}.`);
} catch (error) {
  console.error(`Stopped: ${error.message}`);
  process.exitCode = 1;
}
