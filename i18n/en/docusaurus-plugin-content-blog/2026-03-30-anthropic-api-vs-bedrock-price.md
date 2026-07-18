---
title: Comparing Anthropic API and AWS Bedrock Pricing
authors: hikari
tags: [AI, AWS, Claude]
image: /img/ogp/2026-03-30-anthropic-api-vs-bedrock-price.webp
---

When using Claude via API, you have more than two options: in addition to calling the **Anthropic API directly**, you can also use it via **AWS Bedrock**, **Google Vertex AI**, or **Microsoft Azure (Azure AI Foundry)**. Base pricing is the same across all routes, but there are differences in batch processing and cloud ecosystem integration.

{/**/}

> Unit: USD / 1M tokens (MTok). Information as of March 2026.

## On-Demand Base Pricing

| Model | Type | Anthropic API | Bedrock | Vertex AI | Azure |
|-------|------|:---:|:---:|:---:|:---:|
| **Claude Opus 4.6** | Input | $5.00 | $5.00 | $5.00 | $5.00 |
| | Output | $25.00 | $25.00 | $25.00 | $25.00 |
| **Claude Sonnet 4.6** | Input | $3.00 | $3.00 | $3.00 | $3.00 |
| | Output | $15.00 | $15.00 | $15.00 | $15.00 |
| **Claude Haiku 4.5** | Input | $1.00 | $1.00 | $1.00 | $1.00 |
| | Output | $5.00 | $5.00 | $5.00 | $5.00 |
| **Claude Sonnet 4.5** | Input | $3.00 | $3.00 | $3.00 | $3.00 |
| | Output | $15.00 | $15.00 | $15.00 | $15.00 |

**Base pricing is identical across all routes.**

Note that Vertex AI regional endpoints carry a **10% surcharge** over global endpoint pricing. Bedrock offers Long Context variants as separate SKUs at the same price; on the Anthropic API, Long Context is integrated into the standard models.

## Cache Pricing

Prompt Caching rates are also identical across all routes.

| Model | Cache Type | Anthropic API | Bedrock | Vertex AI | Azure |
|-------|-----------|:---:|:---:|:---:|:---:|
| **Claude Opus 4.6** | 5-min cache write | $6.25 | $6.25 | $6.25 | $6.25 |
| | 1-hour cache write | $10.00 | $10.00 | $10.00 | $10.00 |
| | Cache read | $0.50 | $0.50 | $0.50 | $0.50 |
| **Claude Sonnet 4.6** | 5-min cache write | $3.75 | $3.75 | $3.75 | $3.75 |
| | 1-hour cache write | $6.00 | $6.00 | $6.00 | $6.00 |
| | Cache read | $0.30 | $0.30 | $0.30 | $0.30 |
| **Claude Haiku 4.5** | 5-min cache write | $1.25 | $1.25 | $1.25 | $1.25 |
| | 1-hour cache write | $2.00 | $2.00 | $2.00 | $2.00 |
| | Cache read | $0.10 | $0.10 | $0.10 | $0.10 |

Cache writes come in two TTL tiers: 5-minute (short-term) and 1-hour (long-term). Longer TTL means higher write cost, but for applications with lengthy system prompts that are read repeatedly, the savings on read pricing more than compensate.

## Batch Processing Pricing

Bedrock, Vertex AI, and the Anthropic API all offer an asynchronous batch API at **50% off** on-demand pricing. Azure does not explicitly list batch pricing at this time.

| Model | Batch Input | Batch Output |
|-------|:---:|:---:|
| **Claude Opus 4.6** | $2.50 | $12.50 |
| **Claude Sonnet 4.6** | $1.50 | $7.50 |
| **Claude Haiku 4.5** | $0.50 | $2.50 |
| **Claude Sonnet 4.5** | $1.50 | $7.50 |

For large-scale batch workloads (log analysis, embedding generation, etc.), any of these routes can cut costs in half.

## Ecosystem Comparison

| Feature | Anthropic API | Bedrock | Vertex AI | Azure |
|---------|:---:|:---:|:---:|:---:|
| Base pricing | Same | Same | Same | Same |
| Regional surcharge | — | — | +10% (regional) | — |
| Batch processing (50% off) | ○ | ○ | ○ | Not listed |
| Tokyo region | — | ○ | ○ | — |
| IAM / audit log integration | — | AWS | Google Cloud | Azure |
| VPC / PrivateLink | — | ○ | ○ | ○ |
| Billing integration | Anthropic direct | AWS | Google Cloud | Azure |
| New feature rollout speed | Fastest | Delayed | Delayed | Delayed |

New features (such as Extended Thinking) roll out to the Anthropic API first; Vertex AI, Bedrock, and Azure typically follow weeks later.

## Which Should You Choose?

- **Simple setup / prototyping**: Anthropic API requires just one API key and gets new features first.
- **Deep AWS integration**: If you need IAM, CloudWatch, or VPC, Bedrock is the natural choice. Tokyo region supported.
- **Deep Google Cloud integration**: Vertex AI fits right in. Note the 10% surcharge on regional endpoints.
- **Deep Azure integration**: Available via Azure AI Foundry, integrated with Azure billing and management.
- **Heavy batch workloads**: Bedrock, Vertex AI, and the Anthropic API all offer 50% off batch pricing.

## References

- [Anthropic API Pricing – Claude API Docs](https://www.anthropic.com/pricing#anthropic-api)
- [AWS Bedrock Pricing – Amazon Web Services](https://aws.amazon.com/bedrock/pricing/)
- [Vertex AI Pricing – Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Claude in Microsoft Azure AI Foundry – Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry)
