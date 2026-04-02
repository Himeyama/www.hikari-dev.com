---
title: 什麼是 CORS？從安全性角度為初學者解說
authors: hikari
tags: [Web, 安全性]
image: /img/ogp/2026-04-02-cors-security.png
---

説明 Web 瀏覽器的安全功能 **CORS (Cross-Origin Resource Sharing)**，涵蓋「為什麼需要」和「有什麼風險」，為初學者量身打造的解説。正確理解 CORS 能夠實現安全的 Web 開發。

<!-- truncate -->

## CORS 出現的背景：同源政策 (Same-Origin Policy)

在 1990 年代初期，JavaScript 被引入瀏覽器時，Web 安全的概念幾乎不存在。當時，惡意網站可以自由存取其他網站的資料，容易導致工作階段劫持 (Session Hijacking) 和資料竊取。

為了解決這個問題，引入了一項稱為**同源政策 (Same-Origin Policy)** 的限制。這是一個簡單而強大的規則：「從網頁加載的 JavaScript 無法存取該網頁不同源的資料」。

例如，從 `https://www.example.com` 加載的 JavaScript 無法存取 `https://www.bank.com` 的資料。這樣，即使使用者登入銀行網站後訪問惡意網站，銀行資訊也不會被盜取。

### 什麼是源 (Origin)

**源 (Origin)** 由以下三個要素決定：

- **協議 (Protocol)**：`http://` 或 `https://`
- **主機 (Host/網域)**：`example.com` 或 `api.example.com`
- **連接埠 (Port)**：`80` 或 `8080`

例如，

| URL | 協議 | 主機 | 連接埠 | 源 |
|-----|----------|--------|--------|----------|
| `https://www.example.com/page` | HTTPS | www.example.com | 443 (預設) | `https://www.example.com` |
| `https://api.example.com/data` | HTTPS | api.example.com | 443 (預設) | `https://api.example.com` |

由於主機不同，它們被視為**不同的源**。

### 同源政策防止的事項

JavaScript 的 **XHR (XMLHttpRequest)** 或 **Fetch API** 對不同源的請求受到限制。

例：evil.com 上的惡意指令碼
```javascript
fetch('https://bank.example.com/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ amount: 1000000 })
});
```

沒有同源政策的話，惡意網站 (`evil.com`) 的 JavaScript 可以在使用者登入銀行網站的狀態下發送轉帳請求。**防止這種情況就是同源政策的目的**。

## 為什麼需要 CORS

然而，現代 Web 開發經常涉及多個源的協作。

- **前端**：`https://www.example.com`
- **API 伺服器**：`https://api.example.com`
- **CDN / 靜態文件**：`https://cdn.example.com`

這些是**由同一公司營運的正當通訊**。但如果受到同源政策限制，應用程式就無法運作。

這時候 CORS (Cross-Origin Resource Sharing) 就派上用場了。

## 什麼是 CORS：明確允許存取

**CORS 是伺服器明確聲明「允許來自此源的請求」的機制**。

伺服器只需返回以下回應標頭，瀏覽器就會放寬限制。

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
```

**除非伺服器表示「允許」，否則瀏覽器不會將請求結果傳回 JavaScript**。這樣既能實現跨源存取，又能保持安全性。

## CORS 的安全風險：常見的設定錯誤

雖然 CORS 很便利，但設定不當會造成安全漏洞。

### 錯誤：允許所有源

```http
Access-Control-Allow-Origin: *
```

這表示「世界上任何人都可以存取此伺服器」。

```javascript
// https://evil.com 的 JavaScript
fetch('https://api.example.com/user/profile')
  .then(r => r.json())
  .then(data => {
    // 竊取使用者個人資料的處理
    console.log(data);
  });
