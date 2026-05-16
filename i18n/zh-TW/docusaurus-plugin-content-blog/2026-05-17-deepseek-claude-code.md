---
title: 透過 OpenRouter 在 Claude Code 使用 DeepSeek V4 Pro 的方法
authors: hikari
tags: [AI, Claude, DeepSeek]
image: /img/ogp/2026-05-17-deepseek-claude-code.png
---

Claude Code 是 Anthropic 官方的程式碼代理工具，但透過設定環境變數可以經由 OpenRouter 使用像 DeepSeek V4 Pro 這類其他模型。本文說明該設定方法。

{/* truncate */}

## 什麼是 Claude Code

Claude Code 是 Anthropic 提供的命令列（CLI）型程式碼代理工具。可以直接在終端機下指示編輯、搜尋程式碼、執行 Git 操作等，也能與 VSCode 或 JetBrains 整合。

通常會透過 Anthropic API 使用 Claude 模型，但只要用環境變數替換端點，就能使用其他模型供應商的模型。

## 需要的東西

- Claude Code（Node.js 18 或以上）
- OpenRouter 的 API 金鑰

若尚未安裝 Claude Code，可用以下指令安裝：

```bash
npm install -g @anthropic-ai/claude-code
```

## 設定步驟

將 OpenRouter 的 API 金鑰設定為環境變數，然後啟動 Claude Code。以下示範在 PowerShell 的設定範例。

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-dummy"
$env:ANTHROPIC_CUSTOM_HEADERS = "Authorization: Bearer $env:OPENROUTER_API_KEY"
$env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api"
claude --model deepseek/deepseek-v4-pro
```

各環境變數的說明如下。

| 環境變數 | 說明 |
|----------|------|
| `ANTHROPIC_API_KEY` | 供 Claude Code 啟動檢查用的假值。因為是透過 OpenRouter，實際的 Anthropic API 金鑰不需要。 |
| `ANTHROPIC_CUSTOM_HEADERS` | OpenRouter 的認證標頭。把 `OPENROUTER_API_KEY` 當作 Bearer token 傳遞。 |
| `ANTHROPIC_BASE_URL` | 將 API 的基底 URL 指向 OpenRouter。 |

可透過 `--model` 選項指定 OpenRouter 上的模型 ID。此處示範使用 DeepSeek V4 Pro 的 `deepseek/deepseek-v4-pro`。

## 使用其他模型

變更 `--model` 的值即可使用 OpenRouter 支援的任何模型。以下是範例：

```powershell
# Gemini 2.5 Pro
claude --model google/gemini-2.5-pro

# GPT-5.4
claude --model openai/gpt-5.4

# Claude Opus 4 (經由 OpenRouter)
claude --model anthropic/claude-opus-4
```

模型 ID 列表請見 OpenRouter 的模型頁面： https://openrouter.ai/models

## 注意事項

### 關於假的 API 金鑰

把 `ANTHROPIC_API_KEY` 設為像 `sk-ant-dummy` 這類假值，是因為 Claude Code 在啟動時會檢查 API 金鑰的格式。實際的 API 通訊會經由 OpenRouter，因此不需要有效的 Anthropic API 金鑰，但格式需以 `sk-ant-` 為前綴。

### 模型相容性

Claude Code 是針對 Anthropic 的 API 格式（Messages API）優化的。OpenRouter 會把許多模型轉換成該格式，但部分模型可能在工具呼叫（Function Calling）或回應格式上產生不相容的情形。若發現無法正常運作，建議換用其他模型嘗試。

### OpenRouter 的使用費用

透過 OpenRouter 使用時，無需直接與 Anthropic 簽約，會從 OpenRouter 帳戶的儲值額度中依使用量計費。各模型的費用可在 OpenRouter 的模型頁面查看。以 2026 年 5 月為準，DeepSeek V4 Pro 的價格大約為輸入 $0.20 / MTok、輸出 $0.80 / MTok 左右，相較於 Claude Opus 4 明顯便宜許多。

## 總結

只要設定三個環境變數並指定模型，就能從 Claude Code 經由 OpenRouter 使用 DeepSeek V4 Pro。即便沒有 Anthropic 的 API 金鑰，只要有 OpenRouter 帳戶就能以較低成本運行這類程式碼代理。若有想試看的模型，歡迎實際試用。