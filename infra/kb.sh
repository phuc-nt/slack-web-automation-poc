#!/usr/bin/env bash
# Knowledge base for the chatbot: an Amazon Bedrock Managed Knowledge Base fed by Confluence
# and SharePoint, published as an MCP server through an AgentCore Gateway (IAM sign-in).
# Every resource is named <app>-kb... and tagged Project=<app>.
#
#   infra/kb.sh cert            create the SharePoint certificate in infra/kb-cert/ (ignored by git)
#   infra/kb.sh up              create or update the knowledge base, its data sources and the MCP gateway
#   infra/kb.sh sync            sync every data source now and wait for the result
#   infra/kb.sh status          knowledge base, data sources, last syncs, gateway URL
#   infra/kb.sh ask "question"  search the knowledge base directly and print the passages
#   infra/kb.sh mcp-config      print the MCP entry for IDE agents (Claude Code, Kiro)
#   infra/kb.sh down            delete everything this script created
#
# Needs: aws CLI v2 signed in, AWS_REGION, node, openssl. Settings go in infra/local.env:
#   CONFLUENCE_SPACE_KEYS   space keys to index, comma-separated      (Confluence source)
#   SHAREPOINT_TENANT_ID    Directory (tenant) ID of the Entra app    (SharePoint source)
#   SHAREPOINT_CLIENT_ID    Application (client) ID of the Entra app
#   SHAREPOINT_SITE_URLS    site URLs to index, comma-separated
#   KB_SYNC                 daily (default) | manual
# The Confluence site, account and API token are read from .env (CONFLUENCE_*, else JIRA_*).
# A source whose settings are missing is skipped, so the sources can be added one at a time.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL=infra/local.env
if [ -f "$LOCAL" ]; then set -a; . "$LOCAL"; set +a; fi
APP="${APP:-slack-web-automation-poc}"
export AWS_REGION="${AWS_REGION:-$(aws configure get region || true)}"
export AWS_PAGER=""
[ -n "$AWS_REGION" ] || { echo "Set AWS_REGION to the Region to deploy in." >&2; exit 1; }

KB="$APP-kb"
KB_ROLE="$APP-kb-role"
GATEWAY="$APP-kb"
GATEWAY_ROLE="$APP-kb-gateway-role"
TARGET="managed-kb"
CONFLUENCE_SECRET="$APP-kb-confluence"
SHAREPOINT_SECRET="$APP-kb-sharepoint"
CERT_DIR=infra/kb-cert
CERT_KEY="sharepoint/certificate.p12"
KB_SYNC="${KB_SYNC:-daily}"

say() { printf '\n== %s\n' "$*"; }
none() { [ -z "$1" ] || [ "$1" = "None" ]; }
# One value from .env, without printing the file.
dotenv() { node --env-file-if-exists=.env -e "process.stdout.write(process.env['$1'] || '')"; }
account() { aws sts get-caller-identity --query Account --output text; }
cert_bucket() { echo "$APP-kb-cert-$(account)-$AWS_REGION"; }
tmp_json() { local file; file="$(mktemp)"; chmod 600 "$file"; cat > "$file"; echo "$file"; }

kb_id() { aws bedrock-agent list-knowledge-bases --query "knowledgeBaseSummaries[?name=='$KB'].knowledgeBaseId | [0]" --output text; }
source_id() { aws bedrock-agent list-data-sources --knowledge-base-id "$1" --query "dataSourceSummaries[?name=='$2'].dataSourceId | [0]" --output text; }
gateway_id() { aws bedrock-agentcore-control list-gateways --query "items[?name=='$GATEWAY'].gatewayId | [0]" --output text; }
target_id() { aws bedrock-agentcore-control list-gateway-targets --gateway-identifier "$1" --query "items[?name=='$TARGET'].targetId | [0]" --output text; }
gateway_url() { aws bedrock-agentcore-control get-gateway --gateway-identifier "$1" --query gatewayUrl --output text; }

wait_for() { # wait_for <description> <wanted> <failed> <command...>
  local what="$1" wanted="$2" failed="$3" status; shift 3
  for _ in $(seq 1 90); do
    status="$("$@")"
    [ "$status" = "$wanted" ] && { echo "$what: $status"; return 0; }
    case "$status" in $failed) echo "$what: $status" >&2; return 1 ;; esac
    sleep 5
  done
  echo "$what: still $status after 7 minutes" >&2; return 1
}

