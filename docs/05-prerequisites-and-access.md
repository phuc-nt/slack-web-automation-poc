# Prerequisites and Access

This document is for whoever prepares to reproduce the POCs in their own organisation. It lists every tool, service and feature the platform uses, and for each one what has to be installed, registered or granted, and by whom. Most of the waiting time in a reproduction is in these requests, so send them first.

This document covers the platform as a whole, with the full detail of each item. Each POC's document has the short list for that POC, written for whoever approves the requests: [web form automation](poc/01-web-form-automation.md), section 7, and [daily report](poc/02-daily-report.md), section 7.

How to deploy once everything is in place is in [03-aws-deployment.md](03-aws-deployment.md). The local run is in the [README](../README.md).

## 1. What each stage needs

Reproduce in stages. Each stage needs more access than the one before, and the first needs none.

| Stage | What runs | Needs |
|---|---|---|
| 1. Local, no outside system | `npm test`, `npm run demo`: the web form flow against the mock portal | Section 2 only |
| 2. Local with an LLM | Free-text pre-fill; `npm run report -- --sample` | Plus one LLM provider (section 5) |
| 3. Local with Slack | `/visitor` in a real workspace | Plus Slack (section 3) |
| 4. Local with the daily report | `/daily-report`, reading real channels and Jira | Plus the report's Slack scopes and Jira (sections 3 and 4) |
| 5. On AWS | Both POCs in one task, LLM on Amazon Bedrock | Plus AWS (section 6) |
| 6. A real web app | The form flow against the organisation's web app | Plus the web app owner's agreement (section 7) |

## 2. Tools on the workstation

Nothing here needs approval beyond what the organisation requires for installing software.

| Tool | Version | Used for | Stage |
|---|---|---|---|
| Git | any recent | Getting the code | 1 |
| Node.js and npm | 22 or newer | Running the app, the scripts and the tests | 1 |
| Chromium for Playwright | installed by `npx playwright install chromium` | The browser the worker drives. The download is about 150 MB and needs access to Playwright's download host | 1 |
| Docker, with `buildx` | any recent | Building the `linux/arm64` image. On an x86 machine this runs under emulation and is slow | 5 |
| AWS CLI | v2 | Everything in `infra/poc.sh` | 5 |
| Bash | 3.2 or newer | `infra/poc.sh`. On Windows, use WSL | 5 |
| `cfn-lint` (optional) | any recent | Checking the templates after editing them | 5 |

Network access the workstation needs: the npm registry, Playwright's download host, the container base image registry (`mcr.microsoft.com`), your AWS Region's endpoints, `slack.com`, your Atlassian site, and the LLM provider. Behind a corporate proxy, request these before starting.

## 3. Slack

| What | Why | Who grants it |
|---|---|---|
| A workspace where you may create and install a custom app | The platform is a custom app created from `slack-app-manifest.yaml` | A workspace owner or admin. Many workspaces require admin approval for every app install; on Enterprise Grid an organisation admin may have to approve as well. A separate test workspace avoids the wait |
| Socket Mode and an app-level token with the scope `connections:write` | The app connects out to Slack over a WebSocket, so no public URL is needed. This is `SLACK_APP_TOKEN` (`xapp-…`) | Whoever creates the app, under Basic Information → App-Level Tokens |
| The bot token | `SLACK_BOT_TOKEN` (`xoxb-…`), issued when the app is installed | Issued on install |
| The bot invited to each channel | It reads only the channels in `REPORT_CHANNELS` and posts to `REPORT_POST_CHANNEL`. Private channels must invite it explicitly | A member of each channel: `/invite @<bot name>` |
| The channel IDs | `REPORT_CHANNELS` and `REPORT_POST_CHANNEL` take IDs, not names | Anyone in the channel: channel details → the ID at the bottom |

Bot scopes the manifest asks for. Reviewers usually ask what each one is for:

| Scope | Used for | POC |
|---|---|---|
| `commands` | The slash commands `/visitor` and `/daily-report`, and the global shortcut | Both |
| `chat:write` | Posting results, approval requests and the report | Both |
| `im:write` | Opening a direct message with the requester, so personal data stays out of channels | Web form |
| `files:write` | Uploading the confirmation screenshot | Web form |
| `channels:history`, `groups:history` | Reading the day's messages in public and private channels the bot was invited to | Daily report |
| `channels:read`, `groups:read` | Reading the channels' names for the report header | Daily report |
| `users:read` | Turning user IDs into display names in the transcript | Daily report |
| `chat:write.customize` | **Test data only**: `npm run seed` posts sample messages under invented names. Remove it from the manifest for anything beyond a trial | Neither |

