---
title: "Docusaurus ブログで PageSpeed Insights ほぼ満点を達成した方法 — SEO・パフォーマンス・アクセシビリティ"
authors: hikari
tags: [Web, SEO]
image: /img/ogp/2026-03-28-pagespeed-insights-seo-performance.png
---

このブログのモバイル PageSpeed Insights スコアを **Performance 99、Accessibility 100、Best Practices 100、SEO 100** まで改善した。SEO・パフォーマンス・アクセシビリティの各観点から、実施した変更をまとめる。

<!-- truncate -->

## 改善前の課題

素の Docusaurus ブログで PageSpeed Insights を実行すると、いくつかの問題が見つかった。

- **SEO**: meta description なし、OGP/Twitter Cards なし、構造化データなし、サイトマップの priority 未設定
- **パフォーマンス**: Google Tag Manager (GTM) の同期読み込みによる未使用 JS の肥大化、外部 CDN からのアバター取得がボトルネック
- **アクセシビリティ**: プライマリカラーのコントラスト比が WCAG AA 基準を未達

## SEO の改善

### meta description・OGP・Twitter Cards の追加

`docusaurus.config.ts` の `themeConfig.metadata` にサイト共通のメタデータを追加した。

```ts
themeConfig: {
  metadata: [
    { name: 'description', content: "ひかりの技術メモ..." },
    { property: 'og:locale', content: 'ja_JP' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@ptrqr' },
  ],
}
```

また、`src/theme/Layout/index.tsx` を Swizzle して、独自の description を持たないページ（ブログ一覧、タグページなど）にロケール別のフォールバック description を設定している。

### robots.txt の追加

`static/robots.txt` を追加し、クローラーにサイトマップの場所を明示した。

### BlogPosting JSON-LD（構造化データ）

`src/theme/BlogPostItem/index.tsx` を Swizzle して、記事ページに `headline`・`datePublished`・`dateModified`・`author` を含む `BlogPosting` JSON-LD を出力していた。

しかし、Docusaurus 組み込みの `BlogPostPage/StructuredData` が同等のデータを出力していることが判明。カスタム JSON-LD を削除し、代わりに組み込みコンポーネントに `keywords` のフォールバック（`frontMatter.keywords` → `tags`）を追加した。構造化データの重複は SEO に悪影響を与えるため、この整理は重要であった。

### WebSite JSON-LD

`docusaurus.config.ts` の `headTags` に `WebSite` タイプの JSON-LD を追加し、Google がサイト名を正しく認識できるようにした。

```ts
headTags: [
  {
    tagName: 'script',
    attributes: { type: 'application/ld+json' },
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ひかりの備忘録',
      url: 'https://www.hikari-dev.com/',
    }),
  },
],
```

### 全記事への OGP 画像自動生成

`scripts/generate-ogp.js` を作成し、タグに応じたグラデーション背景の OGP 画像を自動生成するようにした。これにより、SNS でシェアされた際にすべての記事が目を引く画像付きで表示される。全記事のフロントマターに `image:` フィールドを設定し、記事固有の画像がある場合はそちらを優先する。

### サイトマップの改善

`createSitemapItems` コールバックを使って、トップページの priority を `1.0`、ブログ記事を `0.8` に設定した。また、URL に含まれる日付から `lastmod` を自動抽出している。

### hreflang x-default

`src/theme/Root.tsx` で、すべてのページに `hreflang="x-default"` の `<link>` タグを注入し、英語ページ（`/en/...`）をデフォルト（日本語）の URL にマッピングしている。これにより、検索エンジンが言語バリアントを正しく識別できる。

```tsx
const defaultPath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
const xDefaultUrl = `${siteConfig.url}${defaultPath}`;

<Head>
  <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
</Head>
```

## パフォーマンスの改善

### GTM の遅延読み込み

`@docusaurus/plugin-google-gtag` を廃止し、`src/clientModules/gtag.js` で `window.load` イベント後に GTM スクリプトを動的注入するようにした。これにより、初期レンダリングをブロックする未使用 JS を大幅に削減できた。

```js
function loadGtag() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

window.addEventListener('load', loadGtag, { once: true });
```

SPA のページ遷移では Docusaurus の `onRouteDidUpdate` フックを使い、手動で `window.gtag` を呼び出している。さらに `requestIdleCallback` を利用してアイドル時に読み込むよう改善した。

### アバターのセルフホスト化と WebP 変換

アバター画像を GitHub CDN（`avatars.githubusercontent.com`）からセルフホストに移行した。GitHub CDN はキャッシュ TTL が 5 分と短く、PageSpeed Insights で毎回外部リクエストとして指摘されていた。

アバターを WebP 形式に変換し、ファイルサイズを 34 KB（PNG）から 3.5 KB へ、約 90% 削減した。

### 画像サイズの最適化と CLS の修正

- GitHub アバター URL に `?size=64` を追加し、460 px → 64 px に縮小（33 KB 削減）
- ナビバーのロゴに `width`/`height` 属性を追加して CLS（Cumulative Layout Shift）を修正
- `<img>` タグに `loading="lazy"` を追加

### rspack / SWC の導入

`@docusaurus/faster` を導入し、webpack を rspack + SWC + lightningCSS に置き換えた。

```ts
future: {
  v4: true,
  experimental_faster: true,
},
```

ビルド速度とバンドルサイズの両方が改善された。

### 未使用プラグインの無効化

使用していない docs プラグインを無効化し、不要な JS がクライアントに配信されないようにした。

### モバイル限定の Google Fonts 読み込み

Google Fonts（Noto Sans JP）はモバイルでのみ必要であった。`matchMedia` を使い、モバイル端末でのみフォントのスタイルシートを動的注入するようにしたことで、デスクトップで約 130 KB の未使用 CSS を削減した。

## アクセシビリティの改善

### コントラスト比の修正

プライマリカラーを `#F15EB4` から `#C82273` に変更し、白背景に対して**コントラスト比 5.3:1** を達成した（WCAG AA 準拠）。ダークモードでは `#F36AB2`（暗背景に対して 7.0:1）を使用している。

記事の日付テキストの色は CSS 変数 `--post-date-color` で管理し、ライトモードは `#595959`（7.0:1）、ダークモードは `#9e9e9e` とした。

### フォントの統一

見出しと `<strong>` のフォントを Noto Serif JP から Noto Sans JP に変更し、本文との統一感を持たせた。

## 結果

| カテゴリ | スコア |
|----------|--------|
| Performance | **99** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

モバイルでほぼ満点を達成した。

## まとめ

最もインパクトが大きかった変更は以下の 3 つである。

1. **GTM の遅延読み込み**: 未使用 JS を大幅に削減し、パフォーマンススコアが大きく向上した
2. **OGP・構造化データの整備**: SEO 100 を達成し、SNS シェア時の見栄えも改善された
3. **コントラスト比の修正**: WCAG AA 準拠によりアクセシビリティが 100 になった

Docusaurus はデフォルトでも高品質なサイトを生成するが、PageSpeed Insights でほぼ満点を目指すには GTM の読み込み戦略、メタデータ、アクセシビリティの細部を調整する必要がある。同じような改善に取り組む方の参考になれば幸いである。
