---
description: 新しいブログ記事を作成する。トピックを受け取り、Docusaurus 形式のフロントマター付き Markdown ファイルを生成する。
---

以下の手順で新しいブログ記事を作成してください。

## 手順

1. **引数の確認**
   - `$ARGUMENTS` にトピックや指示が含まれている場合はそれを使用する
   - 引数がない場合は、ユーザーにブログのトピックと希望する内容を AskUserQuestion ツールで質問する

2. **既存記事の確認**
   - `blog/` ディレクトリ内の最近のいくつかの記事を読み、文体・構成・タグの傾向を把握する

3. **ファイル名の決定**
   - 形式: `YYYY-MM-DD-slug.md`
   - 日付は今日の日付を使用する（currentDate コンテキストを参照）
   - slug は記事内容を表す英語のケバブケース（例: `install-docker`）

4. **フロントマターの作成**
   ```yaml
   ---
   title: （日本語タイトル）
   authors: hikari
   tags: [タグ1, タグ2]
   ---
   ```
   - `authors` は常に `hikari`
   - `tags` は記事の内容に合わせた適切なタグを選ぶ（英語または日本語）

5. **記事本文の作成**
   - 冒頭に記事の概要を1〜2文で書く（`<!-- truncate -->` の前に置くことで一覧ページに表示される）
   - 適切な見出し（## / ###）で構成する
   - コードブロックには言語を指定する（```bash, ```yaml など）
   - 文体は既存記事に合わせる（ですます調）

6. **ファイルの書き込み**
   - Write ツールで `blog/YYYY-MM-DD-slug.md` にファイルを作成する

7. **完了報告**
   - 作成したファイルのパスと内容の概要をユーザーに伝える

## 多言語版記事の作成

各言語版はすべて日本語版と **同じファイル名** を使用する。`tags` は日本語版と同じ値を使用する。コードブロックはそのまま流用する。

## 翻訳スクリプトの実行
> 翻訳ツールのインストール
```ps1
uv tool install git+https://github.com/Himeyama/translate-mcp
```

> 例: 日本語 -> 台湾語
```ps1
translate `
  --input blog/2024-04-20-pyplot.md --from Japanese --to Taiwanese >`
  i18n/zh-TW/docusaurus-plugin-content-blog/2024-04-20-pyplot.md
```

> 例: 日本語 -> 英語
```ps1
translate `
  --input blog/2024-04-20-pyplot.md --from Japanese --to English >`
  i18n/en/docusaurus-plugin-content-blog/2024-04-20-pyplot.md
```

### 英語版

- **配置先**: `i18n/en/docusaurus-plugin-content-blog/YYYY-MM-DD-slug.md`
- **タイトル**: 日本語タイトルを英語に翻訳する
- **本文**: 日本語版の内容を英語に翻訳する

```yaml
---
title: (English title)
authors: hikari
tags: [tag1, tag2]
---
```

### 台湾版（繁体字中国語）

- **配置先**: `i18n/zh-TW/docusaurus-plugin-content-blog/YYYY-MM-DD-slug.md`
- **タイトル**: 日本語タイトルを繁体字中国語に翻訳する
- **本文**: 日本語版の内容を繁体字中国語（台湾）に翻訳する。台湾で一般的に使われる表現・用語を使用する

```yaml
---
title: （繁體中文標題）
authors: hikari
tags: [tag1, tag2]
---
```

## 注意事項
- 日本語記事は `blog/` に、英語記事は `i18n/en/docusaurus-plugin-content-blog/` に、台湾版は `i18n/zh-TW/docusaurus-plugin-content-blog/` に作成する
- コマンドや技術用語は英語のまま使用する
- フロントマターに `description` や `image` は不要（既存スタイルに合わせる）
