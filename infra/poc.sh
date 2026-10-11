#!/usr/bin/env bash
# Life cycle of the POC on AWS. Everything it creates belongs to two CloudFormation stacks
# and carries the tag Project=<app>, so it can be listed and removed completely.
#
#   infra/poc.sh up [profile]   create or update everything (profile: private-nat | public)
#   infra/poc.sh build          build and push a new image, then roll the task
#   infra/poc.sh status         stacks, running task, outbound IP, every tagged resource
#   infra/poc.sh verify [YYYY-MM-DD] [--post]
#                               one-off task: outbound IP, the form flow, the daily report
#                               of that day (printed; posted to Slack only with --post)
#   infra/poc.sh logs [min]     app logs of the last [min] minutes (default 15)
#   infra/poc.sh pause|resume   stop or start the task (the NAT Gateway keeps billing)
#   infra/poc.sh down           delete the platform stack; image and secret stay (cents per month)
#   infra/poc.sh down --all     delete everything
#
# Needs: aws CLI v2 signed in (set AWS_PROFILE when using a named profile), AWS_REGION,
# docker, node, and a filled .env.
# Your own settings (AWS_PROFILE, AWS_REGION, TIME_ZONE, ...) can go in infra/local.env, which
# git ignores; it overrides the profile. See infra/local.env.example.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL=infra/local.env
if [ -f "$LOCAL" ]; then set -a; . "$LOCAL"; set +a; fi
APP="${APP:-slack-web-automation-poc}"
BASE="$APP-base"
export AWS_REGION="${AWS_REGION:-$(aws configure get region || true)}"
export AWS_PAGER=""
[ -n "$AWS_REGION" ] || { echo "Set AWS_REGION to the Region to deploy in." >&2; exit 1; }
TAGS="Project=$APP"

say() { printf '\n== %s\n' "$*"; }
output() { aws cloudformation describe-stacks --stack-name "$1" --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text 2>/dev/null; }
stack_status() { aws cloudformation describe-stacks --stack-name "$1" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo ABSENT; }
# One value from .env, without printing the file.
dotenv() { node --env-file-if-exists=.env -e "process.stdout.write(process.env['$1'] || '')"; }

deploy_base() {
  say "Base stack $BASE (image repository, secret)"
  aws cloudformation deploy --stack-name "$BASE" --template-file infra/base.yaml --tags "$TAGS" --no-fail-on-empty-changeset
}

put_secret() {
  say "Secret value from .env"
  local file; file="$(mktemp)"; chmod 600 "$file"
  node --env-file=.env -e '
    const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "PORTAL_USERNAME", "PORTAL_PASSWORD"];
    const optional = ["JIRA_EMAIL", "JIRA_API_TOKEN"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) { console.error("Missing in .env: " + missing.join(", ")); process.exit(1); }
    const value = Object.fromEntries([...required, ...optional].map((k) => [k, process.env[k] || "unset"]));
    process.stdout.write(JSON.stringify(value));
  ' > "$file" || { rm -f "$file"; exit 1; }
  aws secretsmanager put-secret-value --secret-id "$BASE" --secret-string "file://$file" --query 'VersionId' --output text >/dev/null
  rm -f "$file"
  echo "written (6 keys)"
}

build_image() {
  local repo tag; repo="$(output "$BASE" RepositoryUri)"; tag="$(date +%Y%m%d-%H%M%S)"
  say "Image $repo:$tag (linux/arm64)" >&2
  aws ecr get-login-password | docker login --username AWS --password-stdin "${repo%%/*}" >&2 || return 1
  docker build --quiet --platform linux/arm64 --provenance=false -t "$repo:$tag" . >&2 || return 1
  # The image is about 1 GB compressed; a dropped upload resumes from the layers already pushed.
  docker push --quiet "$repo:$tag" >&2 || docker push --quiet "$repo:$tag" >&2 || docker push --quiet "$repo:$tag" >&2 || return 1
  echo "$repo:$tag"
}

latest_image() {
  local repo tag; repo="$(output "$BASE" RepositoryUri)"
  tag="$(aws ecr describe-images --repository-name "$BASE" --query 'sort_by(imageDetails[?imageTags],&imagePushedAt)[-1].imageTags[0]' --output text 2>/dev/null || true)"
  [ -n "$tag" ] && [ "$tag" != "None" ] && echo "$repo:$tag"
}

deploy_platform() { # image, then extra parameter overrides
  local image="$1"; shift
  say "Platform stack $APP"
  # A stack whose first creation failed cannot be updated; it holds nothing, so remove it.
  if [ "$(stack_status "$APP")" = ROLLBACK_COMPLETE ]; then
    aws cloudformation delete-stack --stack-name "$APP"
    aws cloudformation wait stack-delete-complete --stack-name "$APP"
  fi
  aws cloudformation deploy --stack-name "$APP" --template-file infra/platform.yaml --tags "$TAGS" \
    --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
    --parameter-overrides "ImageUri=$image" "SecretArn=$(output "$BASE" SecretArn)" "$@"
}

