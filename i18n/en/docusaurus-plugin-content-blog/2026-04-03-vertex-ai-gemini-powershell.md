---
title: Calling the Vertex AI Gemini API from PowerShell
authors: hikari
tags: [AI, PowerShell, GCP]
---

This covers how to call Gemini models via Google Cloud's Vertex AI from PowerShell. Both the OpenAI-compatible endpoint and the native Gemini endpoint are explained.

<!-- truncate -->

## Authentication

### gcloud auth (Recommended)

No API key required. Uses your existing Google Cloud credentials.

```ps1
$accessToken = (gcloud auth print-access-token)
```

### API key

```ps1
$apiKey = $env:VERTEX_API_KEY
```

## Endpoints

### OpenAI-compatible endpoint (gcloud auth)

```
https://{region}-aiplatform.googleapis.com/v1beta1/projects/{projectId}/locations/{region}/endpoints/openapi/chat/completions
```

The request and response format is identical to the OpenAI API. The model name requires a `google/` prefix (e.g., `google/gemini-2.5-flash-lite`).

### Native Gemini endpoint (API key)

```
https://{region}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{region}/publishers/google/models/{model}:generateContent
```

For streaming, use `:streamGenerateContent`.

## Basic calls

### OpenAI-compatible (gcloud auth)

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
            content = "What is the population of Tokyo?"
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

### Native Gemini (API key)

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

### OpenAI-compatible

```ps1
$response.choices[0].message.content  # generated text
$response.usage.total_tokens           # total token count
$response.model                        # model used
```

### Native Gemini

```ps1
$response.candidates[0].content.parts[0].text  # generated text
$response.usageMetadata.totalTokenCount         # total token count
$response.modelVersion                          # model version used
```

For streaming (`streamGenerateContent`), an array of chunks is returned. Concatenate them to retrieve the full text.

```ps1
$fullText = ($response | ForEach-Object {
    $_.candidates[0].content.parts[0].text
}) -join ""
```

## Adding a system prompt

### OpenAI-compatible

```ps1
$body = @{
    model    = $model
    messages = @(
        @{
            role    = "system"
            content = "You are an AI assistant that responds in Japanese. Answer concisely."
        }
        @{
            role    = "user"
            content = "What is the speed of light?"
        }
    )
} | ConvertTo-Json -Depth 10
```

### Native Gemini

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

Place the conversation history in an array to achieve multi-turn conversation.

### OpenAI-compatible

```ps1
$body = @{
    model    = $model
    messages = @(
        @{ role = "user";      content = "Do you prefer cats or dogs?" }
        @{ role = "assistant"; content = "I prefer cats." }
        @{ role = "user";      content = "Why is that?" }
    )
} | ConvertTo-Json -Depth 10
```

### Native Gemini

The assistant role is specified as `"model"`.

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

| Model | OpenAI-compatible name | Description |
|-------|------------------------|-------------|
| `gemini-2.5-flash-lite` | `google/gemini-2.5-flash-lite` | Lightweight, fast, low-cost |
| `gemini-2.5-flash` | `google/gemini-2.5-flash` | Balanced |
| `gemini-2.5-pro` | `google/gemini-2.5-pro` | High-precision, for complex tasks |

## Which approach to use

| Situation | Recommended approach |
|-----------|----------------------|
| GCP-authenticated environment (dev, CI, etc.) | OpenAI-compatible + gcloud auth |
| Only an API key available | Native Gemini |
| Migrating from OpenAI | OpenAI-compatible (minimizes code changes) |
| Streaming required | Native Gemini |

## Notes

- Do not hardcode the API key in scripts; load it from an environment variable (`$env:VERTEX_API_KEY`).
- With gcloud auth, tokens expire in about 1 hour. Long-running scripts should refresh the token as needed.
- Each project has its own rate limits and quotas. Check them before sending large numbers of requests.
