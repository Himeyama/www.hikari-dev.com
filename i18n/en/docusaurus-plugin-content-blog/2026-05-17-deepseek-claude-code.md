---
title: How to Use DeepSeek V4 Pro via OpenRouter with Claude Code
authors: hikari
tags: [AI, Claude, DeepSeek]
image: /img/ogp/2026-05-17-deepseek-claude-code.png
---

Claude Code is Anthropic's official coding agent, but by setting environment variables you can use other models such as DeepSeek V4 Pro via OpenRouter. This article explains how to configure that.

{/* truncate */}

## What is Claude Code

Claude Code is a CLI-based coding agent provided by Anthropic. You can instruct it to edit, search code, perform Git operations, etc., directly from the terminal, and it can integrate with VSCode and JetBrains.

By default it uses Claude models via the Anthropic API, but by replacing the endpoint with environment variables you can use other model providers.

## Requirements

- Claude Code (Node.js 18 or newer)
- OpenRouter API key

If Claude Code is not installed, install it with:

```bash
npm install -g @anthropic-ai/claude-code
```

## Setup steps

Set the OpenRouter API key in environment variables and start Claude Code. The example below shows how to set them in PowerShell.

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-dummy"
$env:ANTHROPIC_CUSTOM_HEADERS = "Authorization: Bearer $env:OPENROUTER_API_KEY"
$env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api"
claude --model deepseek/deepseek-v4-pro
```

The meanings of each environment variable are as follows.

| Environment variable | Description |
|----------------------|-------------|
| `ANTHROPIC_API_KEY` | A dummy value required for Claude Code's startup check. Because requests go through OpenRouter, an actual Anthropic API key is not necessary. |
| `ANTHROPIC_CUSTOM_HEADERS` | Authentication header for OpenRouter. Pass `OPENROUTER_API_KEY` as a Bearer token. |
| `ANTHROPIC_BASE_URL` | Point the API base URL to OpenRouter. |

Use the `--model` option to specify the model ID on OpenRouter. Here we specify DeepSeek V4 Pro as `deepseek/deepseek-v4-pro`.

## Using other models

By changing the value of `--model`, you can use any model supported by OpenRouter. Examples:

```powershell
# Gemini 2.5 Pro
claude --model google/gemini-2.5-pro

# GPT-5.4
claude --model openai/gpt-5.4

# Claude Opus 4 (via OpenRouter)
claude --model anthropic/claude-opus-4
```

You can check the list of model IDs on the OpenRouter models page: https://openrouter.ai/models

## Notes

### About the dummy API key

Setting `ANTHROPIC_API_KEY` to a dummy value like `sk-ant-dummy` is necessary because Claude Code performs a format check on the API key at startup. Actual API communication goes through OpenRouter, so a valid Anthropic API key is not required, but the format still needs to start with `sk-ant-`.

### Model compatibility

Claude Code is optimized for Anthropic's API format (Messages API). OpenRouter translates many models into this format, but some models may be incompatible in terms of tool calling (function calling) or response format. If something doesn't work correctly, try switching models.

### OpenRouter usage fees

When using OpenRouter, you don't need a direct contract with Anthropic; usage is billed against credits in your OpenRouter account. Model pricing can be found on OpenRouter's model page. As of May 2026, DeepSeek V4 Pro is substantially cheaper than Claude Opus 4, roughly $0.20 / MToken for input and $0.80 / MToken for output.

## Summary

With three environment variables and a model specification, you can use DeepSeek V4 Pro from Claude Code via OpenRouter. Even without an Anthropic API key, you can run the coding agent cheaply as long as you have an OpenRouter account. Try other models that interest you.