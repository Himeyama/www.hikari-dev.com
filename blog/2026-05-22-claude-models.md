---
title: Anthropic API で Claude のモデル一覧を取得する
authors: hikari
tags: [AI, Claude]
image: /img/ogp/2026-05-22-claude-models.png
---

Anthropic API の `/v1/models` エンドポイントを使うと、利用可能な Claude モデルの一覧とその仕様をプログラムから取得できる。

{/* truncate */}

## API の叩き方

PowerShell で取得する場合はこちら。

```ps1
$uri = "https://api.anthropic.com/v1/models"
$headers = @{
    "x-api-key"         = $env:ANTHROPIC_API_KEY
    "anthropic-version" = "2023-06-01"
}

$response = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
$response.data | ConvertTo-Json -Depth 10
```

curl で取得する場合はこちら。

```bash
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

## 取得結果 (2026 年 5 月時点)

| モデル | モデル ID | 公開日 | 最大入力 | 最大出力 |
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

## 機能対応状況

各モデルで利用できる機能の対応状況は以下のとおり。

| モデル | バッチ処理 | コード実行 | Effort 制御 | Compact | 思考モード |
|--------|:----------:|:----------:|:-----------:|:-------:|:----------:|
| Claude Opus 4.7 | ○ | ○ | ○ | ○ | adaptive のみ |
| Claude Sonnet 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.6 | ○ | ○ | ○ | ○ | enabled / adaptive |
| Claude Opus 4.5 | ○ | ○ | ○ (max 非対応) | ✕ | enabled のみ |
| Claude Haiku 4.5 | ○ | ✕ | ✕ | ✕ | enabled のみ |
| Claude Sonnet 4.5 | ○ | ○ | ✕ | ✕ | enabled のみ |
| Claude Opus 4.1 | ○ | ✕ | ✕ | ✕ | enabled のみ |
| Claude Opus 4 | ○ | ✕ | ✕ | ✕ | enabled のみ |
| Claude Sonnet 4 | ○ | ✕ | ✕ | ✕ | enabled のみ |

### 各機能の説明

- **バッチ処理**: 非同期バッチ API を使って大量リクエストをまとめて処理できる。オンデマンド料金の 50% OFF で利用可能。
- **コード実行**: モデルがサンドボックス環境でコードを実行できる。
- **Effort 制御**: `low` / `medium` / `high` / `max` で思考量を調整できる。コストと精度のトレードオフを制御できる。
- **Compact**: コンテキスト管理機能。長い会話を圧縮して効率的にトークンを使えるようにする (`compact_20260112`)。
- **思考モード**: 拡張思考 (Extended Thinking) の対応状況。`enabled` は常時思考、`adaptive` はモデルが自動で判断するモード。

最新の 4.6 世代 (Opus 4.6、Sonnet 4.6) 以降では Compact が利用でき、Effort 制御も対応している。4.5 世代以前のモデルを使う場合はこれらの機能が使えない点に注意。

## 参考

- [Models overview – Anthropic API Docs](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [List Models API – Anthropic API Reference](https://docs.anthropic.com/en/api/models-list)
