---
title: OpenAI API で複数言語に対応した翻訳 CLI ツール translate-mcp の開発
authors: hikari
tags: [MCP, 翻訳, OpenAI, Python]
image: /img/ogp/2026-04-02-translate-mcp.png
---

translate-mcp は OpenAI の API を使った翻訳ツールである。CLI モードと MCP サーバーの両方の利用方法に対応している。
ファイル全体を翻訳したい場合から、AI ツールに統合して使いたい場合まで、幅広いシーンで活躍する。

<!-- truncate -->

## translate-mcp とは

[translate-mcp](https://github.com/Himeyama/translate-mcp) は、**OpenAI API を使った翻訳専用ツール** である。Python で実装されており、次の 2 つの利用方法がある。

1. **CLI モード**: コマンドラインから直接ファイルを翻訳
2. **MCP サーバーモード**: Model Context Protocol (MCP) サーバーとして動作し、AI ツールに統合

## 特徴

- **複数言語対応**: 多言語に対応している
- **シンプルな使い方**: API キー 1 つで始められる
- **2 つの利用方法**: CLI スクリプトとしても、MCP サーバーとしても動作する
- **軽量**: 外部ライブラリに依存せず、OpenAI API に依存するのみ
- **エラー ハンドリング**: CLI モードは stderr、MCP モードは JSON 形式で返却する

## セットアップ

### 前提条件

- Python がインストール済み
- OpenAI API キーを取得済み

### uv のインストール

translate-mcp は `uv` で管理されているため、まず `uv` をインストールする必要がある。

`uv` のインストール方法は [Installation | uv](https://docs.astral.sh/uv/getting-started/installation/) を参照すること。

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### translate-mcp のインストール

`uv` を使う場合は以下のコマンドでインストールできる。

```bash
uv tool install git+https://github.com/Himeyama/translate-mcp
```

`uvx` を使えばインストール不要で直接実行も可能である。

```bash
uvx git+https://github.com/Himeyama/translate-mcp --help
```

## 使用方法

### CLI モード

ファイルを翻訳する場合は以下のように実行する。

```bash
translate --input blog/2026-04-02-example.md --from Japanese --to English
```

結果は標準出力に出力される。リダイレクトでファイルに保存できる。

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English \
  --output i18n/en/blog/2026-04-02-example.md
```

#### パラメータ

- `--mcp`: MCP モード
- `--input`: 翻訳するファイルのパス
- `--from`: 元の言語（例: Japanese、English）
- `--to`: 翻訳先の言語（例: English、Taiwanese）
- `--output` (オプション): 翻訳済みテキストの保存先
- `--model` (オプション): OpenAI モデル（例: gpt-5-mini）
- `--debug` (オプション): デバッグモード

#### エラー時

エラーが発生した場合は stderr に出力される。

### MCP サーバーモード

MCP サーバーとして起動し、Claude Code や他の AI ツールから利用できる。

```bash
translate --mcp
```

## 実践例

ブログ記事を日本語から英語と繁体字中国語（台湾）に翻訳する場合について説明する。

### 日本語版（元記事）

```bash
# blog/2026-04-02-example.md に日本語の記事がある状態
```

### 英語版を生成

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English > i18n/en/docusaurus-plugin-content-blog/2026-04-02-example.md
```

### 台湾版（繁体字中国語）を生成

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to Taiwanese > i18n/zh-TW/docusaurus-plugin-content-blog/2026-04-02-example.md
```

## メリット・デメリット

### メリット

- **精度が高い**: OpenAI の高品質モデル（GPT-4 など）を使用する
- **スキル対応**: ChatGPT や Claude の様々なツールに統合可能である
- **シンプル**: セットアップと使い方が非常に簡単である
- **カスタマイズ可能**: ソースコードが公開されているため、カスタマイズも可能である

### デメリット

- **API 費用がかかる**: 翻訳量に応じて OpenAI API の費用が発生する
- **インターネット接続が必須**: API 呼び出しが必要なため、オフライン利用は不可である
- **レート制限**: OpenAI API のレート制限の影響を受ける

## まとめ

translate-mcp は、OpenAI API を活用した **シンプルで高品質な翻訳ツール** である。ブログ記事の多言語対応、ドキュメント翻訳、AI ツールへの統合など、様々なシーンで活躍する。

特に Docusaurus などの静的サイト ジェネレーターで複数言語をサポートしたい場合、自動化スクリプトとしての利用が効果的である。

## 参考

- [GitHub - Himeyama/translate-mcp](https://github.com/Himeyama/translate-mcp)
- [OpenAI API Documentation](https://platform.openai.com/docs)
