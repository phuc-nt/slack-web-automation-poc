# Operating Cost Estimate

This document is for whoever approves or budgets the platform. It estimates the monthly cost of running it, shows where the money goes, and gives the formula and the commands to redo the estimate for another Region, model or volume.

The figures are an example, not a quote. They use AWS list prices of one Region (Asia Pacific, Sydney) read from the AWS Price List API in October 2026, in USD, without tax, discounts or free-tier credits. Prices differ by Region and change over time: section 5 shows how to refresh them.

## 1. Summary

| State of the environment | USD per month |
|---|---|
| Running all month, fixed outbound IP (profile `private-nat`) | about 82 |
| Running all month, no fixed IP (profile `public`) | about 39 |
| Task stopped, network kept (`pause`) | about 47 |
| Only the image and the secret kept (`down`) | about 0.5 |
| Everything removed (`down --all`) | 0 |

- The cost is almost entirely fixed. It is the always-on task and the network, and it does not grow with the number of requests at POC volumes.
- The fixed outbound IP accounts for more than half: about 47 USD a month for the NAT Gateway and the address. Only a web app that allowlists the caller's IP needs it.
- LLM use is negligible at this scale: about 0.05 USD a month for 500 form requests and 22 daily reports.
- A verification session of a few hours costs well under 1 USD if it ends with `down`.

The profiles and the commands are described in [03-aws-deployment.md](03-aws-deployment.md).

This document covers the platform as a whole, item by item. Each POC's document carries a short estimate of what that POC costs by itself and what it adds to a platform that already runs: [web form automation](poc/01-web-form-automation.md), section 8, and [daily report](poc/02-daily-report.md), section 8.

## 2. AWS, item by item

A month is 730 hours. One task of 1 vCPU and 2 GB on Fargate, `ARM64`.

| Item | Unit price | Quantity | `private-nat` | `public` |
|---|---|---|---|---|
| Fargate vCPU | 0.03885 USD per vCPU-hour | 1 × 730 | 28.4 | 28.4 |
| Fargate memory | 0.00426 USD per GB-hour | 2 × 730 | 6.2 | 6.2 |
| NAT Gateway, hourly | 0.059 USD per hour | 730 | 43.1 | 0 |
| NAT Gateway, traffic | 0.059 USD per GB | a few GB | under 0.5 | 0 |
| Public IPv4 address | 0.005 USD per hour | 730 | 3.7 | 3.7 |
| Secrets Manager | 0.40 USD per secret per month | 1 | 0.4 | 0.4 |
| CloudWatch Logs | 0.67 USD per GB ingested, 0.033 USD per GB-month stored | well under 1 GB | under 0.3 | under 0.3 |
| ECR storage | 0.10 USD per GB-month | about 1 GB per image, 3 kept | 0.1 to 0.3 | 0.1 to 0.3 |
| Amazon Bedrock | section 3 | | about 0.05 | about 0.05 |
| **Total** | | | **about 82** | **about 39** |

Not charged: the VPC, subnets, route tables, the internet gateway, the security group, the ECS cluster, IAM roles and CloudFormation itself.

NAT traffic is small because the platform moves little data. The largest single item is the image pull at each task start, about 1 GB, about 0.06 USD.

## 3. LLM

Cost per call is `input tokens × input price + output tokens × output price`. Measured sizes:

| Job | Input tokens | Output tokens | What drives the size |
|---|---|---|---|
| Web form pre-fill | about 510 | about 130 | Fixed prompt; the sentence is short |
| Daily report | about 2,550 | about 670 | The day's chat (25 messages here) and the issue list (34 issues here). Capped at 120,000 characters of chat, roughly 30,000 to 40,000 tokens |

With Amazon Bedrock, `zai.glm-4.7-flash`, at 0.07 USD per million input tokens and 0.41 USD per million output tokens:

