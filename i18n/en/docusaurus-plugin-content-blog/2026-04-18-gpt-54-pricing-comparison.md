---
title: "GPT-5.4 / GPT-5.4 mini / GPT-5.4 nano / GPT-4o / GPT-4o mini: Pricing and Performance Comparison"
tags: [AI, OpenAI]
image: /img/ogp/2026-04-18-gpt-54-pricing-comparison.png
draft: true
---

This article compares the pricing, specs, and performance of OpenAI's current API models: GPT-5.4, GPT-5.4 nano, GPT-5.4 mini, GPT-4o, and GPT-4o mini, along with guidance on which model to choose for different use cases.

{/**/}

> Unit: USD / 1M tokens (MTok). Information as of April 2026.

## Pricing Comparison

| Model | Input | Cached Input | Output |
|-------|------:|-------------:|-------:|
| **GPT-5.4** | $2.50 | $1.25 | $15.00 |
| **GPT-5.4 mini** | $0.75 | $0.075 | $4.50 |
| **GPT-5.4 nano** | $0.20 | $0.02 | $1.25 |
| **GPT-4o** | $2.50 | $1.25 | $10.00 |
| **GPT-4o mini** | $0.15 | $0.075 | $0.60 |

GPT-4o mini is the cheapest on both input and output, but its knowledge cutoff is October 2023, making it unsuitable for tasks requiring up-to-date information. GPT-5.4 nano has nearly the same input cost as GPT-4o mini, while offering GPT-5.4 family quality and knowledge up to August 2025. GPT-5.4 (flagship) matches GPT-4o on input cost but has a high output cost of $15.00/MTok, making it best suited for tasks that demand top-quality reasoning.

When using regional processing endpoints, a **10% surcharge** applies to the GPT-5.4 series.

## Specs Comparison

| Model | Context | Max Output | Image Input | Knowledge Cutoff |
|-------|:-------:|:----------:|:-----------:|:----------------:|
| **GPT-5.4** | 400K | 128K | ✓ | August 2025 |
| **GPT-5.4 mini** | 400K | 128K | ✓ | August 2025 |
| **GPT-5.4 nano** | 400K | 128K | ✓ | August 2025 |
| **GPT-4o** | 128K | 16,384 | ✓ | October 2023 |
| **GPT-4o mini** | 128K | 16,384 | ✓ | October 2023 |

The GPT-5.4 series dramatically expands the context window to **400K tokens** and supports up to 128K tokens of output. GPT-4o and GPT-4o mini are capped at 128K context and 16K output.

## Performance Comparison

### GPT-5.4

The flagship model of the GPT-5.4 family. It represents the highest intelligence available from OpenAI in the current generation, significantly outperforming GPT-5.4 mini in complex reasoning, long-form generation, and advanced coding. It supports all native tools including computer use, MCP, and web search, with full multimodal input/output support. Given the high output cost of $15.00/MTok, it is most effective when reserved for tasks where top-quality output is essential.

### GPT-5.4 mini

The mid-tier model of the GPT-5.4 family, optimized for coding, computer use, and sub-agent tasks. It consistently outperforms GPT-5 mini and achieves pass rates close to the flagship GPT-5.4 with faster processing. Benchmarks show a **2× or greater speed improvement** over GPT-5 mini, offering the best performance/latency trade-off for coding workflows.

### GPT-5.4 nano

The smallest and most affordable model in the GPT-5.4 family. Optimized for high-volume use cases where speed and cost are the top priorities — such as classification, data extraction, ranking, and coding sub-agents. Not suited for complex tasks requiring deep reasoning.

### GPT-4o

The general-purpose flagship model with high intelligence for both text and image tasks. It is now a legacy model, superseded by the GPT-5.4 series. GPT-4o was retired from ChatGPT in February 2026, but API access remains available.

### GPT-4o mini

Designed as a compact model ideal for fine-tuning. Achieves results comparable to larger models (GPT-4o) at lower cost and latency through distillation. MMLU score: **82.0%**. Best suited for minimizing inference costs on simple tasks.

## Which Model to Choose

- **High-volume / cost-first**: GPT-5.4 nano or GPT-4o mini. Choose GPT-5.4 nano if up-to-date knowledge is required; GPT-4o mini if fine-tuning is needed.
- **Coding and agents**: GPT-5.4 mini. The best balance of speed and accuracy.
- **Complex reasoning / high-quality output**: GPT-5.4. High cost at $2.50 input / $15.00 output per MTok, but delivers the best output quality of the current generation.
- **Legacy system compatibility**: GPT-4o. API access remains available, allowing existing integrations to continue.

## Best Value Options

For cost-effectiveness, the two standout models are **GPT-5.4 nano** and **GPT-5.4 mini**.

**GPT-5.4 nano** has nearly the same input cost as GPT-4o mini ($0.20 vs $0.15), yet offers a 400K context window, knowledge up to August 2025, and full access to native tools such as web search, file search, and MCP. It surpasses GPT-4o mini in almost every dimension except knowledge cutoff, so switching to GPT-5.4 nano makes sense for any use case that doesn't require fine-tuning.

**GPT-5.4 mini** is cheaper on input ($0.75) than GPT-4o ($2.50/MTok) while outperforming GPT-4o in coding and agentic workflows. If you regularly use GPT-4o, switching to GPT-5.4 mini is likely to reduce costs while improving performance simultaneously.

On the other hand, **GPT-4o** now feels overpriced. Its input cost matches GPT-5.4 ($2.50/MTok), yet it falls behind in context size, knowledge recency, and tool support. Unless you specifically need fine-tuning or compatibility with existing systems, there is little reason to actively choose GPT-4o.

## References

- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [GPT-5.4 mini Model Details](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.4 nano Model Details](https://developers.openai.com/api/docs/models/gpt-5.4-nano)
- [Introducing GPT-5.4 mini and nano – OpenAI](https://openai.com/index/introducing-gpt-5-4-mini-and-nano/)
- [GPT-5.4 Model Details](https://developers.openai.com/api/docs/models/gpt-5.4)
- [GPT-4o mini Model Details](https://developers.openai.com/api/docs/models/gpt-4o-mini)