```

對於包含認證憑證（如 Cookie）的請求特別危險，使用者在登入 `api.example.com` 後訪問 `evil.com` 時，個人資訊可能被盜取。

### 半危險：包含 Cookie 時禁止使用 `*`

```javascript
fetch('https://api.example.com/user/profile', {
  credentials: 'include'  // 包含 Cookie
})
```

包含認證資訊時，不能使用 `Access-Control-Allow-Origin: *`。必須**明確指定特定的源**。

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

### 錯誤：直接允許使用者指定的 URL

```javascript
// 危險的實現範例（伺服器端）
const origin = request.headers.get('Origin');
response.headers.set('Access-Control-Allow-Origin', origin);  // 原樣返回！
```

這樣做會允許來自 `https://evil.com` 的請求，回應會帶有 `Access-Control-Allow-Origin: https://evil.com`，容易被濫用。

**正確做法是準備白名單，只允許列表中的源**。

```javascript
const allowedOrigins = [
  'https://www.example.com',
  'https://admin.example.com'
];

if (allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin);
}
```

### 錯誤：允許所有標頭

```http
Access-Control-Allow-Headers: *
```

這表示「接受任何標頭」，允許透過自訂標頭注入惡意資料的攻擊。

**只列出必要的標頭**。

```http
Access-Control-Allow-Headers: Content-Type, Authorization
```

## CORS 預檢請求：瀏覽器的事前確認

對於簡單請求以外的請求（GET、HEAD、POST），瀏覽器會自動發送 **OPTIONS 方法**的請求來確認「這樣可以嗎？」這被稱為預檢請求 (Preflight Request)。

```
1. JavaScript 嘗試發送 PUT 請求

2. 瀏覽器自動發送 OPTIONS 預檢請求
    OPTIONS /api/resource HTTP/1.1
    Origin: https://www.example.com
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: Content-Type

3. 伺服器回應「OK」
    HTTP 200 OK
    Access-Control-Allow-Origin: https://www.example.com
    Access-Control-Allow-Methods: PUT
    Access-Control-Allow-Headers: Content-Type

4. 瀏覽器發送實際的 PUT 請求
```

如果伺服器不支援 `OPTIONS` 方法，預檢就會失敗，實際請求也不會被發送。

**要點：**

- 在白名單中明確指定允許的源
- 使用 `credentials: true` 處理包含 Cookie 認證的請求
- 只允許必要的方法和標頭
- OPTIONS 預檢請求

## 常見疑問

### Q. 遇到 CORS 錯誤。可以允許所有源來解決嗎？

**A：** 不可以。可能會暫時有效，但在生產環境中允許 `*` 是安全風險。需要重新檢查伺服器端設定或重新設計 API。

### Q. 想在本地開發時存取不同連接埠的源。可以嗎？

**A：** 在本地開發環境中只停用 CORS 是可以的。

### Q. 從行動應用程式呼叫 API 時，CORS 有影響嗎？

**A：** CORS 是瀏覽器的安全功能，所以**對行動應用程式沒有影響**。取而代之，需要使用 API 金鑰或 OAuth 實作認證和授權。

## 總結

| 重點 | 說明 |
|---------|------|
| **CORS 的目的** | 在保持瀏覽器安全性的同時允許跨源存取 |
| **危險的設定** | 對需要認證的 API 使用 `Access-Control-Allow-Origin: *` |
| **正確的設定** | 在白名單中明確指定允許的源 |
| **包含 Cookie 時** | 必須指定 `Access-Control-Allow-Credentials: true` 和具體的源 |
| **預檢** | PUT/DELETE 等複雜請求需要瀏覽器用 OPTIONS 進行事前確認 |

CORS 不只是「導致錯誤的原因」，而是 Web 安全的重要機制。設定錯誤可能導致安全事故，因此需要謹慎處理。

## 參考資料

- [MDN Web Docs - CORS (Cross-Origin Resource Sharing)](https://developer.mozilla.org/zh-TW/docs/Web/HTTP/CORS)
- [同源政策 - MDN Web Docs](https://developer.mozilla.org/zh-TW/docs/Web/Security/Same-origin_policy)
