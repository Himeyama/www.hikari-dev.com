---
title: 使用 Anthropic API 獲得 Claude 模型列表
authors: hikari
tags: [AI, Claude]
image: /img/ogp/2026-05-22-claude-models.webp
---

透過使用 Anthropic API 的 `/v1/models` 端點，可以從程式中獲取可用的 Claude 模型列表及其規格。

{/* truncate */}

## API 的使用方式

若要使用 PowerShell 獲取資料，可以參考以下範例。

```ps1
$uri = "https://api.anthropic.com/v1/models"
$headers = @{
    "x-api-key"         = $env:ANTHROPIC_API_KEY
    "anthropic-version" = "2023-06-01"
}

$response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
$response.data | ConvertTo-Json -Depth 10
```

若要使用 curl 獲取資料，可以參考以下範例。

```bash
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

## 獲取結果 (截至 2026 年 5 月)

| 模型 | 模型 ID | 公開日 | 最大輸入 | 最大輸出 |
|--------|-----------|--------|:--------:|:--------:|
| Claude Opus 4.7 | `claude-opus-4-7` | 2026-04-14 | 1M | 128K |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 2026-02-17 | 1M | 128K |
| Claude Opus 4.6 | `claude-opus-4-6` | 2026-02-04 | 1M | 128K |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | 2025-11-24 | 200K | 64K |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 2025-10-15 | 200K | 64K |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 2025-09-29 | 1M | 64K |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` | 2025-08-05 | 200K | 32K |
| Claude Opus 4 | `claude-opus-4-20250514` | 2025-05-22 | 200K | 32K |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | 2025-05-22 | 1M | 64K |

## 功能支持狀況

各模型可使用的功能支持狀況如下。

| 模型 | 批次處理 | 代碼執行 | Effort 控制 | Compact | 思考模式 |
|--------|:----------:|:----------:|:-----------:|:-------:|:----------:|
| Claude Opus 4.7 | ○ | ○ | ○ | ○ | 只有 adaptive |
| Claude Sonnet 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.5 | ○ | ○ | ○ (不支持 max) | ✕ | 只有 enabled |
| Claude Haiku 4.5 | ○ | ✕ | ✕ | ✕ | 只有 enabled |
| Claude Sonnet 4.5 | ○ | ○ | ✕ | ✕ | 只有 enabled |
| Claude Opus 4.1 | ○ | ✕ | ✕ | ✕ | 只有 enabled |
| Claude Opus 4 | ○ | ✕ | ✕ | ✕ | 只有 enabled |
| Claude Sonnet 4 | ○ | ✕ | ✕ | ✕ | 只有 enabled |

### 各功能的說明

- **批次處理**: 使用非同步批次 API 可以一次性處理大量請求。可享受 50% 的按需價格折扣。
- **代碼執行**: 模型可以在沙盒環境中執行代碼。
- **Effort 控制**: 可調整思考量為 `low` / `medium` / `high` / `max`。可以控制成本與精度的取捨。
- **Compact**: 上下文管理功能。可以壓縮長篇對話，以便更有效地使用令牌 (`compact_20260112`)。
- **思考模式**: 擴展思考 (Extended Thinking) 的支持狀況。`enabled` 為常時思考，`adaptive` 為模型自動判斷的模式。

最新的 4.6 代 (Opus 4.6、Sonnet 4.6) 以後可利用 Compact 功能，並且也支持 Effort 控制。若使用 4.5 代之前的模型，請注意這些功能無法使用。

## 參考資料

- [Models overview – Anthropic API Docs](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [List Models API – Anthropic API Reference](https://docs.anthropic.com/en/api/models-list)