Things to settle with the workspace's admin before asking:

- The history scopes let the bot read every message of the channels it is in, and the daily report sends that text to the LLM provider. This is the item a security review will focus on.
- Only one running process may use the app's tokens. Use a separate Slack app for each environment (laptop, AWS).
- After the manifest changes (a new command or scope), the app must be reinstalled, which may need approval again.

## 4. Atlassian: Jira Cloud and Confluence Cloud

| What | Why | Who grants it |
|---|---|---|
| A Jira Cloud site and a project to report on | `JIRA_BASE_URL` (`https://<site>.atlassian.net`) and `JIRA_PROJECT_KEY`, or a full query in `JIRA_JQL` | A Jira admin, or the project's admin |
| An Atlassian account with the **Browse projects** permission on that project | The report reads issues through `POST /rest/api/3/search/jql`. It writes nothing | The project's admin |
| An API token of that account | `JIRA_EMAIL` and `JIRA_API_TOKEN`, sent as HTTP Basic authentication | The account's owner, at `id.atlassian.com` → Security → API tokens. Tokens expire; note the date |
| For test data only: the **Create issues** permission | `npm run seed:jira` creates 17 sample issues labelled `daily-report-seed` | The project's admin. Use a scratch project |

- An API token carries every permission of its account, across Jira and Confluence. Ask for a **dedicated account** that can browse only the projects the report covers, instead of using a personal one. On some Atlassian plans this account counts as a paid user.
- If the organisation controls API tokens centrally (an API token policy, or an IP allowlist on the site), the admin has to allow the token and, on AWS, the deployment's outbound IP.
- Jira Server and Data Center are not supported by the code as written: the endpoint and the authentication differ.

**Confluence is not built.** It is listed here because it is the next planned connection (architecture document, section 3.6). When it is built it will need, on Confluence Cloud: the same kind of account and API token, **View** permission on the spaces it reads, and **Add page** permission on the one space it writes to. Decide the space and the direction (read, write, or both) before requesting access.

## 5. LLM provider

One of the two. On AWS the templates use Amazon Bedrock.

| Provider | What to register or request | Notes |
|---|---|---|
| Amazon Bedrock | An AWS account in which Bedrock answers (see below), a model served in your Region, and `bedrock:InvokeModel` on it for your own identity when testing from a laptop | No key. The task's role is created by the template |
| OpenRouter | An account, prepaid credit, and an API key (`OPENROUTER_API_KEY`) | Text leaves your organisation to a third party. Check the provider's data policy against your own before sending real chat |

Bedrock has three separate gates. Check all three early with the two commands in the deployment document, section 7.1:

| Gate | What to do |
|---|---|
| The model is offered in your Region | `aws bedrock list-foundation-models --region <region>`. Some models are served only through a cross-Region inference profile, which some organisations forbid |
| The model's provider requires an agreement | Some third-party models need a one-time use-case form or a Marketplace subscription, done in the Bedrock console by someone with `aws-marketplace:Subscribe` |
| The account itself may call Bedrock | New accounts can be refused with `Operation not allowed` whatever the IAM policy says. Only AWS Support can lift this. **Open the case first**: it has the longest wait of anything in this document |

Whichever provider is used, get a decision from the data owner on what may be sent: the web form sends one sentence that may contain a visitor's name and phone number; the daily report sends a full day of project chat and the issue list.

## 6. AWS

### 6.1 Account and Region

| What | Why |
|---|---|
| An AWS account, or a sandbox account from your platform team | Everything is created inside one account and one Region |
| A Region that offers Fargate on `ARM64`, and the Bedrock model | Pick it before anything else: the outbound IP, the prices and the model list all depend on it |
| Permission to create a VPC, a NAT Gateway and an Elastic IP | Organisations with a central network team often forbid this in member accounts. If so, ask for a private subnet with a route to a NAT that has a fixed address, and adapt `infra/platform.yaml` to take the subnet as a parameter |
| Permission to create IAM roles | The template creates two roles, so the deploy needs `CAPABILITY_IAM`. If roles must carry a permissions boundary or a name prefix in your organisation, add them to the template |
| Billing visibility | To check the estimate in [04-operating-cost.md](04-operating-cost.md) against the bill; optional but recommended |

### 6.2 Permissions for the person who deploys