put_role() { # put_role <name> <service principal> <source ARN pattern> <policy file>
  local name="$1" trust
  trust="$(tmp_json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"$2"},"Action":"sts:AssumeRole",
"Condition":{"StringEquals":{"aws:SourceAccount":"$(account)"},"ArnLike":{"aws:SourceArn":"$3"}}}]}
EOF
)"
  if aws iam get-role --role-name "$name" >/dev/null 2>&1; then
    aws iam update-assume-role-policy --role-name "$name" --policy-document "file://$trust"
  else
    aws iam create-role --role-name "$name" --assume-role-policy-document "file://$trust" --tags "Key=Project,Value=$APP" >/dev/null
    sleep 10 # a new role is not assumable straight away
  fi
  aws iam put-role-policy --role-name "$name" --policy-name access --policy-document "file://$4"
  rm -f "$trust" "$4"
  echo "role $name"
}

put_secret() { # put_secret <name> <file with the JSON value>; the value never reaches the terminal
  if aws secretsmanager describe-secret --secret-id "$1" >/dev/null 2>&1; then
    aws secretsmanager put-secret-value --secret-id "$1" --secret-string "file://$2" >/dev/null
  else
    aws secretsmanager create-secret --name "$1" --secret-string "file://$2" --tags "Key=Project,Value=$APP" >/dev/null
  fi
  rm -f "$2"
  aws secretsmanager describe-secret --secret-id "$1" --query ARN --output text
}

cert() {
  command -v openssl >/dev/null || { echo "openssl is required." >&2; exit 1; }
  if [ -f "$CERT_DIR/certificate.p12" ]; then echo "$CERT_DIR already holds a certificate; delete the directory to create a new one."; return; fi
  mkdir -p "$CERT_DIR"; chmod 700 "$CERT_DIR"
  ( umask 077
    openssl rand -base64 30 | tr -d '\n' > "$CERT_DIR/p12-password"
    openssl req -x509 -newkey rsa:2048 -keyout "$CERT_DIR/private_key.pem" -out "$CERT_DIR/certificate.cer" \
      -days 365 -nodes -subj "/CN=bedrock-sharepoint-connector" 2>/dev/null
    openssl pkcs12 -export -out "$CERT_DIR/certificate.p12" -inkey "$CERT_DIR/private_key.pem" \
      -in "$CERT_DIR/certificate.cer" -passout "file:$CERT_DIR/p12-password" )
  echo "Created. Upload ONLY this file to the Entra app (Certificates & secrets > Certificates):"
  echo "  $CERT_DIR/certificate.cer"
  echo "The .p12, the private key and the password stay on this machine and in your AWS project."
}

sync_schedule() { [ "$KB_SYNC" = "daily" ] && echo ',"syncSchedule":{"daily":{}}' || true; }

put_source() { # put_source <kb id> <name> <configuration file>
  local id; id="$(source_id "$1" "$2")"
  if none "$id"; then
    id="$(aws bedrock-agent create-data-source --knowledge-base-id "$1" --name "$2" \
      --data-source-configuration "file://$3" --query dataSource.dataSourceId --output text)"
  else
    aws bedrock-agent update-data-source --knowledge-base-id "$1" --data-source-id "$id" --name "$2" \
      --data-source-configuration "file://$3" >/dev/null
  fi
  rm -f "$3"
  wait_for "data source $2" AVAILABLE "*FAILED*" \
    aws bedrock-agent get-data-source --knowledge-base-id "$1" --data-source-id "$id" --query dataSource.status --output text
}

