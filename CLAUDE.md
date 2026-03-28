# ブログ作成

- 新しいブログ記事を作成する場合は [new-blog.md](new-blog.md) の手順に従うこと。
- ブログの気泡については [style-guide.md](style-guide.md) の手順に従うこと。

# SEO

## OGP 画像
- Docusaurus はフロントマターの `image:` から記事ごとの OGP 画像を自動設定する。
- 新しいブログ記事を作成する際は、記事内の代表画像を `image:` に設定すること。
  ```yaml
  ---
  title: 記事タイトル
  image: /img/blog/YYYY-MM-DD-slug/thumbnail.png
  ---
  ```
- `image:` が未設定の場合、タグベースのグラデーション PNG (`/img/ogp/SLUG.png`) が使われる。
  - 画像は `scripts/generate-ogp.js` で生成済み（外部ライブラリ不要）。
  - 新記事を追加して `image:` を設定しない場合は `node scripts/generate-ogp.js` を再実行すること。
  - タグと色の対応は同スクリプト内の `TAG_COLORS` を編集して変更できる。
- パスに括弧 `()` を含む画像も YAML フロントマターには直接記述できる（Markdown リンク構文とは異なる）。

## JSON-LD (構造化データ)
- BlogPosting の JSON-LD は Docusaurus 標準の `BlogPostPage/StructuredData` が出力する。
- `src/theme/BlogPostItem/index.tsx` では JSON-LD を出力しないこと（重複になる）。
- キーワードは `src/theme/BlogPostPage/StructuredData/index.tsx` で `frontMatter.keywords` → `tags` の順にフォールバックして自動設定される。記事に明示的に keywords を設定したい場合はフロントマターに追加する。
  ```yaml
  keywords: [キーワード1, キーワード2]
  ```

# Git

- プッシュ前に必ず `npm run build` を実行し、ビルドが成功することを確認すること。
