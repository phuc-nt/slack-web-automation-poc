// Asks the knowledge base every question in kb/test-questions.json through the MCP gateway
// and reports whether the expected fact shows up in the passages returned.
// Usage: node --env-file-if-exists=.env kb/check-answers.js   (needs KB_MCP_URL and AWS credentials)
import { readFile } from 'node:fs/promises';
import { loadConfig } from '../src/config.js';
import { createKnowledgeBaseClient } from '../src/kb/gateway-mcp-client.js';

const config = loadConfig();
if (!config.kbMcpUrl) {
  console.error('KB_MCP_URL is not set. Run infra/kb.sh up and copy the MCP URL into .env.');
  process.exit(1);
}
const questions = JSON.parse(await readFile(new URL('./test-questions.json', import.meta.url), 'utf8'));
const client = createKnowledgeBaseClient({ url: config.kbMcpUrl, region: config.kbRegion, target: config.kbMcpTarget });
let found = 0;
try {
  console.log(`tools: ${(await client.listTools()).join(', ')}`);
  for (const { question, expect, source } of questions) {
    const passages = await client.retrieve(question, config.kbResults);
    const hit = expect === null ? true : passages.some((passage) => passage.text.includes(expect));
    if (hit) found += 1;
    const from = [...new Set(passages.slice(0, 3).map((passage) => passage.sourceType || '?'))].join(',');
    console.log(`${hit ? 'ok  ' : 'MISS'} ${question}  [expected in: ${source}; top results from: ${from || 'nothing'}]`);
  }
} finally {
  await client.close();
}
console.log(`${found}/${questions.length} questions found their fact`);
process.exit(found === questions.length ? 0 : 1);