confluence_source() { # the API token is the "password" of Basic authentication
  local host email spaces secret arn config
  host="$(dotenv CONFLUENCE_BASE_URL)"; host="${host:-$(dotenv JIRA_BASE_URL)}"; host="${host%/}"; host="${host%/wiki}"
  email="$(dotenv CONFLUENCE_EMAIL)"; email="${email:-$(dotenv JIRA_EMAIL)}"
  spaces="${CONFLUENCE_SPACE_KEYS:-$(dotenv CONFLUENCE_SPACE_KEY)}"
  if [ -z "$host" ] || [ -z "$email" ] || [ -z "$spaces" ]; then echo "Confluence: skipped (site, account or CONFLUENCE_SPACE_KEYS missing)"; return; fi
  secret="$(mktemp)"; chmod 600 "$secret"
  HOST_URL="$host" node --env-file-if-exists=.env -e '
    const e = process.env;
    const password = e.CONFLUENCE_API_TOKEN || e.JIRA_API_TOKEN;
    if (!password) { console.error("Set CONFLUENCE_API_TOKEN (or JIRA_API_TOKEN) in .env"); process.exit(1); }
    process.stdout.write(JSON.stringify({ username: e.CONFLUENCE_EMAIL || e.JIRA_EMAIL, password, hostUrl: e.HOST_URL }));
  ' > "$secret" || { rm -f "$secret"; exit 1; }
  arn="$(put_secret "$CONFLUENCE_SECRET" "$secret")"
  config="$(SECRET_ARN="$arn" HOST_URL="$host" SPACES="$spaces" SCHEDULE="$KB_SYNC" node -e '
    const e = process.env;
    const connector = {
      connectorParameters: {
        type: "CONFLUENCE", version: "1",
        // No per-user permissions: every caller of the knowledge base sees every indexed page.
        aclEnabled: false,
        connectionConfiguration: { secretArn: e.SECRET_ARN, type: "SAAS", authType: "BASIC", hostUrl: e.HOST_URL },
        dataEntityConfiguration: { crawlPage: true, crawlBlog: true, crawlPageAttachment: true, crawlBlogAttachment: true, crawlArchivedSpace: false, crawlArchivedPage: false, crawlPersonalSpace: false },
        filterConfiguration: { inclusionSpaceKeys: e.SPACES.split(",").map((s) => s.trim()).filter(Boolean) },
      },
      ...(e.SCHEDULE === "daily" ? { syncSchedule: { daily: {} } } : {}),
    };
    process.stdout.write(JSON.stringify({ type: "MANAGED_KNOWLEDGE_BASE_CONNECTOR", managedKnowledgeBaseConnectorConfiguration: connector }));
  ' | tmp_json)"
  put_source "$1" confluence "$config"
}

sharepoint_source() {
  local bucket secret arn config
  if [ -z "${SHAREPOINT_TENANT_ID:-}" ] || [ -z "${SHAREPOINT_CLIENT_ID:-}" ] || [ -z "${SHAREPOINT_SITE_URLS:-}" ]; then
    echo "SharePoint: skipped (SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID or SHAREPOINT_SITE_URLS missing)"; return
  fi
  [ -f "$CERT_DIR/certificate.p12" ] || { echo "Run infra/kb.sh cert first." >&2; exit 1; }
  bucket="$(cert_bucket)"
  aws s3 cp "$CERT_DIR/certificate.p12" "s3://$bucket/$CERT_KEY" --sse AES256 --only-show-errors
  secret="$(mktemp)"; chmod 600 "$secret"
  CLIENT_ID="$SHAREPOINT_CLIENT_ID" PASSWORD_FILE="$CERT_DIR/p12-password" node -e '
    const fs = require("node:fs");
    process.stdout.write(JSON.stringify({ clientId: process.env.CLIENT_ID, certificatePassword: fs.readFileSync(process.env.PASSWORD_FILE, "utf8") }));
  ' > "$secret"
  arn="$(put_secret "$SHAREPOINT_SECRET" "$secret")"
  config="$(SECRET_ARN="$arn" TENANT="$SHAREPOINT_TENANT_ID" SITES="$SHAREPOINT_SITE_URLS" BUCKET="$bucket" KEY="$CERT_KEY" SCHEDULE="$KB_SYNC" node -e '
    const e = process.env;
    const connector = {
      connectorParameters: {
        type: "SHAREPOINT", version: "1",
        aclEnabled: false,
        connectionConfiguration: { secretArn: e.SECRET_ARN, tenantId: e.TENANT, authType: "ENTRA_ID_APP_ONLY", certificateS3Path: { s3BucketName: e.BUCKET, s3KeyName: e.KEY } },
        dataEntityConfiguration: { crawlFiles: true, crawlPages: true, siteUrls: e.SITES.split(",").map((s) => s.trim()).filter(Boolean) },
      },
      ...(e.SCHEDULE === "daily" ? { syncSchedule: { daily: {} } } : {}),
    };
    process.stdout.write(JSON.stringify({ type: "MANAGED_KNOWLEDGE_BASE_CONNECTOR", managedKnowledgeBaseConnectorConfiguration: connector }));
  ' | tmp_json)"
  put_source "$1" sharepoint "$config"
}

