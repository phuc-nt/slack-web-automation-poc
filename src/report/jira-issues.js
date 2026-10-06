// Reads issues from Jira Cloud with one JQL query and keeps only what the report needs.

const FIELDS = ['summary', 'status', 'assignee', 'priority', 'issuetype', 'duedate', 'updated'];

export async function fetchJiraIssues({ baseUrl, email, apiToken, jql, maxIssues = 100, timeoutMs = 20_000, fetchImpl = fetch }) {
  const site = baseUrl.replace(/\/+$/, '');
  const issues = [];
  let nextPageToken;
  do {
    const response = await fetchImpl(`${site}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ jql, fields: FIELDS, maxResults: Math.min(100, maxIssues - issues.length), nextPageToken }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Jira request failed with HTTP ${response.status}`);
    const page = await response.json();
    issues.push(...(page.issues || []));
    nextPageToken = page.nextPageToken;
  } while (nextPageToken && issues.length < maxIssues);

  return issues.slice(0, maxIssues).map(({ key, fields }) => ({
    key,
    summary: fields.summary || '',
    type: fields.issuetype?.name || '',
    status: fields.status?.name || '',
    done: fields.status?.statusCategory?.key === 'done',
    assignee: fields.assignee?.displayName || '',
    priority: fields.priority?.name || '',
    dueDate: fields.duedate || '',
    updated: (fields.updated || '').slice(0, 10),
    url: `${site}/browse/${key}`,
  }));
}

/** Without an explicit query: everything still open in the project, plus what changed in the last day. */
export function defaultJql(projectKey) {
  return `project = "${projectKey}" AND (statusCategory != Done OR updated >= -1d) ORDER BY updated DESC`;
}
