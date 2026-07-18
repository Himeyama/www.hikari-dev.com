---
title: mitmproxy で AI コーディングツールの通信を見てみる
authors: hikari
tags: [AI, API]
image: /img/ogp/2026-04-05-ai-agent-mitmproxy.webp
---

mitmproxy を中間プロキシとして設定することで、AI コーディングツールが裏側で行っている API 通信をリアルタイムで確認できる。

{/* truncate */}

## 仕組み

多くの AI コーディングツールは Node.js 製のアプリであり、HTTPS で外部 API と通信している。mitmproxy を中間プロキシとして挟み、Node.js に mitmproxy の CA 証明書を信頼させることで、暗号化された通信を復号してリアルタイムで確認できる。

## インストール

mitmproxy は `uv` でインストールするのが手軽である。

```ps1
uv tool install mitmproxy
```

## プロキシの設定

ツールを起動する前に、以下の環境変数を設定する。

```ps1
$env:HTTPS_PROXY = "http://127.0.0.1:8080"
$env:HTTP_PROXY  = "http://127.0.0.1:8080"
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.pem"
```

### NODE_EXTRA_CA_CERTS について

`HTTPS_PROXY` と `HTTP_PROXY` だけでは Node.js の TLS 検証が失敗し、通信できない。mitmproxy は HTTPS を中継するときに自己署名証明書を使うため、Node.js がその証明書を拒否してしまう。

`NODE_EXTRA_CA_CERTS` に mitmproxy の CA 証明書のパスを指定することで、Node.js がその証明書を信頼するようになり、通信が成立する。

### CA 証明書の生成

mitmproxy は初回起動時に自動的に CA 証明書を生成し、`~\.mitmproxy\` に保存する。まだ生成していない場合は一度起動すれば生成される。

```ps1
mitmweb
```

ブラウザが自動的に開き、`http://127.0.0.1:8081` にプロキシの管理画面が表示される。

## ツールの起動

別のターミナルで環境変数を設定した状態でツールを起動する。

ツールを操作し始めると、mitmweb の画面にリクエストが流れてくる。

## キャプチャした通信の中身

### エンドポイント

ツールは以下のエンドポイントにリクエストを送信する。

```
POST https://api.example.com/v1/messages
```

### リクエストヘッダー

```http
x-service-version: ...
content-type: application/json
x-api-key: sk-...
```

### リクエストボディ

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

`stream: true` で Server-Sent Events (SSE) 形式のストリーミングレスポンスを受け取る。

### レスポンス

```
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
...
data: {"type":"message_stop"}
```

## わかること

| 項目 | 内容 |
|------|------|
| API エンドポイント | `api.example.com/v1/messages` |
| 認証方式 | API キー (`x-api-key` ヘッダー) |
| ストリーミング | SSE 形式 |
| ツール定義 | 毎回リクエストに含まれる |
| システムプロンプト | 数千〜数万トークン規模 |

システムプロンプトの中には AI コーディングツールの動作原則、利用可能なツールの説明、注意事項などが含まれている。

## まとめ

- `NODE_EXTRA_CA_CERTS` で mitmproxy の CA 証明書を Node.js に信頼させることがポイント
- API 通信は SSE ストリーミング形式で行われる
- ツール定義やシステムプロンプトなど、AI コーディングツールの内部構造を把握できる