gateway() { # gateway <kb id>: the MCP server in front of the knowledge base
  local kb="$1" acct id target config policy
  acct="$(account)"
  policy="$(tmp_json <<EOF
{"Version":"2012-10-17","Statement":[
{"Effect":"Allow","Action":["bedrock:GetKnowledgeBase","bedrock:Retrieve"],"Resource":"arn:aws:bedrock:$AWS_REGION:$acct:knowledge-base/$kb"},
{"Effect":"Allow","Action":"bedrock:AgenticRetrieveStream","Resource":"*"}]}
EOF
)"
  put_role "$GATEWAY_ROLE" bedrock-agentcore.amazonaws.com "arn:aws:bedrock-agentcore:$AWS_REGION:$acct:gateway/*" "$policy"
  id="$(gateway_id)"
  if none "$id"; then
    # AWS_IAM: only signed requests from identities allowed to call InvokeGateway get in.
    id="$(aws bedrock-agentcore-control create-gateway --name "$GATEWAY" --protocol-type MCP --authorizer-type AWS_IAM \
      --role-arn "arn:aws:iam::$acct:role/$GATEWAY_ROLE" --description "MCP server of the $KB knowledge base" \
      --tags "Project=$APP" --query gatewayId --output text)"
  fi
  wait_for "gateway" READY "*FAILED*" aws bedrock-agentcore-control get-gateway --gateway-identifier "$id" --query status --output text
  config="$(KB_ID="$kb" node -e '
    const kb = process.env.KB_ID;
    const about = "the company knowledge base: product data sheets, price lists, policies, manuals, error codes, support procedures and internal wiki pages";
    process.stdout.write(JSON.stringify({ mcp: { connector: { source: { connectorId: "bedrock-knowledge-bases" }, configurations: [
      { name: "Retrieve", description: `Search ${about}. Returns the most relevant passages with their source location.`,
        parameterValues: { knowledgeBaseId: kb, retrievalConfiguration: { managedSearchConfiguration: { numberOfResults: 8 } } },
        parameterOverrides: [
          { path: "$.retrievalQuery.text", description: "What to look for, as a natural-language question or keywords.", visible: true },
          { path: "$.retrievalConfiguration.managedSearchConfiguration.numberOfResults", description: "Number of passages to return (1-100).", visible: true },
        ] },
      { name: "AgenticRetrieveStream",
        parameterValues: { retrievers: [{ description: `Searches ${about}.`, configuration: { knowledgeBase: { knowledgeBaseId: kb } } }],
          agenticRetrieveConfiguration: { foundationModelType: "MANAGED", rerankingModelType: "MANAGED" } } },
    ] } } }));
  ' | tmp_json)"
  target="$(target_id "$id")"
  if none "$target"; then
    target="$(aws bedrock-agentcore-control create-gateway-target --gateway-identifier "$id" --name "$TARGET" \
      --target-configuration "file://$config" --credential-provider-configurations '[{"credentialProviderType":"GATEWAY_IAM_ROLE"}]' \
      --query targetId --output text)"
  else
    aws bedrock-agentcore-control update-gateway-target --gateway-identifier "$id" --target-id "$target" --name "$TARGET" \
      --target-configuration "file://$config" --credential-provider-configurations '[{"credentialProviderType":"GATEWAY_IAM_ROLE"}]' >/dev/null
  fi
  rm -f "$config"
  wait_for "gateway target $TARGET" READY "*FAILED*" \
    aws bedrock-agentcore-control get-gateway-target --gateway-identifier "$id" --target-id "$target" --query status --output text
  echo "MCP URL (put it in .env as KB_MCP_URL): $(gateway_url "$id")"
}