`AdministratorAccess` in a sandbox account is the simplest. Where that is not possible, the identity that runs `infra/poc.sh` needs these, limited to the one Region:

| Service | Actions | Used for |
|---|---|---|
| CloudFormation | Create, update, delete and describe stacks and change sets | Both stacks |
| ECR | Create and delete a repository, set its lifecycle policy, `GetAuthorizationToken`, push and describe images | The image |
| Secrets Manager | Create, tag, describe and delete a secret; `PutSecretValue` | The secret and its value |
| EC2 | Create, tag, describe and delete: VPC, subnets, internet gateway, route tables and routes, security group, NAT Gateway; allocate and release an Elastic IP | The network |
| IAM | Create, tag, get and delete roles; attach and put role policies; `PassRole` for the two roles to ECS; `CreateServiceLinkedRole` the first time ECS is used in the account | The execution role and the task role |
| ECS | Create and delete a cluster and a service; register and deregister task definitions; `RunTask`, describe and list tasks | The service and the one-off verification task |
| CloudWatch Logs | Create and delete a log group, set retention, read and tail log events | Logs |
| Resource Groups Tagging API | `tag:GetResources` | The inventory in `infra/poc.sh status` |
| Bedrock | `ListFoundationModels`, `InvokeModel` on the chosen model | Only for testing the model from a laptop |
| STS | `GetCallerIdentity` | Sign-in check |

### 6.3 What the platform itself is given

Created by the template. Nothing to request, but a security reviewer will ask:

| Role | Permissions | Used by |
|---|---|---|
| Execution role | The AWS managed policy `AmazonECSTaskExecutionRolePolicy` (pull the image, write logs) and `secretsmanager:GetSecretValue` on the one secret | ECS, when it starts the task |
| Task role | `bedrock:InvokeModel` on the one model | The application |

The task has no inbound rule and no public IP in the `private-nat` profile, and may only open outbound connections on TCP 443.

### 6.4 Service quotas

The defaults of a normal account are enough. Check them in a new or shared account, where they can be zero or already used up:

| Quota | Needed |
|---|---|
| Fargate On-Demand vCPU | 2: one for the service, one more while `verify` runs |
| Elastic IP addresses in the Region | 1 |
| VPCs in the Region | 1 |
| NAT Gateways in the Availability Zone | 1 |
| Bedrock on-demand tokens per minute for the model | A few thousand for a form request; about 7,000 for a daily report of the measured size, up to about 45,000 for one at its upper bound. The output tokens a call allows count in full. The platform makes one call at a time |

## 7. The target web application

Needed only for stage 6. The first five stages use the mock portal that ships with the code.

| What | Why | Who grants it |
|---|---|---|
| Written agreement that automated use is allowed | Many web applications forbid it in their terms; an account can be locked | The web app's owner |
| A dedicated account with the least permissions that can do the task | Everything the platform does is recorded under this account. It must be exempt from CAPTCHA and one-time codes, which the worker cannot answer | The web app's owner |
| The deployment's outbound IP on the allowlist, when the web app has one | The reason for the NAT Gateway and the Elastic IP. Deploy and confirm the address first (deployment document, 4.1), then register it | The web app's owner or their network team |
| A test environment, or agreed test records | The worker's logic is written and debugged against real screens | The web app's owner |
| Notice of screen changes | A changed screen stops the worker until its logic is updated | The web app's owner |

## 8. Checklist to send

Requests in the order of their usual waiting time, longest first.

| # | Request | To | Needed for |
|---|---|---|---|
| 1 | Confirm Bedrock answers in the account and Region; if not, an AWS Support case | AWS account owner, AWS Support | Stage 5 |
| 2 | Agreement, a dedicated account and an IP allowlist entry for the web app | Web app owner | Stage 6 |
| 3 | A decision on what text may be sent to which LLM provider | Data owner or security | Stages 2 to 6 with real data |
| 4 | An AWS account or sandbox with the permissions in 6.2, including VPC and IAM role creation | Cloud platform team | Stage 5 |
| 5 | Approval to install a custom Slack app with the scopes in section 3 | Slack workspace admin | Stages 3 to 5 |
| 6 | A dedicated Atlassian account with Browse projects on the reported projects, and its API token | Jira admin | Stages 4 and 5 |
| 7 | The bot invited to the report's channels | A member of each channel | Stages 4 and 5 |
| 8 | Workstation tools and network access (section 2) | IT | Stage 1 |

Record for each credential who owns it and when it expires. Revoke the trial's credentials when the trial ends.
