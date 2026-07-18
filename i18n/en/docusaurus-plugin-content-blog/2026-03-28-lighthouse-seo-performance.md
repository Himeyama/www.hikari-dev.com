---
title: "How I Achieved Near-Perfect Lighthouse Scores on a Docusaurus Blog — SEO, Performance & Accessibility"
authors: hikari
tags: [Web, SEO]
image: /img/ogp/2026-03-28-lighthouse-seo-performance.webp
---

I improved this blog's mobile Lighthouse scores to **Performance 99, Accessibility 100, Best Practices 100, and SEO 100**. Here's what I did, broken down into SEO, performance, and accessibility improvements.

{/**/}

## Problems Before the Improvements

Running Lighthouse on the Docusaurus blog revealed several issues:

- **SEO**: No meta description, no OGP/Twitter Cards, no structured data, no sitemap priority
- **Performance**: Synchronous Google Tag Manager (GTM) loading causing large unused JS, external CDN avatar fetching as a bottleneck
- **Accessibility**: Primary color contrast ratio failing WCAG AA requirements

## SEO Improvements

### Adding meta description, OGP & Twitter Cards

I added default site-wide metadata to `themeConfig.metadata` in `docusaurus.config.ts`:

```ts
themeConfig: {
  metadata: [
    { name: 'description', content: "Hikari's tech notebook..." },
    { property: 'og:locale', content: 'ja_JP' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: '@ptrqr' },
  ],
}
```

I also swizzled `src/theme/Layout/index.tsx` to provide locale-specific fallback descriptions for pages without their own description (blog listing, tag pages, etc.).

### Adding robots.txt

Added `static/robots.txt` to explicitly point crawlers to the sitemap.

### BlogPosting JSON-LD (Structured Data)

I initially swizzled `src/theme/BlogPostItem/index.tsx` to output `BlogPosting` JSON-LD on article pages with `headline`, `datePublished`, `dateModified`, and `author`.

Later I discovered that Docusaurus's built-in `BlogPostPage/StructuredData` already outputs equivalent data. I removed the custom JSON-LD and instead added a `keywords` fallback (`frontMatter.keywords` → `tags`) to the built-in component. Duplicate structured data can hurt SEO, so this cleanup was important.

### WebSite JSON-LD

Added `WebSite` type JSON-LD in `docusaurus.config.ts`'s `headTags` to help Google correctly identify the site name.

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

### Auto-Generated OGP Images for All Posts

Created `scripts/generate-ogp.js` to automatically generate OGP images with tag-based gradient backgrounds. This ensures every post has an eye-catching image when shared on social media. All posts now have an `image:` field in their frontmatter.

### Sitemap Improvements

Used the `createSitemapItems` callback to set the homepage priority to `1.0` and blog posts to `0.8`. Also added automatic `lastmod` extraction from the date in each URL.

### hreflang x-default

In `src/theme/Root.tsx`, I inject an `hreflang="x-default"` `<link>` tag on every page, mapping English pages (`/en/...`) back to the default (Japanese) URL. This helps search engines correctly identify language variants.

```tsx
const defaultPath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
const xDefaultUrl = `${siteConfig.url}${defaultPath}`;

<Head>
  <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
</Head>
```

## Performance Improvements

### Lazy-Loading GTM

I replaced `@docusaurus/plugin-google-gtag` with a custom `src/clientModules/gtag.js` that dynamically injects the GTM script after the `window.load` event. This significantly reduced unused JS blocking initial render.

```js
function loadGtag() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

window.addEventListener('load', loadGtag, { once: true });
```

SPA page transitions use Docusaurus's `onRouteDidUpdate` hook to manually call `window.gtag`. A further improvement defers loading to `requestIdleCallback` for even better idle-time utilization.

### Self-Hosting & WebP Avatar

Moved the avatar image from GitHub's CDN (`avatars.githubusercontent.com`) to self-hosted. GitHub CDN has a 5-minute cache TTL, which Lighthouse flagged on every run.

Converted the avatar to WebP format, reducing file size from 34 KB (PNG) to 3.5 KB — roughly a 90% reduction.

### Image Size Optimization & CLS Fix

- Added `?size=64` to the GitHub avatar URL, shrinking from 460 px to 64 px (saving 33 KB)
- Added `width`/`height` attributes to the navbar logo to fix CLS (Cumulative Layout Shift)
- Added `loading="lazy"` to `<img>` tags

### rspack / SWC

Introduced `@docusaurus/faster`, replacing webpack with rspack + SWC + lightningCSS:

```ts
future: {
  v4: true,
  experimental_faster: true,
},
```

This improved both build speed and bundle size.

### Disabling Unused Plugins

Disabled the unused docs plugin to prevent unnecessary JS from being shipped to clients.

### Mobile-Only Google Fonts

Google Fonts (Noto Sans JP) was only needed on mobile. Using `matchMedia`, the font stylesheet is now dynamically injected only on mobile devices, saving approximately 130 KB of unused CSS on desktop.

## Accessibility Improvements

### Fixing Contrast Ratios

Changed the primary color from `#F15EB4` to `#C82273`, achieving a **contrast ratio of 5.3:1** against white (WCAG AA compliant). Dark mode uses `#F36AB2` (7.0:1 against the dark background).

Post date text color is now managed via the `--post-date-color` CSS variable: `#595959` (7.0:1) in light mode, `#9e9e9e` in dark mode.

### Font Unification

Changed heading and `<strong>` fonts from Noto Serif JP to Noto Sans JP for consistency with body text.

## Results

| Category | Score |
|----------|-------|
| Performance | **99** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

Near-perfect scores on mobile.

## Summary

The three most impactful changes were:

1. **Lazy-loading GTM**: Dramatically reduced unused JS and boosted performance scores
2. **OGP & structured data**: Achieved SEO 100 and improved social media sharing appearance
3. **Contrast ratio fixes**: WCAG AA compliance brought accessibility to 100

Docusaurus generates high-quality sites by default, but achieving near-perfect Lighthouse scores requires fine-tuning GTM loading strategy, metadata, and accessibility details. I hope this helps others working on similar improvements.
