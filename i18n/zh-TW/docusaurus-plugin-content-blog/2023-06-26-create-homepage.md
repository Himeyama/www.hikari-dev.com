---
title: 建立個人主頁
description: 關於如何建立個人主頁的備忘錄
authors: hikari
tags: [網頁開發, 主頁, Docusaurus]
image: /img/ogp/2023-06-26-create-homepage.webp
---

這篇備忘錄記錄了如何建立個人主頁。

:::info
建立個人主頁是展示個人作品、技能、簡歷和聯絡方式的重要方式。它可以用作個人品牌建設、求職或僅僅作為一個分享興趣愛好的平台。
:::

## 1. 選擇技術棧

建立個人主頁有許多種方法，從靜態網頁到複雜的內容管理系統 (CMS)。選擇合適的技術棧取決於你的需求和技術熟練度。

### A. 靜態站點生成器 (SSG) - 推薦

靜態站點生成器是建立個人主頁的流行選擇，因為它們易於部署、加載速度快、安全且通常免費託管。

-   **Docusaurus**：用於建立文檔網站（如本網站）。它基於 React，支持 Markdown，並提供內置的搜尋、版本控制和國際化功能。
-   **Jekyll**：基於 Ruby 的 SSG，與 GitHub Pages 緊密集成。
-   **Hugo**：基於 Go 語言的 SSG，以其極快的構建速度而聞名。
-   **Next.js / Gatsby**：基於 React 的框架，可以生成靜態站點。

### B. 前端框架 (SPA)

如果你需要更多互動性或動態內容，可以使用前端框架創建單頁應用程式 (SPA)。

-   **React**
-   **Vue.js**
-   **Angular**

### C. 內容管理系統 (CMS)

如果你希望有管理界面來輕鬆更新內容，可以使用 CMS。

-   **WordPress**
-   **Joomla**
-   **Ghost**

## 2. 規劃內容

在開始編寫程式碼之前，先規劃你的主頁應該包含哪些內容。常見的內容區塊包括：

-   **首頁 / 關於我**：簡要介紹自己、你的興趣和目標。
-   **作品集 / 專案**：展示你的最佳作品，包括截圖、鏈接和簡要說明。
-   **技能**：列出你的技術技能、程式語言、工具和框架。
-   **經歷 / 簡歷**：你的教育背景、工作經歷和成就。
-   **部落格 / 文章**：如果你喜歡寫作，可以分享你的知識和見解。
-   **聯絡方式**：電子郵件、GitHub、LinkedIn、Twitter 等社交媒體鏈接。

## 3. 建立個人主頁 (以 Docusaurus 為例)

本網站就是使用 Docusaurus 建立的，所以這裡以 Docusaurus 為例。

### A. 建立 Docusaurus 專案

```bash
npx create-docusaurus@latest my-website classic --typescript
cd my-website
```

### B. 配置 Docusaurus

編輯 `docusaurus.config.ts` 文件以配置網站標題、導航欄、腳註等。

### C. 建立個人主頁內容

1.  **修改首頁**：
    默認的首頁是 `src/pages/index.tsx`。你可以編輯這個 React 組件來設計你的首頁。

    ```tsx
    // src/pages/index.tsx
    import React from 'react';
    import clsx from 'clsx';
    import Layout from '@theme/Layout';
    import Link from '@docusaurus/Link';
    import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
    import styles from './index.module.css';
    import HomepageFeatures from '../components/HomepageFeatures';

    function HomepageHeader() {
      const {siteConfig} = useDocusaurusContext();
      return (
        <header className={clsx('hero hero--primary', styles.heroBanner)}>
          <div className="container">
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p className="hero__subtitle">{siteConfig.tagline}</p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/intro">
                我的簡歷 - 5min 閱讀 ⏱️
              </Link>
            </div>
          </div>
        </header>
      );
    }

    export default function Home(): JSX.Element {
      const {siteConfig} = useDocusaurusContext();
      return (
        <Layout
          title={`Hello from ${siteConfig.title}`}
          description="Description will go into a meta tag in <head />">
          <HomepageHeader />
          <main>
            <HomepageFeatures />
          </main>
        </Layout>
      );
    }
    ```

2.  **建立個人資料頁面 (例如 `about.md`)**：
    你可以在 `docs/` 目錄下創建 Markdown 文件作為關於你的頁面。

    ```markdown
    {/**/}
    ---
    sidebar_position: 1
    ---

    # 關於我

    你好！我是 [你的名字]，一位熱愛 [你的興趣] 的 [你的職位/角色]。
    我在 [領域] 擁有 [X] 年的經驗，專注於 [你的專長]。

    ## 我的技能

    -   程式語言：Python, JavaScript, C#
    -   框架：React, Node.js, .NET
    -   工具：Git, Docker, Kubernetes

    ## 我的專案

    -   **專案 A**：[鏈接] - 簡要說明
    -   **專案 B**：[鏈接] - 簡要說明

    ## 聯絡方式

    -   電子郵件：your_email@example.com
    -   GitHub：[你的 GitHub]
    -   LinkedIn：[你的 LinkedIn]
    ```

3.  **配置導航欄**：
    在 `docusaurus.config.ts` 中修改 `navbar` 配置，添加指向你的關於我頁面、部落格等鏈接。

    ```typescript
    navbar: {
      title: 'Hikari Dev',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro', // 指向你的關於我或簡歷文檔
          position: 'left',
          label: '關於我',
        },
        {to: '/blog', label: '部落格', position: 'left'},
        // ... 其他鏈接
      ],
    },
    ```

### D. 部署網站

最簡單的方法是使用 GitHub Pages 或 Vercel / Netlify。Docusaurus 有內置的部署功能。

-   **GitHub Pages**：
    在 `docusaurus.config.ts` 中配置 `baseUrl` 和 `projectName`。
    ```typescript
    baseUrl: '/<your-repo-name>/', // 例如，如果你的 repo 是 yourusername.github.io/my-website
    projectName: 'my-website',
    organizationName: 'yourusername',
    ```
    然後運行部署命令：
    ```bash
    GIT_USER=<YOUR_GITHUB_USERNAME> USE_SSH=true yarn deploy
    ```

## 總結

建立個人主頁是一個展現自己的絕佳機會。選擇合適的工具、精心策劃內容，並利用靜態站點生成器等現代技術，你可以輕鬆地建立一個專業且美觀的個人網站。
