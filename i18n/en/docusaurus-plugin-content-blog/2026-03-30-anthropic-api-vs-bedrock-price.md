---
title: Comparing Anthropic API and AWS Bedrock Pricing
authors: hikari
tags: [AI, AWS, Claude]
image: /img/ogp/2026-03-30-anthropic-api-vs-bedrock-price.png
---

When using Claude via API, you have two options: call the **Anthropic API directly** or use it **via AWS Bedrock**. Base pricing is essentially the same, but there are differences in batch processing and AWS ecosystem integration.

<!-- truncate -->

> Unit: USD / 1M tokens (MTok). Information as of March 2026.

## On-Demand Base Pricing

| Model | Type | Anthropic API | Bedrock |
|-------|------|:---:|:---:|
| **Claude Opus 4.6** | Input | $5.00 | $5.00 |
| | Output | $25.00 | $25.00 |
| **Claude Sonnet 4.6** | Input | $3.00 | $3.00 |
| | Output | $15.00 | $15.00 |
| **Claude Haiku 4.5** | Input | $1.00 | $1.00 |
| | Output | $5.00 | $5.00 |
| **Claude Sonnet 4.5** | Input | $3.00 | $3.00 |
| | Output | $15.00 | $15.00 |

**Base pricing is identical between the Anthropic API and Bedrock.**

Bedrock offers Long Context variants as separate SKUs, but at the same price. On the Anthropic API side, Long Context is integrated into the standard models with no separate SKU.

## Cache Pricing

Prompt Caching rates are also identical between the two.

| Model | Cache Type | Anthropic API | Bedrock |
|-------|-----------|:---:|:---:|
| **Claude Opus 4.6** | 5-min cache write | $6.25 | $6.25 |
| | 1-hour cache write | $10.00 | $10.00 |
| | Cache read | $0.50 | $0.50 |
| **Claude Sonnet 4.6** | 5-min cache write | $3.75 | $3.75 |
| | 1-hour cache write | $6.00 | $6.00 |
| | Cache read | $0.30 | $0.30 |
| **Claude Haiku 4.5** | 5-min cache write | $1.25 | $1.25 |
| | 1-hour cache write | $2.00 | $2.00 |
| | Cache read | $0.10 | $0.10 |

Cache writes come in two TTL tiers: 5-minute (short-term) and 1-hour (long-term). Longer TTL means higher write cost, but for applications with lengthy system prompts that are read repeatedly, the savings on read pricing more than compensate.

## Batch Processing Pricing (Bedrock)

Bedrock offers an asynchronous batch API at **50% off** on-demand pricing.

| Model | Batch Input | Batch Output |
|-------|:---:|:---:|
| **Claude Opus 4.6** | $2.50 | $12.50 |
| **Claude Sonnet 4.6** | $1.50 | $7.50 |
| **Claude Haiku 4.5** | $0.50 | $2.50 |
| **Claude Sonnet 4.5** | $1.50 | $7.50 |

The Anthropic API also supports batch processing, but it is listed differently on the pricing page and is omitted from this comparison. If you run large-scale batch workloads (log analysis, embedding generation, etc.), routing through Bedrock can cut costs in half.

## Which Should You Choose?

- **Cost-focused, heavy batch usage**: Base pricing is the same, so no difference there. If you rely heavily on batch processing, Bedrock wins with 50% off.
- **Deep AWS integration**: If you need IAM auth, CloudWatch logging, or private VPC connectivity, Bedrock is the only option.
- **Simple setup / prototyping**: Anthropic API is easier to get started—just one API key, no AWS configuration needed.
