---
title: PowerShell で Vertex AI Gemini API を叩く
authors: hikari
tags: [AI, PowerShell, GCP]
---

Google Cloud の Vertex AI 経由で Gemini モデルを PowerShell から呼び出す方法をまとめる。OpenAI 互換エンドポイントとネイティブ Gemini エンドポイントの 2 種類を紹介する。

<!-- truncate -->

## 認証方法

### gcloud auth（推奨）

API キー不要。既存の Google Cloud 認証情報をそのまま利用できる。

```ps1
$accessToken = (gcloud auth print-access-token)
```

### API キー

```ps1
$apiKey = $env:VERTEX_API_KEY
```

## エンドポイント

### OpenAI 互換エンドポイント（gcloud auth 認証）

```
https://{region}-aiplatform.googleapis.com/v1beta1/projects/{projectId}/locations/{region}/endpoints/openapi/chat/completions
```

リクエスト・レスポンス形式が OpenAI API と同じ。モデル名に `google/` プレフィックスが必要（例: `google/gemini-2.5-flash-lite`）。

### ネイティブ Gemini エンドポイント（API キー認証）

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

ストリーミングが必要な場合は `:streamGenerateContent` を使用する。

## 基本的な呼び出し

### OpenAI 互換（gcloud auth）

```ps1
$projectId   = "your-project-id"
$region      = "us-central1"
$model       = "google/gemini-2.5-flash-lite"
$accessToken = (gcloud auth print-access-token)

$body = @{
    model    = $model
    messages = @(
        @{
            role    = "user"
            content = "東京の人口は?"
        }
    )
} | ConvertTo-Json -Depth 10

$uri = "https://$region-aiplatform.googleapis.com/v1beta1/projects/$projectId/locations/$region/endpoints/openapi/chat/completions"

$response = Invoke-RestMethod `
    -Uri         $uri `
    -Method      Post `
    -ContentType "application/json" `
    -Headers     @{ Authorization = "Bearer $accessToken" } `
    -Body        $body

$response.choices[0].message.content
```

### ネイティブ Gemini（API キー）

```ps1
$projectId = "your-project-id"
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

### OpenAI 互換

```ps1
$response.choices[0].message.content  # 生成テキスト
$response.usage.total_tokens           # 合計トークン数
$response.model                        # 使用モデル
```

### ネイティブ Gemini

```ps1
$response.candidates[0].content.parts[0].text  # 生成テキスト
$response.usageMetadata.totalTokenCount         # 合計トークン数
$response.modelVersion                          # 使用モデルバージョン
```

ストリーミング（`streamGenerateContent`）の場合は複数チャンクの配列が返るため、テキストを結合して取り出す。

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## システムプロンプトを追加する

### OpenAI 互換

```ps1
$body = @{
    model    = $model
    messages = @(
        @{
            role    = "system"
            content = "日本語で回答する AI アシスタントです。簡潔に答えてください。"
        }
        @{
            role    = "user"
            content = "What is the speed of light?"
        }
    )
} | ConvertTo-Json -Depth 10
```

### ネイティブ Gemini

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

これまでの会話履歴を配列に並べることでマルチターン会話が実現できる。

### OpenAI 互換

```ps1
$body = @{
    model    = $model
    messages = @(
        @{ role = "user";      content = "猫と犬、どちらが好きですか?" }
        @{ role = "assistant"; content = "私は猫が好きです。" }
        @{ role = "user";      content = "その理由は?" }
    )
} | ConvertTo-Json -Depth 10
```

### ネイティブ Gemini

アシスタントのロールは `"model"` を指定する。

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

| モデル | OpenAI 互換名 | 特徴 |
|--------|--------------|------|
| `gemini-2.5-flash-lite` | `google/gemini-2.5-flash-lite` | 軽量・高速・低コスト |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` | バランス型 |
| `gemini-2.5-pro` | `google/gemini-2.5-pro` | 高精度・複雑なタスク向け |

## 方式の選択基準

| 状況 | 推奨方式 |
|------|---------|
| GCP 認証済み環境（開発・CI など） | OpenAI 互換 + gcloud auth |
| API キーのみ利用可能 | ネイティブ Gemini |
| OpenAI から移行中 | OpenAI 互換（コード変更を最小化） |
| ストリーミングが必要 | ネイティブ Gemini |

## 注意事項

- API キーはスクリプトにハードコードせず、環境変数 (`$env:VERTEX_API_KEY`) から読み込むこと。
- gcloud auth の場合、トークンの有効期限は約 1 時間。長時間スクリプトでは都度再取得が必要。
- レート制限やクォータはプロジェクトごとに設定されている。大量リクエストを送る場合は事前に確認すること。
