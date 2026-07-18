---
title: CORS とは何か - セキュリティの観点から初心者向けに解説
authors: hikari
tags: [Web, セキュリティ]
image: /img/ogp/2026-04-02-cors-security.webp
---

Web ブラウザーのセキュリティ機能である **CORS (Cross-Origin Resource Sharing)** について、「なぜ必要なのか」「何が危険なのか」を初心者向けに解説する。正しく理解することで、セキュアな Web 開発が可能になる。

{/* truncate */}

## CORS が必要になった背景: 同一オリジンポリシー

1990 年代初頭、JavaScript がブラウザーに搭載されたとき、Web セキュリティの概念はほぼ存在しなかった。当時、悪意のある Web サイトが他のサイトのデータに自由にアクセスできたため、セッション乗っ取りやデータ窃盗が容易だった。

この問題を解決するため、**同一オリジンポリシー (Same-Origin Policy)** という制限が導入された。これは「Web ページから読み込んだ JavaScript は、そのページと異なるオリジンのデータにアクセスできない」というシンプルかつ強力なルールである。

例えば、`https://www.example.com` のページから読み込んだ JavaScript は、`https://www.bank.com` のデータにアクセスできない。これにより、ユーザーが銀行サイトにログイン中に悪意のあるサイトにアクセスしても、銀行の情報が盗まれることはなくなった。

### 同一オリジンとは

**オリジン (Origin)** とは、以下の 3 つで決まる。

- **プロトコル**: `http://` か `https://` か
- **ホスト (ドメイン)**: `example.com` か `api.example.com` か
- **ポート**: `80` か `8080` か

例えば、

| URL | プロトコル | ホスト | ポート | オリジン |
|-----|----------|--------|--------|----------|
| `https://www.example.com/page` | HTTPS | www.example.com | 443 (デフォルト) | `https://www.example.com` |
| `https://api.example.com/data` | HTTPS | api.example.com | 443 (デフォルト) | `https://api.example.com` |

これらは異なるホストなので、**異なるオリジン** と見なされる。

### 同一オリジンポリシーが防ぐもの

JavaScript からの **XHR (XMLHttpRequest)** や **Fetch API** で、異なるオリジンへのリクエストが制限される。

例: evil.com にある悪意のあるスクリプト
```javascript
fetch('https://bank.example.com/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ amount: 1000000 })
});
```

同一オリジンポリシーがなければ、悪意あるサイト (`evil.com`) の JavaScript から、ユーザーが銀行サイトにログインしている状態で送金リクエストを送られてしまう。**これを防ぐのが同一オリジンポリシーの目的である**。

## なぜ CORS が必要か

しかし現代の Web では、複数のオリジンが協力する設計が一般的。

- **フロントエンド**: `https://www.example.com`
- **API サーバー**: `https://api.example.com`
- **CDN / 静的ファイル**: `https://cdn.example.com`

これらは**同じ企業が運営しており、正当な通信**である。しかし同一オリジンポリシーで制限されては、アプリが動かない。

そこで CORS (Cross-Origin Resource Sharing) が登場した。

## CORS とは：明示的にアクセスを許可する

**CORS は、サーバー側が「このオリジンからのリクエストは許可する」と明示的に宣言する仕組み**である。

サーバーが以下のレスポンス ヘッダーを返すだけで、ブラウザーが制限を緩和する。

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
```

**サーバーが「許可」と言わない限り、ブラウザーはリクエストの結果を JavaScript に渡さない**。これで安全性を保ちながら、クロスオリジンアクセスを実現する。

## CORS のセキュリティリスク：よくある設定ミス

便利な CORS だが、設定を間違えるとセキュリティホールになる。

### NG: すべてのオリジンを許可する

```http
Access-Control-Allow-Origin: *
```

これは「世界中誰からでも、このサーバーにアクセス OK」という意味。

```javascript
// https://evil.com の JavaScript から
fetch('https://api.example.com/user/profile')
  .then(r => r.json())
  .then(data => {
    // ユーザーのプロフィール情報を盗む処理
    console.log(data);
  });