up() {
  local acct bucket kb policy
  acct="$(account)"; bucket="$(cert_bucket)"
  say "Certificate bucket and knowledge base role"
  if ! aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then
    aws s3api create-bucket --bucket "$bucket" --create-bucket-configuration "LocationConstraint=$AWS_REGION" >/dev/null
    aws s3api put-public-access-block --bucket "$bucket" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    aws s3api put-bucket-tagging --bucket "$bucket" --tagging "TagSet=[{Key=Project,Value=$APP}]"
  fi
  policy="$(tmp_json <<EOF
{"Version":"2012-10-17","Statement":[
{"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":"arn:aws:secretsmanager:$AWS_REGION:$acct:secret:$APP-kb-*"},
{"Effect":"Allow","Action":"s3:ListBucket","Resource":"arn:aws:s3:::$bucket"},
{"Effect":"Allow","Action":"s3:GetObject","Resource":["arn:aws:s3:::$bucket/$CERT_KEY","arn:aws:s3:::$bucket/$CERT_KEY.metadata.json"]}]}
EOF
)"
  put_role "$KB_ROLE" bedrock.amazonaws.com "arn:aws:bedrock:$AWS_REGION:$acct:knowledge-base/*" "$policy"

  say "Knowledge base $KB"
  kb="$(kb_id)"
  if none "$kb"; then
    kb="$(aws bedrock-agent create-knowledge-base --name "$KB" --role-arn "arn:aws:iam::$acct:role/$KB_ROLE" \
      --knowledge-base-configuration '{"type":"MANAGED","managedKnowledgeBaseConfiguration":{"embeddingModelType":"MANAGED"}}' \
      --tags "Project=$APP" --query knowledgeBase.knowledgeBaseId --output text)"
  fi
  wait_for "knowledge base" ACTIVE "*FAILED*" aws bedrock-agent get-knowledge-base --knowledge-base-id "$kb" --query knowledgeBase.status --output text

  say "Data sources (sync: $KB_SYNC)"
  confluence_source "$kb"
  sharepoint_source "$kb"

  say "MCP gateway"
  gateway "$kb"
  echo
  echo "Next: infra/kb.sh sync"
}

sync() {
  local kb ids id job
  kb="$(kb_id)"; none "$kb" && { echo "No knowledge base yet. Run infra/kb.sh up." >&2; exit 1; }
  ids="$(aws bedrock-agent list-data-sources --knowledge-base-id "$kb" --query 'dataSourceSummaries[].[dataSourceId,name]' --output text)"
  while read -r id name; do
    [ -n "$id" ] || continue
    say "Sync $name"
    job="$(aws bedrock-agent start-ingestion-job --knowledge-base-id "$kb" --data-source-id "$id" --query ingestionJob.ingestionJobId --output text)"
    for _ in $(seq 1 240); do
      status="$(aws bedrock-agent get-ingestion-job --knowledge-base-id "$kb" --data-source-id "$id" --ingestion-job-id "$job" --query ingestionJob.status --output text)"
      case "$status" in COMPLETE|FAILED|STOPPED) break ;; esac
      sleep 15
    done
    aws bedrock-agent get-ingestion-job --knowledge-base-id "$kb" --data-source-id "$id" --ingestion-job-id "$job" \
      --query 'ingestionJob.{status:status,statistics:statistics,failureReasons:failureReasons}' --output json
  done <<< "$ids"
}

status() {
  local kb id
  kb="$(kb_id)"
  if none "$kb"; then echo "knowledge base: absent"; else
    aws bedrock-agent get-knowledge-base --knowledge-base-id "$kb" --query 'knowledgeBase.{id:knowledgeBaseId,name:name,status:status}' --output table
    aws bedrock-agent list-data-sources --knowledge-base-id "$kb" --query 'dataSourceSummaries[].{id:dataSourceId,name:name,status:status,updated:updatedAt}' --output table
    for id in $(aws bedrock-agent list-data-sources --knowledge-base-id "$kb" --query 'dataSourceSummaries[].dataSourceId' --output text); do
      aws bedrock-agent list-ingestion-jobs --knowledge-base-id "$kb" --data-source-id "$id" --sort-by attribute=STARTED_AT,order=DESCENDING --max-items 1 \
        --query 'ingestionJobSummaries[].{source:dataSourceId,status:status,started:startedAt,statistics:statistics}' --output json
    done
  fi
  id="$(gateway_id)"
  if none "$id"; then echo "gateway: absent"; else echo "MCP URL: $(gateway_url "$id")"; fi
}

