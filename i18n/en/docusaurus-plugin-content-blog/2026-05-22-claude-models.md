---
title: Obtaining a List of Claude Models Using the Anthropic API
authors: hikari
tags: [AI, Claude]
image: /img/ogp/2026-05-22-claude-models.webp
---

By using the Anthropic API's `/v1/models` endpoint, you can programmatically retrieve a list of available Claude models along with their specifications.

{/* truncate */}

## How to Call the API

To retrieve it using PowerShell, use the following:

```ps1
$uri = "https://api.anthropic.com/v1/models"
$headers = @{
    "x-api-key"         = $env:ANTHROPIC_API_KEY
    "anthropic-version" = "2023-06-01"
}

$response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
$response.data | ConvertTo-Json -Depth 10
```

To retrieve it using curl, use the following:

```bash
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

## Retrieval Results (As of May 2026)

| Model | Model ID | Release Date | Max Input | Max Output |
|-------|----------|--------------|:---------:|:----------:|
| Claude Opus 4.7 | `claude-opus-4-7` | 2026-04-14 | 1M | 128K |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 2026-02-17 | 1M | 128K |
| Claude Opus 4.6 | `claude-opus-4-6` | 2026-02-04 | 1M | 128K |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | 2025-11-24 | 200K | 64K |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 2025-10-15 | 200K | 64K |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 2025-09-29 | 1M | 64K |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` | 2025-08-05 | 200K | 32K |
| Claude Opus 4 | `claude-opus-4-20250514` | 2025-05-22 | 200K | 32K |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | 2025-05-22 | 1M | 64K |

## Feature Support Status

The availability of features for each model is as follows:

| Model | Batch Processing | Code Execution | Effort Control | Compact | Thinking Mode |
|-------|:---------------:|:--------------:|:--------------:|:-------:|:-------------:|
| Claude Opus 4.7 | ○ | ○ | ○ | ○ | only adaptive |
| Claude Sonnet 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.5 | ○ | ○ | ○ (max not supported) | ✕ | only enabled |
| Claude Haiku 4.5 | ○ | ✕ | ✕ | ✕ | only enabled |
| Claude Sonnet 4.5 | ○ | ○ | ✕ | ✕ | only enabled |
| Claude Opus 4.1 | ○ | ✕ | ✕ | ✕ | only enabled |
| Claude Opus 4 | ○ | ✕ | ✕ | ✕ | only enabled |
| Claude Sonnet 4 | ○ | ✕ | ✕ | ✕ | only enabled |

### Explanation of Each Feature

- **Batch Processing**: Allows for the processing of large requests in bulk using an asynchronous batch API, available at 50% off the on-demand rate.
- **Code Execution**: The model can execute code in a sandbox environment.
- **Effort Control**: Adjusts the amount of thought with options for `low`, `medium`, `high`, and `max`, allowing control over cost and accuracy trade-offs.
- **Compact**: Context management feature that makes it possible to compress long conversations to use tokens efficiently (`compact_20260112`).
- **Thinking Mode**: Availability of Extended Thinking mode. `enabled` indicates always on, while `adaptive` means the model decides automatically.

Starting from the latest 4.6 generation (Opus 4.6, Sonnet 4.6), Compact is available and Effort Control is also supported. Note that these features are not available when using models from the 4.5 generation or earlier.

## References

- [Models overview – Anthropic API Docs](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [List Models API – Anthropic API Reference](https://docs.anthropic.com/en/api/models-list)