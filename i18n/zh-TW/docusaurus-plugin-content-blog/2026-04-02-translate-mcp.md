---
title: 使用 OpenAI API 開發支援多語言的翻譯 CLI 工具 translate-mcp
authors: hikari
tags: [MCP, 翻譯, OpenAI, Python]
image: /img/ogp/2026-04-02-translate-mcp.webp
---

translate-mcp 是一個使用 OpenAI API 的翻譯工具。它支援 CLI 模式和 MCP 伺服器的兩種使用方式，能夠應對從想要翻譯整個文件到希望與 AI 工具整合的各種場合。

{/**/}

## translate-mcp 是什麼

[translate-mcp](https://github.com/Himeyama/translate-mcp) 是一款 **專為翻譯而設的工具**，使用 OpenAI API。它是用 Python 實現的，具有以下兩種使用方法。

1. **CLI 模式**: 可以直接從命令行翻譯文件
2. **MCP 伺服器模式**: 充當 Model Context Protocol (MCP) 伺服器，整合到 AI 工具中

## 特徵

- **多語言支援**: 支援多種語言
- **簡單易用**: 只需一個 API 金鑰便可開始
- **兩種使用方式**: 既可作為 CLI 腳本，也能作為 MCP 伺服器運行
- **輕量級**: 無需依賴外部庫，僅依賴 OpenAI API
- **錯誤處理**: CLI 模式以 stderr 輸出，MCP 模式以 JSON 格式回傳

## 安裝

### 前提條件

- 已安裝 Python
- 已獲取 OpenAI API 金鑰

### 安裝 uv

由於 translate-mcp 由 `uv` 管理，因此需要先安裝 `uv`。

安裝 `uv` 的方法參見 [Installation | uv](https://docs.astral.sh/uv/getting-started/installation/)。

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 安裝 translate-mcp

如果使用 `uv`，可以使用以下命令進行安裝。

```bash
uv tool install git+https://github.com/Himeyama/translate-mcp
```

如果使用 `uvx`，則無需安裝，直接執行即可。

```bash
uvx git+https://github.com/Himeyama/translate-mcp --help
```

## 使用方法

### CLI 模式

翻譯文件時，可以使用以下命令執行。

```bash
translate --input blog/2026-04-02-example.md --from Japanese --to English
```

結果將輸出至標準輸出，並可透過重定向保存到文件中。

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English \
  --output i18n/en/blog/2026-04-02-example.md
```

#### 參數

- `--mcp`: MCP 模式
- `--input`: 待翻譯文件的路徑
- `--from`: 原始語言（例如: Japanese、English）
- `--to`: 目標語言（例如: English、Taiwanese）
- `--output` (可選): 儲存翻譯後文本的位置
- `--model` (可選): OpenAI 模型（例如: gpt-5-mini）
- `--debug` (可選): 調試模式

#### 錯誤處理

若發生錯誤，將輸出至 stderr。

### MCP 伺服器模式

啟動為 MCP 伺服器，並可供 Claude Code 或其他 AI 工具使用。

```bash
translate --mcp
```

## 實例

以下說明如何將部落格文章從日文翻譯成英文和繁體中文（台灣）。

### 日文版本（原文）

```bash
# blog/2026-04-02-example.md 中有日文的文章
```

### 生成英文版本

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English > i18n/en/docusaurus-plugin-content-blog/2026-04-02-example.md
```

### 生成台灣版本（繁體中文）

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to Taiwanese > i18n/zh-TW/docusaurus-plugin-content-blog/2026-04-02-example.md
```

## 優缺點

### 優點

- **高精度**: 使用 OpenAI 的高品質模型（如 GPT-4）
- **技能支援**: 可整合至 ChatGPT 和 Claude 的多種工具
- **簡單**: 設置和使用都非常簡單
- **可定制**: 由於源代碼公開，因此可進行自定義

### 缺點

- **需支付 API 費用**: 根據翻譯量，OpenAI API 需要收費
- **必須連網**: 需調用 API，因此無法離線使用
- **速率限制**: 受限於 OpenAI API 的速率限制

## 總結

translate-mcp 是一個 **簡單且高品質的翻譯工具**，利用 OpenAI API 開發。它在部落格文章的多語言支援、文件翻譯以及與 AI 工具整合等多種場合中均能發揮作用。

特別是在想要使用 Docusaurus 等靜態網站生成器支援多語言時，作為自動化腳本的用途效果顯著。

## 參考資料

- [GitHub - Himeyama/translate-mcp](https://github.com/Himeyama/translate-mcp)
- [OpenAI API 文檔](https://platform.openai.com/docs)