ask() {
  local kb query
  [ -n "${1:-}" ] || { echo 'Usage: infra/kb.sh ask "question"' >&2; exit 1; }
  kb="$(kb_id)"
  query="$(QUESTION="$1" node -e 'process.stdout.write(JSON.stringify({ text: process.env.QUESTION }))' | tmp_json)"
  aws bedrock-agent-runtime retrieve --knowledge-base-id "$kb" --retrieval-query "file://$query" \
    --retrieval-configuration '{"managedSearchConfiguration":{"numberOfResults":5}}' \
    --query 'retrievalResults[].{score:score,location:location,text:content.text}' --output json
  rm -f "$query"
}

mcp_config() { # the proxy signs each MCP request with the AWS identity of the person running the IDE
  local id; id="$(gateway_id)"; none "$id" && { echo "No gateway yet. Run infra/kb.sh up." >&2; exit 1; }
  URL="$(gateway_url "$id")" node -e '
    const e = process.env;
    const args = ["mcp-proxy-for-aws-cli@latest", e.URL, "--service", "bedrock-agentcore", "--region", e.AWS_REGION, "--read-only"];
    if (e.AWS_PROFILE) args.push("--profile", e.AWS_PROFILE);
    console.log(JSON.stringify({ mcpServers: { "company-kb": { command: "uvx", args } } }, null, 2));
  '
}

down() {
  local kb id target bucket
  say "Deleting the MCP gateway"
  id="$(gateway_id)"
  if ! none "$id"; then
    target="$(target_id "$id")"
    if ! none "$target"; then
      aws bedrock-agentcore-control delete-gateway-target --gateway-identifier "$id" --target-id "$target" >/dev/null
      for _ in $(seq 1 30); do none "$(target_id "$id")" && break; sleep 4; done
    fi
    aws bedrock-agentcore-control delete-gateway --gateway-identifier "$id" >/dev/null
  fi
  say "Deleting the knowledge base and its data sources"
  kb="$(kb_id)"
  if ! none "$kb"; then
    for id in $(aws bedrock-agent list-data-sources --knowledge-base-id "$kb" --query 'dataSourceSummaries[].dataSourceId' --output text); do
      aws bedrock-agent delete-data-source --knowledge-base-id "$kb" --data-source-id "$id" >/dev/null
    done
    for _ in $(seq 1 60); do
      [ -z "$(aws bedrock-agent list-data-sources --knowledge-base-id "$kb" --query 'dataSourceSummaries[].dataSourceId' --output text)" ] && break; sleep 5
    done
    aws bedrock-agent delete-knowledge-base --knowledge-base-id "$kb" >/dev/null
  fi
  say "Deleting secrets, certificate bucket and roles"
  for id in "$CONFLUENCE_SECRET" "$SHAREPOINT_SECRET"; do
    aws secretsmanager delete-secret --secret-id "$id" --force-delete-without-recovery >/dev/null 2>&1 || true
  done
  bucket="$(cert_bucket)"
  if aws s3api head-bucket --bucket "$bucket" 2>/dev/null; then aws s3 rb "s3://$bucket" --force >/dev/null; fi
  for id in "$KB_ROLE" "$GATEWAY_ROLE"; do
    aws iam delete-role-policy --role-name "$id" --policy-name access 2>/dev/null || true
    aws iam delete-role --role-name "$id" 2>/dev/null || true
  done
  echo "Done. The certificate in $CERT_DIR and the Entra app are yours to remove."
}

case "${1:-}" in
  cert) cert ;;
  up) up ;;
  sync) sync ;;
  status) status ;;
  ask) ask "${2:-}" ;;
  mcp-config) mcp_config ;;
  down) down ;;
  *) sed -n '2,21p' "$0"; exit 1 ;;
esac
