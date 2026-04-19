---
title: 從 AWS S3 移轉到 Cloudflare Pages
authors: [hikari]
tags: [AWS, Cloudflare, Docusaurus, CI/CD]
---

我將這個部落格從 AWS S3 移轉到 Cloudflare Pages。過去是用 S3 做靜態網站托管，透過 CloudFront 發佈，但為了簡化管理及提升效能，決定採用 Cloudflare Pages。

{/* truncate */}

## 為什麼選擇 Cloudflare Pages

之前是用 AWS 標準架構 S3 + CloudFront + Route53 運作，因下列原因決定移轉到 Cloudflare Pages。

1. **管理成本低**：內建 SSL 證書自動更新，還有全球邊緣部署。
2. **免費配額大**：個人部落格流量大多數功能都能免費使用。
3. **部署彈性**：不只支援 GitHub 整合，還能直接從 GitHub Actions 上傳，複雜的建置流程也能維持。

## 移轉步驟

### 1. 建立 GitHub Actions 工作流程

將原本用於 S3 部署的工作流程改寫為 Cloudflare Pages 用，這次使用 `cloudflare/pages-action`。

### 2. 建立 Cloudflare Pages 專案

透過 Cloudflare 控制台或 CLI（Wrangler）建立專案。這次為確實指定分支，使用了 Wrangler。

### 3. 切換 DNS

將原本指向 S3 的 `www.hikari-dev.com` DNS 紀錄更新成指向 Cloudflare Pages 的端點（`xxx.pages.dev`）。

在 Cloudflare Pages 側加入自訂網域時，會自動驗證並發行 SSL 證書。若舊有紀錄還在，驗證可能會失敗，所以先刪除再重新設定網域，才能順利生效。

## 移轉後感想

整個移轉過程非常順利，部署速度跟直接上傳到 S3 差不多。最棒的是將 AWS 上多個資源（S3 儲存桶、CloudFront 發佈、ACM 證書）整合到單一 Cloudflare Pages 專案，感覺非常方便。

未來也想嘗試利用 Cloudflare Workers 增加動態功能。