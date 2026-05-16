---
title: OpenRouter 経由で DeepSeek V4 Pro を Claude Code で使う方法
authors: hikari
tags: [AI, Claude, DeepSeek]
image: /img/ogp/2026-05-17-deepseek-claude-code.png
---

Claude Code は Anthropic 純正のコーディングエージェントだが、環境変数を設定することで OpenRouter 経由で DeepSeek V4 Pro などの他モデルを利用できる。この記事では、その設定方法を解説する。

{/* truncate */}

## Claude Code とは

Claude Code は Anthropic が提供する CLI ベースのコーディングエージェントである。ターミナルから直接コードの編集・検索・Git 操作などを指示でき、VSCode や JetBrains との連携も可能だ。

通常は Anthropic API 経由で Claude モデルを使用するが、環境変数でエンドポイントを差し替えることで他のモデルプロバイダーを利用できる。

## 必要なもの

- Claude Code (Node.js 18 以上)
- OpenRouter の API キー

Claude Code がインストールされていない場合は以下でインストールする。

```bash
npm install -g @anthropic-ai/claude-code
```

## 設定手順

OpenRouter の API キーを環境変数に設定し、Claude Code を起動する。PowerShell での設定例を以下に示す。

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-dummy"
$env:ANTHROPIC_CUSTOM_HEADERS = "Authorization: Bearer $env:OPENROUTER_API_KEY"
$env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api"
claude --model deepseek/deepseek-v4-pro
```

各環境変数の意味は以下のとおり。

| 環境変数 | 説明 |
|----------|------|
| `ANTHROPIC_API_KEY` | Claude Code の起動チェックで必要なダミー値。OpenRouter 経由のため実際の Anthropic API キーは不要。 |
| `ANTHROPIC_CUSTOM_HEADERS` | OpenRouter の認証ヘッダー。`OPENROUTER_API_KEY` を Bearer トークンとして渡す。 |
| `ANTHROPIC_BASE_URL` | API のベース URL を OpenRouter に向ける。 |

`--model` オプションで OpenRouter 上のモデル ID を指定する。ここでは DeepSeek V4 Pro の `deepseek/deepseek-v4-pro` を指定している。

## 他のモデルを使う

`--model` の値を変更することで、OpenRouter が対応している任意のモデルを利用できる。以下に例を示す。

```powershell
# Gemini 2.5 Pro
claude --model google/gemini-2.5-pro

# GPT-5.4
claude --model openai/gpt-5.4

# Claude Opus 4 (OpenRouter 経由)
claude --model anthropic/claude-opus-4
```

モデル ID の一覧は [OpenRouter のモデルページ](https://openrouter.ai/models) で確認できる。

## 注意点

### モデルの互換性

Claude Code は Anthropic の API 形式 (Messages API) に最適化されている。OpenRouter は多くのモデルをこの形式に変換してくれる。

### OpenRouter の利用料金

OpenRouter 経由で利用する場合、Anthropic への直接契約は不要で、OpenRouter のアカウントにチャージしたクレジットから従量課金される。各モデルの料金は OpenRouter のモデルページで確認できる。DeepSeek V4 Pro は 2026 年 5 月時点で入力 $0.20 / MTok、出力 $0.80 / MTok 前後と、Claude Opus 4 と比較して大幅に安価である。

## まとめ

環境変数 3 つとモデル指定だけで、Claude Code から OpenRouter 経由で DeepSeek V4 Pro を利用できる。Anthropic の API キーがなくても、OpenRouter のアカウントさえあれば安価にコーディングエージェントを動かせるのは便利だ。気になるモデルがあれば試してみてほしい。