```

認証情報 (Cookie) を含むリクエストでは特に危険であり、ユーザーが `api.example.com` にログイン状態で `evil.com` にアクセスすると、個人情報が盗まれる。

### 半分だけ危険：Cookie を含む場合は `*` 禁止

```javascript
fetch('https://api.example.com/user/profile', {
  credentials: 'include'  // Cookie を含める
})
```

認証情報を含む場合、`Access-Control-Allow-Origin: *` は使用できない。必ず**具体的なオリジンを指定**する必要がある。

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

### NG: ユーザーが指定した URL をそのまま許可する

```javascript
// 危険な実装例 (サーバー側)
const origin = request.headers.get('Origin');
response.headers.set('Access-Control-Allow-Origin', origin);  // そのまま返す!
```

こうすると、`https://evil.com` からのリクエストでも、レスポンスに `Access-Control-Allow-Origin: https://evil.com` が付いて、悪用される。

**ホワイトリストを用意して、そこにあるものだけ許可する**のが正解である。

```javascript
const allowedOrigins = [
  'https://www.example.com',
  'https://admin.example.com'
];

if (allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin);
}
```

### NG: すべてのヘッダーを許可する

```http
Access-Control-Allow-Headers: *
```

これは「どんなヘッダーでも受け付ける」という意味であり、カスタム ヘッダーで不正なデータを注入する攻撃が可能となる。

**必要なヘッダーだけリストアップ**する。

```http
Access-Control-Allow-Headers: Content-Type, Authorization
```

## CORS プリフライト リクエスト：ブラウザーの事前確認

単純なリクエスト (GET、HEAD、POST) 以外は、ブラウザーが事前に **OPTIONS メソッド** で「これで大丈夫？」と確認する。これをプリフライト リクエストという。

```
1. JavaScript が PUT リクエストを送ろうとする

2. ブラウザーが OPTIONS プリフライト リクエストを自動送信
    OPTIONS /api/resource HTTP/1.1
    Origin: https://www.example.com
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: Content-Type

3. サーバーが「OK」と応答
    HTTP 200 OK
    Access-Control-Allow-Origin: https://www.example.com
    Access-Control-Allow-Methods: PUT
    Access-Control-Allow-Headers: Content-Type

4. ブラウザーが実際の PUT リクエストを送信
```

サーバー側で `OPTIONS` メソッドに対応していないと、プリフライトで失敗して、実際のリクエストが送信されない。

**ポイント:**

- ホワイトリストで許可するオリジンを明示的に指定
- `credentials: true` で Cookie 認証を含むリクエストに対応
- 必要なメソッドとヘッダーのみ許可
- OPTIONS プリフライト リクエスト

## よくある疑問

### Q. CORS エラーが出た。すべてのオリジンを許可して解決できるか?

**A:** NG。一時的には動くかもしれないが、本番環境で `*` 許可するのはセキュリティリスクである。サーバー側設定を見直すか、API の設計を変更する必要がある。

### Q. ローカル開発中、異なるポートのオリジンにアクセスしたいのか?

**A:** ローカル開発環境だけ CORS を無効化するのは問題ない。

### Q. モバイルアプリから API を呼ぶ場合、CORS は関係あるか?

**A:** CORS はブラウザーのセキュリティ機能なので、**モバイルアプリには関係ない**。代わりに、API キーや OAuth で認証・認可を実装する必要がある。

## まとめ

| ポイント | 説明 |
|---------|------|
| **CORS の目的** | ブラウザーのセキュリティを保ちながら、クロスオリジンアクセスを許可する |
| **危険な設定** | `Access-Control-Allow-Origin: *` を認証が必要な API に使う |
| **正しい設定** | ホワイトリストで許可するオリジンを明示的に指定 |
| **Cookie 含む場合** | `Access-Control-Allow-Credentials: true` と具体的なオリジン指定が必須 |
| **プリフライト** | PUT/DELETE など複雑なリクエストはブラウザーが OPTIONS で事前確認 |

CORS は単なる「エラーの原因」ではなく、Web セキュリティの重要な仕組みである。
設定を間違えると、セキュリティ事故につながるため、慎重に取り扱う必要がある。

## 参考

- [MDN Web Docs - CORS (Cross-Origin Resource Sharing)](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)
- [Same-origin policy - MDN Web Docs](https://developer.mozilla.org/ja/docs/Web/Security/Same-origin_policy)
