---
title: Calling the Vertex AI Gemini API from PowerShell
authors: hikari
tags: [AI, PowerShell]
---

This shows how to call Gemini models via Google Cloud's Vertex AI from PowerShell.

<!-- truncate -->

## Requirements

| Variable | Description | Example |
|----------|-------------|---------|
| `$projectId` | Google Cloud project ID | `"my-project-123"` |
| `$region` | Region | `"us-central1"` |
| `$model` | Model name | `"gemini-2.5-flash-lite"` |
| `$apiKey` | API key | Obtained from an environment variable |

You can create an API key in the [Google Cloud Console](https://console.cloud.google.com/).

## Endpoint

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

If you need streaming, use `:streamGenerateContent`.

## Basic call

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
                @{ text = "What is the population of Tokyo?" }
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

## Response structure

A regular `generateContent` returns a single object.

```ps1
$response.candidates[0].content.parts[0].text  # generated text
$response.usageMetadata.totalTokenCount         # total token count
$response.modelVersion                          # model version used
```

For streaming (`streamGenerateContent`), an array of multiple chunks is returned, so concatenate the text to retrieve it.

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## Adding a system prompt

```ps1
$body = @{
    system_instruction = @{
        parts = @(
            @{ text = "You are an AI assistant that responds in Japanese. Answer concisely." }
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

## Multi-turn conversation

You can achieve multi-turn conversation by placing the conversation history in `contents`.

```ps1
$body = @{
    contents = @(
        @{
            role  = "user"
            parts = @(@{ text = "Do you prefer cats or dogs?" })
        }
        @{
            role  = "model"
            parts = @(@{ text = "I prefer cats." })
        }
        @{
            role  = "user"
            parts = @(@{ text = "Why is that?" })
        }
    )
} | ConvertTo-Json -Depth 10
```

## Available models

| Model | Description |
|-------|-------------|
| `gemini-2.5-flash-lite` | Lightweight, fast, and low-cost |
| `gemini-2.5-flash` | Balanced |
| `gemini-2.5-pro` | High-precision, for complex tasks |

Choosing models according to your use case can help reduce costs.

## Notes

- Do not hardcode the API key in scripts; load it from an environment variable (`$env:VERTEX_API_KEY`).
- Each project has rate limits and quotas. If you plan to send a large number of requests, check them in advance.