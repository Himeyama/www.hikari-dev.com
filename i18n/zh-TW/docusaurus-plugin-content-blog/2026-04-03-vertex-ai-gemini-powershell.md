---
title: 在 PowerShell 中呼叫 Vertex AI Gemini API
authors: hikari
tags: [AI, PowerShell]
---

介紹如何從 PowerShell 經由 Google Cloud 的 Vertex AI 呼叫 Gemini 模型。

<!-- truncate -->

## 所需項目

| 變數 | 說明 | 範例 |
|------|------|-----|
| `$projectId` | Google Cloud 專案 ID | `"my-project-123"` |
| `$region` | 地區 | `"us-central1"` |
| `$model` | 模型名稱 | `"gemini-2.5-flash-lite"` |
| `$apiKey` | API 金鑰 | 從環境變數取得 |

API 金鑰可在 [Google Cloud Console](https://console.cloud.google.com/) 發行。

## 端點

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

若需要串流請使用 `:streamGenerateContent`。

## 基本呼叫範例

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

一般的 `generateContent` 會回傳單一物件。

```ps1
$response.candidates[0].content.parts[0].text  # 產生的文字
$response.usageMetadata.totalTokenCount         # 總 Token 數
$response.modelVersion                          # 使用的模型版本
```

串流（`streamGenerateContent`）則會回傳多個 chunk 的陣列，需要將文字串接起來取出。

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## 加入系統提示

```ps1
$body = @{
    system_instruction = @{
        parts = @(
            @{ text = "請用日語回答的 AI 助手，且請簡潔回覆。" }
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

把歷史對話依序放在 `contents` 中，即可實現多回合對話。

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

| 模型 | 特性 |
|--------|------|
| `gemini-2.5-flash-lite` | 輕量、快速、低成本 |
| `gemini-2.5-flash` | 平衡型 |
| `gemini-2.5-pro` | 高精度，適合複雜任務 |

可依用途選擇以節省成本。

## 注意事項

- 請勿將 API 金鑰硬寫在腳本中，應從環境變數（`$env:VERTEX_API_KEY`）讀取。
- 每個專案有其額度與速率限制。若要大量發送請求，請事先確認配額。