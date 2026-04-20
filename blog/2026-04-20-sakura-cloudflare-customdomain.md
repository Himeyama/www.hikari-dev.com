---
title: Cloudflare Workers で独自ドメインをさくらサーバーのサブパスに割り当てた
authors: [hikari]
tags: [Cloudflare, さくらのレンタルサーバー]
image: /img/ogp/2026-04-20-sakura-cloudflare-customdomain.png
---

## 背景

さくらのレンタルサーバー「ライトプラン」は、36ヶ月一括払いで **月額121円** という破格の安さだ。(12ヶ月一括の場合は月165円)
静的ファイルのホスティングや **CGI** 用途としては十分で、個人用途のストレージとして気軽に使える。

ただし、割り当てられるドメインは `ユーザー名.sakura.ne.jp` のサブドメインになるため、
独自ドメインで特定のパスに紐づけたい場合は一工夫が必要になる。

## やりたいこと

`https://app.example.com` にアクセスすると、
`https://sakurauser.sakura.ne.jp/app/` のコンテンツが
**URL を変えずに** 表示されるようにする。

## なぜ単純な DNS 設定ではできないのか

DNS の CNAME レコードはホスト名しか指定できず、
`/app/` のような **パスを含む URL は指定できない**。

リダイレクト (301) でも実現できるが、
ブラウザのアドレスバーの URL が `sakurauser.sakura.ne.jp/flower/` に変わってしまう。

Cloudflare Workers を使った**透過プロキシ**なら、
URL を `app.example.com` のまま維持できる。

## 前提条件

- Cloudflare に独自ドメイン (例: `example.com`) を登録済みであること
- Cloudflare の無料プランで OK (10万リクエスト/日まで無料) 

## 手順

### 1. Worker を作成する

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create**
2. **Start with Hello World!** を選択
3. Worker 名を入力 (例: `storage-proxy`) 
4. **Deploy** をクリック

### 2. コードを編集する

Deploy 後、**Edit code** をクリックし、
以下のコードに**全て置き換える**。

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

## まとめ

- さくらのレンタルサーバー ライトプランは **月額121円** と格安で、静的ファイルの置き場として十分使える
- ただし独自ドメインをサブパスに割り当てる DNS 設定は標準機能では不可能
- **Cloudflare Workers** を透過プロキシとして挟むことで、URL を変えずにコンテンツを配信できる
- Workers のコードは数十行で済み、Cloudflare 無料プランの範囲内で動作する
