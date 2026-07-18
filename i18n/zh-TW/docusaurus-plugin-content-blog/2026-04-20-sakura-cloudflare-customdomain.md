---
title: 在 Cloudflare Workers 上將自訂域名指向櫻花伺服器的子路徑
authors: [hikari]
tags: [Cloudflare, 櫻花租用伺服器]
image: /img/ogp/2026-04-20-sakura-cloudflare-customdomain.webp
---

## 背景

櫻花的租用伺服器「輕量方案」以 **每月121元** 的超低價格提供36個月的預付方案。（12個月預付則為每月165元）
對於靜態文件的託管或 **CGI** 用途而言，這個價格相當合理，非常適合個人用途的儲存。

然而，所分配的域名會是 `用戶名稱.sakura.ne.jp` 的子域名，
若想要將自訂域名綁定於特定路徑，就需要一些技巧。

## 想要達成的目標

當訪問 `https://app.example.com` 時，
應該能在不更改 **URL** 的情況下顯示 `https://sakurauser.sakura.ne.jp/app/` 的內容。

## 為什麼簡單的 DNS 設定無法實現

DNS 的 CNAME 記錄只能指定主機名稱，無法指定包含 **路徑** 的 URL，如 `/app/`。

雖然使用重定向 (301) 也是一種方法，但這樣會使瀏覽器的地址欄中的 URL 變為 `sakurauser.sakura.ne.jp/flower/`。

使用 Cloudflare Workers 的**透明代理**方式，
可以讓 URL 保持為 `app.example.com`。

## 前提條件

- 已在 Cloudflare 註冊自訂域名（例如: `example.com`）
- 使用 Cloudflare 的免費方案即可（每日 100,000 次請求以內免費）

## 步驟

### 1. 創建 Worker

1. 進入 Cloudflare 儀表板 → **Workers & Pages** → **Create**
2. 選擇 **Start with Hello World!**
3. 輸入 Worker 名稱（例如: `storage-proxy`） 
4. 點擊 **Deploy**

### 2. 編輯代碼

部署後，點擊 **Edit code**，
將其全部替換為以下代碼。

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL("https://sakurauser.sakura.ne.jp");
    target.pathname = "/app" + url.pathname;
    target.search = url.search;

    const newRequest = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await fetch(newRequest);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete("content-security-policy");
    newHeaders.delete("x-frame-options");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }
};
```

## 總結

- 櫻花租用伺服器的輕量方案價格非常便宜，特別適合用來儲存靜態文件，僅需 **每月121元**。
- 然而，要將自訂域名指向子路徑的 DNS 設定不是標準功能。
- 通過使用 **Cloudflare Workers** 作為透明代理，可以在不改變 URL 的情況下提供內容。
- Workers 的代碼大約只需要幾十行，並且可以在 Cloudflare 免費方案的範圍內運作。