| Volume | USD per month |
|---|---|
| One form request | 0.00009 |
| One daily report of the measured size | 0.00045 |
| 500 form requests and 22 reports | about 0.05 |
| 10,000 form requests and 22 reports for each of 20 projects | about 1.1 |
| One report at the cap (40,000 input tokens, 1,500 output) | about 0.003 |

A larger model changes the picture less than it may seem. At 3 USD per million input tokens and 15 USD per million output tokens, about forty times the prices above, 500 form requests and 22 reports cost about 2 USD a month. The model should be chosen on quality (deployment document, section 7.3), not on price.

With OpenRouter the same formula applies with that provider's price for the chosen model, billed by OpenRouter and not on the AWS bill.

## 4. What changes the total

| Change | Effect |
|---|---|
| No web app with an IP allowlist | Use profile `public`: minus about 43 USD |
| Run only during working hours (for example 10 hours on 22 days) | Fargate falls from about 35 to about 10 USD with `pause` and `resume`. The NAT Gateway keeps billing unless the stack is removed, and removing it releases the registered IP |
| A smaller task | A deployment without the browser POC needs far less than 1 vCPU and 2 GB; 0.25 vCPU and 0.5 GB would be about 9 USD a month. Not measured |
| More users | None until one task is no longer enough. The platform runs exactly one task by design; scaling beyond that is a redesign, not a setting (architecture document, section 8) |
| More projects in the daily report | LLM cost only, a fraction of a cent per report |
| Longer log retention | 0.033 USD per GB-month; negligible at this volume |
| A second environment (for example test and production) | Doubles everything, including a second IP to register |
| Savings Plans | Fargate is eligible for Compute Savings Plans; the NAT Gateway is not |

## 5. Redoing the estimate

Formula for a month of `H` hours of task time, with the network up all month:

```
Fargate   = (vCPU × price_vCPU_hour + GB × price_GB_hour) × H
Network   = (price_NAT_hour + price_IPv4_hour) × 730 + GB_through_NAT × price_NAT_GB     (private-nat)
          = price_IPv4_hour × H                                                          (public)
LLM       = Σ calls × (input_tokens × price_in + output_tokens × price_out)
Fixed     = secrets × 0.40 + logs + image storage
```

Current prices for your Region:

- The [AWS Pricing Calculator](https://calculator.aws/) for Fargate, NAT Gateway, public IPv4 addresses, Secrets Manager, CloudWatch Logs and ECR.
- The [Amazon Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) for the model.
- Or the Price List API, which is served from a few Regions only (`us-east-1` among them) whatever Region the prices are for:

```bash
aws pricing get-products --region us-east-1 --service-code AmazonECS \
  --filters Type=TERM_MATCH,Field=regionCode,Value=<region> --max-results 100
```

Token counts for your own data are in the application log: with Bedrock, every model call writes an `llm_call` line with `input`, `output` and `ms`.

After the first full month, compare with the bill: in AWS Cost Explorer, filter by the tag `Project` (activate it as a cost allocation tag first) to see exactly what the deployment cost.

## 6. Costs outside AWS

| Item | Cost | Notes |
|---|---|---|
| Slack | None added | The app is a custom app in an existing workspace. Check the workspace plan's limit on the number of installed apps |
| Jira Cloud, Confluence Cloud | None added | Read through the REST API with an existing account. A dedicated service account may count as a paid user, depending on the Atlassian plan |
| OpenRouter, when used | Per token, prepaid credit | Only when `LLM_PROVIDER=openrouter` |
| The target web app | None from the platform | Its owner may charge for a service account or for access |
| People | Not estimated | Each real web app needs its own form-filling logic, and upkeep when its screens change. Someone has to own the deployment and the credentials |

## 7. Controls worth setting

- An AWS Budget with an alert on the tag `Project`, a little above the expected monthly total.
- `infra/poc.sh status` after every `down`: an empty list is the proof that nothing is left billing.
- Do not leave a `private-nat` environment idle: stopped or not, it costs about 47 USD a month.
