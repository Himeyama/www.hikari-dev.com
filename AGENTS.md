## ひかりの備忘録
Docusaurus による個人ブログ

### ファイル配置
ブログ本文 (日本語): /blog/<blog-file-name>.md
ブログ本文 (英語): /i18n/en/docusaurus-plugin-content-blog/<blog-file-name>.md
画像: /static/img/blog/<blog-file-name>/<image>

### ブログ記事の作成

#### ファイル命名規則
`YYYY-MM-DD-slug.md` 形式。日付は記事の公開日。

#### フロントマター
```yaml
---
title: 記事のタイトル
authors: hikari
---
```

`authors` は `hikari` 固定（`blog/authors.yml` で定義済み）。

#### 記事の言語
日本語で作成する。見出しは `##` (h2) から始める。

### プロジェクト構成
- `/blog/` — ブログ記事 (Markdown)
- `/docs/` — ドキュメント
- `/src/` — カスタムコンポーネント・ページ
- `/static/` — 静的ファイル（画像など）
- `/i18n/` — 多言語対応ファイル
- `docusaurus.config.ts` — Docusaurus 設定
