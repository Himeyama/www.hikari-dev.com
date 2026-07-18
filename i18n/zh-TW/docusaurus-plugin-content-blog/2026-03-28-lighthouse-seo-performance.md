---
title: "在 Docusaurus 部落格把 PageSpeed Insights 幾乎做滿分的方法 — SEO、效能、可及性"
authors: hikari
tags: [Web, SEO]
image: /img/ogp/2026-03-28-lighthouse-seo-performance.webp
---

我把這個部落格的行動版 PageSpeed Insights 分數改善到 **Performance 99、Accessibility 100、Best Practices 100、SEO 100**。從 SEO、效能、可及性 三個面向整理我做過的改動。

{/**/}

## 改善前的問題

在原生的 Docusaurus 部落格跑 PageSpeed Insights 時，發現了幾個問題。

- **SEO**：沒有 meta description、沒有 OGP/Twitter Cards、沒有結構化資料、網站地圖的 priority 未設定
- **效能**：因為 Google Tag Manager (GTM) 同步載入導致未使用的 JS 過大、從外部 CDN 取得 avatar 成為瓶頸
- **可及性**：主要顏色的對比度未達 WCAG AA 標準

## SEO 的改善

### 新增 meta description、OGP、Twitter Cards

在 `docusaurus.config.ts` 的 `themeConfig.metadata` 中加入站點共通的 meta 資訊。

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

另外，透過 Swizzle 覆寫 `src/theme/Layout/index.tsx`，為沒有自訂 description 的頁面（例如部落格列表、標籤頁）設定以語系為單位的備用 description。

### 新增 robots.txt

加入 `static/robots.txt`，明確告訴爬蟲網站地圖的位置。

### BlogPosting JSON-LD（結構化資料）

透過 Swizzle 覆寫 `src/theme/BlogPostItem/index.tsx`，在文章頁輸出包含 `headline`、`datePublished`、`dateModified`、`author` 的 `BlogPosting` JSON-LD。

不過後來發現 Docusaurus 內建的 `BlogPostPage/StructuredData` 已經會輸出相同的資料。把自訂的 JSON-LD 移除，改為在內建元件上加上 `keywords` 的備援（`frontMatter.keywords` → `tags`）。結構化資料重複會對 SEO 造成負面影響，整理這點相當重要。

### WebSite JSON-LD

在 `docusaurus.config.ts` 的 `headTags` 加入 `WebSite` 類型的 JSON-LD，讓 Google 能正確辨識站名。

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

### 自動為所有文章生成 OGP 圖片

建立 `scripts/generate-ogp.js`，自動根據標籤產生漸層背景的 OGP 圖片。如此一來，所有文章在社群分享時都會帶有吸睛的圖片。為每篇文章的 frontMatter 設定 `image:` 欄位，若文章已有專屬圖片則優先使用。

### 改善網站地圖

使用 `createSitemapItems` 回呼把首頁 priority 設為 `1.0`、部落格文章設為 `0.8`。另外從 URL 含有的日期自動抽出 `lastmod`。

### hreflang x-default

在 `src/theme/Root.tsx` 注入帶有 `hreflang="x-default"` 的 `<link>`，將英文頁面（`/en/...`）對應到預設（日文） URL，讓搜尋引擎能正確辨識語言變體。

```tsx
const defaultPath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
const xDefaultUrl = `${siteConfig.url}${defaultPath}`;

<Head>
  <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
</Head>
```

## 效能的改善

### GTM 延遲載入

移除 `@docusaurus/plugin-google-gtag`，改在 `src/clientModules/gtag.js` 裡於 `window.load` 事件之後動態注入 GTM 腳本。如此一來，可大幅減少阻塞初始渲染的未使用 JS。

```js
function loadGtag() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

window.addEventListener('load', loadGtag, { once: true });
```

在 SPA 的頁面切換時使用 Docusaurus 的 `onRouteDidUpdate` hook 手動呼叫 `window.gtag`。另外也使用 `requestIdleCallback` 在閒置時載入加以優化。

### 將 avatar 自行託管並轉為 WebP

把 avatar 圖片從 GitHub CDN（`avatars.githubusercontent.com`）移到自行託管。GitHub CDN 的快取 TTL 很短（5 分鐘），在 PageSpeed Insights 上每次都會被視為外部請求。

把 avatar 轉為 WebP，檔案從 34 KB（PNG）降到 3.5 KB，約減少 90%。

### 圖片尺寸優化與修正 CLS

- 在 GitHub avatar URL 加上 `?size=64`，把 460 px 縮到 64 px（減少 33 KB）
- 在導航列 logo 加上 `width`/`height` 屬性以修正 CLS（Cumulative Layout Shift）
- 在 `<img>` 標籤加入 `loading="lazy"`

### 導入 rspack / SWC

安裝 `@docusaurus/faster`，把 webpack 換成 rspack + SWC + lightningCSS。

```ts
future: {
  v4: true,
  experimental_faster: true,
},
```

如此一來，建置速度和打包體積都改善了。

### 停用未使用的插件

停用未使用的 docs 外掛，避免不必要的 JS 被傳到用戶端。

### 僅在行動裝置載入 Google Fonts

Noto Sans JP 在我的站只在行動版需要。利用 `matchMedia` 判斷行動裝置，僅在行動裝置動態注入字型樣式表，桌面版因此減少約 130 KB 的未使用 CSS。

## 可及性的改善

### 修正對比度

把主要色從 `#F15EB4` 改為 `#C82273`，在白底下達到對比度 5.3:1（符合 WCAG AA）。深色模式則使用 `#F36AB2`（在暗底下為 7.0:1）。

文章日期文字的顏色改用 CSS 變數 `--post-date-color` 管理，淺色模式為 `#595959`（7.0:1），深色模式為 `#9e9e9e`。

### 統一字型

把標題與 `<strong>` 的字型從 Noto Serif JP 改為 Noto Sans JP，以與內文保持一致性。

## 結果

| 類別 | 分數 |
|------|------|
| Performance | **99** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

在行動裝置上幾乎達到滿分。

## 總結

對我影響最大的三項變更如下：

1. **GTM 的延遲載入**：大幅減少未使用的 JS，效能分數大幅提升
2. **OGP 與結構化資料的整理**：達成 SEO 100，社群分享時的呈現也改善
3. **修正對比度**：符合 WCAG AA 讓可及性達到 100

Docusaurus 預設就能生成高品質網站，但要在 PageSpeed Insights 上追求幾乎滿分，仍需針對 GTM 的載入策略、meta 資訊與可及性的細節做調整。希望對也在做同類改善的人有所幫助。