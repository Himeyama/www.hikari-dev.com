---
title: PowerShell で Vertex AI Gemini API を叩く
authors: hikari
tags: [AI, PowerShell]
---

Google Cloud の Vertex AI 経由で Gemini モデルを PowerShell から呼び出す方法を紹介する。

<!-- truncate -->

## 必要なもの

| 変数 | 説明 | 例 |
|------|------|-----|
| `$projectId` | Google Cloud プロジェクト ID | `"my-project-123"` |
| `$region` | リージョン | `"us-central1"` |
| `$model` | モデル名 | `"gemini-2.5-flash-lite"` |
| `$apiKey` | API キー | 環境変数から取得 |

API キーは [Google Cloud Console](https://console.cloud.google.com/) で発行できる。

## エンドポイント

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

ストリーミングが必要な場合は `:streamGenerateContent` を使用する。

## 基本的な呼び出し

```ps1
$projectId = "my-project-123"
$region    = "us-central1"
$model     = "gemini-2.5-flash-lite"
$apiKey    = $env:VERTEX_API_KEY

$body = @{
    contents = @(
        @{
            role  = "user"
            parts = @(
                @{ text = "東京の人口は?" }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$uri = "https://$region-aiplatform.googleapis.com/v1/projects/$projectId/locations/$region/publishers/google/models/${model}:generateContent?key=$apiKey"

$response = Invoke-RestMethod `
    -Uri         $uri `
    -Method      Post `
    -ContentType "application/json" `
    -Body        $body

$response.candidates[0].content.parts[0].text
```

## レスポンス構造

通常の `generateContent` は単一のオブジェクトを返す。

```ps1
$response.candidates[0].content.parts[0].text  # 生成テキスト
$response.usageMetadata.totalTokenCount         # 合計トークン数
$response.modelVersion                          # 使用モデルバージョン
```

ストリーミング (`streamGenerateContent`) の場合は複数チャンクの配列が返るため、テキストを結合して取り出す。

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## システムプロンプトを追加する

```ps1
$body = @{
    system_instruction = @{
        parts = @(
            @{ text = "日本語で回答する AI アシスタントです。簡潔に答えてください。" }
        )
    }
    contents = @(
        @{
            role  = "user"
            parts = @(@{ text = "What is the speed of light?" })
        }
    )
} | ConvertTo-Json -Depth 10
```

## マルチターン会話

これまでの会話履歴を `contents` に並べることでマルチターン会話が実現できる。

```ps1
$body = @{
    contents = @(
        @{
            role  = "user"
            parts = @(@{ text = "猫と犬、どちらが好きですか?" })
        }
        @{
            role  = "model"
            parts = @(@{ text = "私は猫が好きです。" })
        }
        @{
            role  = "user"
            parts = @(@{ text = "その理由は?" })
        }
    )
} | ConvertTo-Json -Depth 10
```

## 利用可能なモデル

| モデル | 特徴 |
|--------|------|
| `gemini-2.5-flash-lite` | 軽量・高速・低コスト |
| `gemini-2.5-flash` | バランス型 |
| `gemini-2.5-pro` | 高精度・複雑なタスク向け |

用途に応じて使い分けるとコストを抑えられる。

## 注意事項

- API キーはスクリプトにハードコードせず、環境変数 (`$env:VERTEX_API_KEY`) から読み込むこと。
- プロジェクトごとにレート制限とクォータが設定されている。大量リクエストを送る場合は事前に確認すること。
