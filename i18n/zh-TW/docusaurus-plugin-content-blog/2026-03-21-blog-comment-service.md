---
title: 在 AWS 無伺服器環境下自建部落格留言 API
authors: hikari
tags: [AWS, Web]
image: /img/ogp/2026-03-21-blog-comment-service.webp
---

想要在這個部落格加入留言功能，因此在 AWS 無伺服器架構下自建了一個 API。介紹其設計與實作。

## 架構

請求以以下流程處理。

```
瀏覽器 (www.hikari-dev.com)
  ↓ HTTPS
API Gateway
  ├── GET  /comment?postId=...    → 取得留言
  ├── POST /comment               → 發表留言
  └── PATCH /comment/{id}         → 管理（切換隱藏）
  ↓
Lambda (Node.js 20 / arm64)
  ↓
DynamoDB（儲存留言）
  + SES v2（通知管理者）
```

程式碼以 TypeScript 撰寫，並以 SAM（Serverless Application Model）管理基礎設施即程式碼（IaC）。Lambda 採用 arm64（Graviton2）以稍微節省成本。

## DynamoDB 的資料表設計

資料表名稱為 `blog-comments`，分區鍵為 `postId`，排序鍵為 `commentId`。

| 鍵 | 型別 | 說明 |
|----|------|------|
| `postId` | String | 文章的識別值（例: `/blog/2026/03/20/hime`） |
| `commentId` | String | ULID（可時序排序的 ID） |

因為在排序鍵使用 ULID，使用 `QueryCommand` 取得的留言會自動按發表順序排列。這也是為什麼沒有使用 UUID 的原因。

## 垃圾留言過濾

在將留言寫入 DynamoDB 之前，會與 `keywords.json` 中定義的關鍵字比對。

若命中關鍵字，會以 `isHidden: true` 自動隱藏，並附加 `isFlagged: "1"`。若未命中則立即公開。

`isFlagged` 作為稀疏 GSI（Sparse GSI）的鍵使用。未命中的留言不會帶入此屬性，因此不會在 GSI 中增加多餘的分區，對成本與效能都有利。只要在 DynamoDB Document Client 設定 `removeUndefinedValues: true` 就能達成。

## 通知管理者的郵件

每次有留言發表時，會用 SES v2 發信通知自己。郵件內容包含發言者名稱、內容、評分、IP 位址以及是否被標記（flag）等資訊。

郵件發送採非同步進行，即使發送失敗也會忽略錯誤（不影響使用者流程）。這是為了避免影響留言發表的回應速度。

## 隱私考量

雖然會在 DynamoDB 中儲存 IP 位址與 User-Agent，但不會把它們包含在 GET 端點的回應中。我們在型別定義層就進行分離。

## 安全性

| 層級 | 對策 |
|------|------|
| 網路 | 使用 AWS WAF 設定每個 IP 每 5 分鐘 100 次的速率限制 |
| CORS | 僅允許 `https://www.hikari-dev.com` |
| 管理 API | API Gateway 的 API Key 認證（`X-Api-Key` 標頭） |
| 垃圾留言 | 關鍵字過濾自動隱藏 |

管理端點（`PATCH /comment/{id}`）只要在 SAM 模板設定 `ApiKeyRequired: true` 即可啟用 API 金鑰認證。無需自行實作 Lambda Authorizer，較為簡單。

## 總結

採用無伺服器架構後不需管理伺服器，DynamoDB 的按需付費讓流量低的個人部落格也能把成本降到最低。

程式碼以 SAM + TypeScript + esbuild 打包，僅需執行 `sam build && sam deploy` 即可部署。