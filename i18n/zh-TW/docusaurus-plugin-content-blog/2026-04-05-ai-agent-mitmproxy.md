---
title: 使用 mitmproxy 查看 AI 程式碼工具的網路通訊
authors: hikari
tags: [AI, API]
---

透過將 mitmproxy 設定為中間人代理，可以即時查看 AI 程式碼工具在背後進行的 API 通訊內容。

{/**/}

## 運作原理

許多 AI 程式碼工具是以 Node.js 開發的應用程式，透過 HTTPS 與外部 API 進行通訊。將 mitmproxy 作為中間人代理插入，並讓 Node.js 信任 mitmproxy 的 CA 憑證，即可解密加密的通訊內容並即時查看。

## 安裝

使用 `uv` 安裝 mitmproxy 最為方便。

```ps1
uv tool install mitmproxy
```

## 代理設定

在啟動工具之前，先設定以下環境變數。

```ps1
$env:HTTPS_PROXY = "http://127.0.0.1:8080"
$env:HTTP_PROXY  = "http://127.0.0.1:8080"
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.pem"
```

### 關於 NODE_EXTRA_CA_CERTS

只設定 `HTTPS_PROXY` 和 `HTTP_PROXY` 會導致 Node.js 的 TLS 驗證失敗而無法通訊。mitmproxy 在中繼 HTTPS 時使用自簽憑證，而 Node.js 預設會拒絕該憑證。

在 `NODE_EXTRA_CA_CERTS` 中指定 mitmproxy CA 憑證的路徑後，Node.js 便會信任該憑證，通訊也就能順利建立。

### 產生 CA 憑證

mitmproxy 在首次啟動時會自動產生 CA 憑證，並儲存至 `~\.mitmproxy\`。若尚未產生，啟動一次即可。

```ps1
mitmweb
```

瀏覽器會自動開啟，在 `http://127.0.0.1:8081` 顯示代理管理介面。

## 啟動工具

在另一個已設定環境變數的終端機中啟動工具。

開始操作工具後，mitmweb 畫面上就會出現請求流量。

## 擷取到的通訊內容

### 端點

工具會向以下端點發送請求。

```
POST https://api.example.com/v1/messages
```

### 請求標頭

```http
x-service-version: ...
content-type: application/json
x-api-key: sk-...
```

### 請求本文

```json
{
  "model": "model-name",
  "max_tokens": 16000,
  "stream": true,
  "system": [
    {
      "type": "text",
      "text": "..."
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "..."
    }
  ],
  "tools": [
    {
      "name": "Read",
      "description": "...",
      "input_schema": {}
    }
  ]
}
```

設定 `stream: true` 後，會以 Server-Sent Events (SSE) 格式接收串流回應。

### 回應

```
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
...
data: {"type":"message_stop"}
```

## 可以了解到的資訊

| 項目 | 內容 |
|------|------|
| API 端點 | `api.example.com/v1/messages` |
| 認證方式 | API 金鑰 (`x-api-key` 標頭) |
| 串流方式 | SSE 格式 |
| 工具定義 | 每次請求都包含 |
| 系統提示詞 | 數千至數萬 token 規模 |

系統提示詞中包含 AI 程式碼工具的運作原則、可用工具的說明及注意事項等內容。

## 總結

- 關鍵在於透過 `NODE_EXTRA_CA_CERTS` 讓 Node.js 信任 mitmproxy 的 CA 憑證
- API 通訊採用 SSE 串流格式
- 可以查看工具定義和系統提示詞等 AI 程式碼工具的內部結構
