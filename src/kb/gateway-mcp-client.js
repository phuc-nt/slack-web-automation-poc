// MCP client for the knowledge base gateway (Amazon Bedrock AgentCore Gateway).
// The gateway authorises callers with IAM, so every HTTP request is signed with SigV4.
// Credentials come from the AWS default chain: the task role on AWS, AWS_PROFILE on a laptop.

import { Sha256 } from '@aws-crypto/sha256-js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SignatureV4 } from '@smithy/signature-v4';

/** A fetch that signs each request for the gateway. */
export function signingFetch({ region, credentials = fromNodeProviderChain(), fetchImpl = fetch }) {
  const signer = new SignatureV4({ service: 'bedrock-agentcore', region, credentials, sha256: Sha256 });
  return async (input, init = {}) => {
    const url = new URL(input);
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const signed = await signer.sign({
      method: init.method || 'GET',
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: { ...headers, host: url.host },
      body: init.body,
    });
    // fetch sets Host itself; it only had to be present for the signature.
    const { host, ...signedHeaders } = signed.headers;
    return fetchImpl(url, { ...init, headers: signedHeaders });
  };
}

/** First url or uri found in a result's location, whatever the source type. */
function locationUrl(location = {}) {
  for (const value of Object.values(location)) {
    if (value && typeof value === 'object') {
      const found = value.url || value.uri || locationUrl(value);
      if (found) return found;
    }
  }
  return '';
}

function titleOf(metadata = {}, url = '') {
  const named = Object.entries(metadata).find(([key, value]) => /title|file.?name/i.test(key) && typeof value === 'string' && value);
  if (named) return named[1];
  const last = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';
  try {
    return decodeURIComponent(last.replace(/\+/g, ' ')) || 'Document';
  } catch {
    return last || 'Document';
  }
}

/** Turns the Retrieve tool's answer into [{ text, score, url, title, sourceType }]. */
export function parseRetrieveResult(result) {
  const body = (result?.content || []).filter((part) => part.type === 'text').map((part) => part.text).join('');
  if (result?.isError) throw new Error(`Knowledge base search failed: ${body.slice(0, 300)}`);
  const parsed = result?.structuredContent?.retrievalResults ? result.structuredContent : JSON.parse(body || '{}');
  return (parsed.retrievalResults || [])
    .filter((item) => item.content?.text)
    .map((item) => {
      const url = locationUrl(item.location);
      return { text: item.content.text, score: item.score, url, title: titleOf(item.metadata, url), sourceType: item.location?.type || '' };
    });
}

/**
 * Connects on first use and reconnects after a failure.
 * `target` is the gateway target's name: the gateway prefixes every tool with it.
 */
export function createKnowledgeBaseClient({ url, region, target = 'managed-kb', fetchImpl, timeoutMs = 30_000 }) {
  let connecting = null;
  const connect = () => {
    connecting ??= (async () => {
      const client = new Client({ name: 'slack-kb-bot', version: '1.0.0' });
      await client.connect(new StreamableHTTPClientTransport(new URL(url), { fetch: fetchImpl || signingFetch({ region }) }));
      return client;
    })().catch((error) => {
      connecting = null;
      throw error;
    });
    return connecting;
  };

  async function call(name, args) {
    const client = await connect();
    try {
      return await client.callTool({ name: `${target}___${name}`, arguments: args }, undefined, { timeout: timeoutMs });
    } catch (error) {
      connecting = null;
      throw error;
    }
  }

  return {
    async listTools() {
      return (await (await connect()).listTools()).tools.map((tool) => tool.name);
    },
    async retrieve(query, numberOfResults = 8) {
      const result = await call('Retrieve', {
        retrievalQuery: { text: query },
        retrievalConfiguration: { managedSearchConfiguration: { numberOfResults } },
      });
      return parseRetrieveResult(result);
    },
    async close() {
      const client = await connecting?.catch(() => null);
      connecting = null;
      await client?.close();
    },
  };
}
