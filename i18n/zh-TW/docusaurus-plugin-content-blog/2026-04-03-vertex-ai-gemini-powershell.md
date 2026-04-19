---
title: 在 PowerShell 中呼叫 Vertex AI Gemini API
authors: hikari
tags: [AI, PowerShell, GCP]
---

介紹如何從 PowerShell 經由 Google Cloud 的 Vertex AI 呼叫 Gemini 模型。涵蓋 OpenAI 相容端點與原生 Gemini 端點兩種方式。

{/**/}

## 認證方式

### gcloud auth（推薦）

不需要 API 金鑰，可直接使用現有的 Google Cloud 認證資訊。

```ps1
$accessToken = (gcloud auth print-access-token)
```

### API 金鑰

```ps1
$apiKey = $env:VERTEX_API_KEY
```

## 端點

### OpenAI 相容端點（gcloud auth 認證）

```
https://{region}-aiplatform.googleapis.com/v1beta1/projects/{projectId}/locations/{region}/endpoints/openapi/chat/completions
```

請求與回應格式與 OpenAI API 相同。模型名稱需加上 `google/` 前綴（例：`google/gemini-2.5-flash-lite`）。

### 原生 Gemini 端點（API 金鑰認證）

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

若需要串流請使用 `:streamGenerateContent`。

## 基本呼叫範例

### OpenAI 相容（gcloud auth）

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
            content = "東京的人口是多少？"
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

### 原生 Gemini（API 金鑰）

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
                @{ text = "東京的人口是多少？" }
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

## 回應結構

### OpenAI 相容

```ps1
$response.choices[0].message.content  # 產生的文字
$response.usage.total_tokens           # 總 Token 數
$response.model                        # 使用的模型
```

### 原生 Gemini

```ps1
$response.candidates[0].content.parts[0].text  # 產生的文字
$response.usageMetadata.totalTokenCount         # 總 Token 數
$response.modelVersion                          # 使用的模型版本
```

串流（`streamGenerateContent`）會回傳多個 chunk 的陣列，需將文字串接取出。

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## 加入系統提示

### OpenAI 相容

```ps1
$body = @{
    model    = $model
    messages = @(
        @{
            role    = "system"
            content = "您是用日語回答的 AI 助理，請簡潔回覆。"
        }
        @{
            role    = "user"
            content = "光速是多少？"
        }
    )
} | ConvertTo-Json -Depth 10
```

### 原生 Gemini

```ps1
$body = @{
    system_instruction = @{
        parts = @(
            @{ text = "您是用日語回答的 AI 助理，請簡潔回覆。" }
        )
    }
    contents = @(
        @{
            role  = "user"
            parts = @(@{ text = "光速是多少？" })
        }
    )
} | ConvertTo-Json -Depth 10
```

## 多回合對話

將歷史對話依序放入陣列即可實現多回合對話。

### OpenAI 相容

```ps1
$body = @{
    model    = $model
    messages = @(
        @{ role = "user";      content = "你比較喜歡貓還是狗？" }
        @{ role = "assistant"; content = "我喜歡貓。" }
        @{ role = "user";      content = "為什麼？" }
    )
} | ConvertTo-Json -Depth 10
```

### 原生 Gemini

助理的角色需指定為 `"model"`。

```ps1
$body = @{
    contents = @(
        @{
            role  = "user"
            parts = @(@{ text = "你比較喜歡貓還是狗？" })
        }
        @{
            role  = "model"
            parts = @(@{ text = "我喜歡貓。" })
        }
        @{
            role  = "user"
            parts = @(@{ text = "為什麼？" })
        }
    )
} | ConvertTo-Json -Depth 10
```

## 可用模型

| 模型 | OpenAI 相容名稱 | 特性 |
|------|----------------|------|
| `gemini-2.5-flash-lite` | `google/gemini-2.5-flash-lite` | 輕量、快速、低成本 |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` | 平衡型 |
| `gemini-2.5-pro` | `google/gemini-2.5-pro` | 高精度，適合複雜任務 |

## 選擇方式的判斷基準

| 情況 | 推薦方式 |
|------|---------|
| 已有 GCP 認證的環境（開發、CI 等） | OpenAI 相容 + gcloud auth |
| 只能使用 API 金鑰 | 原生 Gemini |
| 從 OpenAI 移轉中 | OpenAI 相容（最小化程式碼變更） |
| 需要串流 | 原生 Gemini |

## 注意事項

- 請勿將 API 金鑰硬寫在腳本中，應從環境變數（`$env:VERTEX_API_KEY`）讀取。
- gcloud auth 的 token 有效期限約為 1 小時，長時間執行的腳本需要定期重新取得。
- 每個專案有各自的速率限制與配額，大量發送請求前請事先確認。