case "${1:-}" in
  up)
    profile="infra/profiles/${2:-private-nat}.env"
    [ -f "$profile" ] || { echo "No profile $profile" >&2; exit 1; }
    set -a; . "$profile"; if [ -f "$LOCAL" ]; then . "$LOCAL"; fi; set +a
    deploy_base
    put_secret
    image="$(latest_image || true)"; [ -n "$image" ] || image="$(build_image)" || exit 1
    deploy_platform "$image" "NetworkProfile=$NETWORK_PROFILE" "Cpu=$CPU" "Memory=$MEMORY" \
      "BedrockModel=$BEDROCK_MODEL" "TimeZone=$TIME_ZONE" "ReportTime=$REPORT_TIME" "DesiredCount=1" \
      "ReportChannels=$(dotenv REPORT_CHANNELS)" "ReportPostChannel=$(dotenv REPORT_POST_CHANNEL)" \
      "JiraBaseUrl=$(dotenv JIRA_BASE_URL)" "JiraProjectKey=$(dotenv JIRA_PROJECT_KEY)"
    "$0" status
    ;;

  build)
    image="$(build_image)" || exit 1
    deploy_platform "$image"
    ;;

  pause)  deploy_platform "$(latest_image)" DesiredCount=0 ;;
  resume) deploy_platform "$(latest_image)" DesiredCount=1 ;;

  status)
    say "Stacks"
    for s in "$BASE" "$APP"; do echo "$s: $(stack_status "$s")"; done
    if [ "$(stack_status "$APP")" != ABSENT ]; then
      echo "network profile: $(output "$APP" NetworkProfile)   outbound IP: $(output "$APP" EgressIp)"
      aws ecs describe-services --cluster "$APP" --services "$APP" \
        --query 'services[0].{desired:desiredCount,running:runningCount,rollout:deployments[0].rolloutState,image:taskDefinition}' --output table
    fi
    say "Every resource tagged $TAGS"
    aws resourcegroupstaggingapi get-resources --tag-filters "Key=Project,Values=$APP" \
      --query 'ResourceTagMappingList[].ResourceARN' --output text | tr '\t' '\n' | sed "s/arn:aws:\([a-z0-9-]*\):[a-z0-9-]*:[0-9]*:/\1  /" | sort
    ;;

  verify)
    say "One-off task: outbound IP, the form flow, the daily report - model on Bedrock, no Slack connection"
    request='Register guest Mr. Pham Van An from Example Trading Co. for tomorrow 9:00-10:00 to meet Ms. Vu at Tower B floor 3, purpose: site survey'
    overrides="$(node -e '
      const [request, ...reportArgs] = process.argv.slice(1);
      const ip = `node -e "fetch(\\"https://checkip.amazonaws.com\\").then(r=>r.text()).then(t=>console.log(\\"OUTBOUND_IP \\"+t.trim()))"`;
      const cmd = `${ip} && node scripts/run-local-demo.js --yes "${request}" && node scripts/run-daily-report.js ${reportArgs.join(" ")}`;
      console.log(JSON.stringify({ containerOverrides: [{ name: "slack-app", command: ["sh", "-c", cmd] }] }));
    ' "$request" "${@:2}")"
    assign=DISABLED; [ "$(output "$APP" NetworkProfile)" = public ] && assign=ENABLED
    task="$(aws ecs run-task --cluster "$APP" --task-definition "$APP" --launch-type FARGATE --overrides "$overrides" \
      --tags "key=Project,value=$APP" \
      --network-configuration "awsvpcConfiguration={subnets=[$(output "$APP" TaskSubnet)],securityGroups=[$(output "$APP" TaskSecurityGroup)],assignPublicIp=$assign}" \
      --query 'tasks[0].taskArn' --output text)"
    echo "task ${task##*/}; waiting for it to finish"
    aws ecs wait tasks-stopped --cluster "$APP" --tasks "$task"
    aws ecs describe-tasks --cluster "$APP" --tasks "$task" \
      --query 'tasks[0].containers[].{name:name,exit:exitCode,reason:reason}' --output table
    aws logs get-log-events --log-group-name "/ecs/$APP" --log-stream-name "slack/slack-app/${task##*/}" \
      --start-from-head --query 'events[].message' --output text | tr '\t' '\n'
    echo "expected outbound IP: $(output "$APP" EgressIp)"
    ;;

  logs)
    aws logs tail "/ecs/$APP" --since "${2:-15}m" --format short
    ;;

  down)
    say "Deleting platform stack $APP"
    aws cloudformation delete-stack --stack-name "$APP"
    aws cloudformation wait stack-delete-complete --stack-name "$APP"
    if [ "${2:-}" = "--all" ]; then
      say "Deleting base stack $BASE"
      aws cloudformation delete-stack --stack-name "$BASE"
      aws cloudformation wait stack-delete-complete --stack-name "$BASE"
      # A secret left "scheduled for deletion" would block the next "up" for its recovery window.
      aws secretsmanager delete-secret --secret-id "$BASE" --force-delete-without-recovery >/dev/null 2>&1 || true
      aws ecs list-task-definitions --family-prefix "$APP" --query 'taskDefinitionArns' --output text | tr '\t' '\n' | while read -r td; do
        [ -n "$td" ] && aws ecs deregister-task-definition --task-definition "$td" >/dev/null
      done
    fi
    "$0" status
    ;;

  *)
    sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
    ;;
esac
