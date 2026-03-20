---
title: AWS サーバーレスでブログのコメント API を自作した
authors: hikari
---

このブログにコメント機能を追加したくなり、AWS サーバーレスで API を自作しました。その設計と実装について紹介します。

## 構成

リクエストは以下の流れで処理されます。

```
ブラウザ (www.hikari-dev.com)
  ↓ HTTPS
API Gateway
  ├── GET  /comment?postId=...    → コメント取得
  ├── POST /comment               → コメント投稿
  └── PATCH /comment/{id}         → 管理（非表示切り替え）
  ↓
Lambda (Node.js 20 / arm64)
  ↓
DynamoDB（コメント保存）
  + SES v2（管理者へのメール通知）
```

コードは TypeScript で書き、SAM（Serverless Application Model）で IaC 管理しています。Lambda は arm64（Graviton2）にして少しコストを抑えています。

## DynamoDB のテーブル設計

テーブル名は `blog-comments`、パーティションキーは `postId`、ソートキーは `commentId` です。

| キー | 型 | 説明 |
|------|----|------|
| `postId` | String | 記事の識別子（例: `/blog/2026/03/20/hime`） |
| `commentId` | String | ULID（時系列ソート可能な ID） |

ソートキーに ULID を使っているので、`QueryCommand` で取得したコメントは投稿順に自動的に並びます。UUID にしなかったのはこの理由です。

## スパムフィルタリング

コメントを DynamoDB に書き込む前に、`keywords.json` に定義したキーワードと照合します。

キーワードにヒットした場合は `isHidden: true` で自動非表示にし、`isFlagged: "1"` を付与します。ヒットしなければ即時公開です。

`isFlagged` は Sparse GSI のキーとして使っています。ヒットしないコメントにはこの属性を持たせないため、GSI に余計なパーティションが増えず、コストと効率の両面で有利です。DynamoDB Document Client の `removeUndefinedValues: true` を設定するだけで実現できます。

## 管理者へのメール通知

コメントが投稿されるたびに SES v2 で自分宛にメールが届きます。本文には投稿者名、本文、評価、IP アドレス、フラグ状態が含まれます。

メール送信は非同期で行い、失敗しても握りつぶします。コメント投稿のレスポンス速度に影響しないようにするためです。

## プライバシーへの配慮

DynamoDB には IP アドレスや User-Agent も保存しますが、GET エンドポイントのレスポンスには含めません。型定義レベルで分離しています。

## セキュリティ

| 層 | 対策 |
|----|------|
| ネットワーク | AWS WAF で 100 req / 5 分 / IP のレート制限 |
| CORS | `https://www.hikari-dev.com` のみ許可 |
| 管理 API | API Gateway の API キー認証（`X-Api-Key` ヘッダー） |
| スパム | キーワードフィルタで自動非表示 |

管理エンドポイント（`PATCH /comment/{id}`）は SAM テンプレートで `ApiKeyRequired: true` を設定するだけで API キー認証が有効になります。Lambda Authorizer を自前で実装する必要がなく、シンプルです。

## まとめ

既製品を使わず自作した主な理由は、データを自分でコントロールしたかったからです。サーバーレス構成なのでサーバー管理も不要で、DynamoDB のオンデマンド課金により低トラフィックな個人ブログでもコストを最小限に抑えられています。

コードは SAM + TypeScript + esbuild でまとめており、`sam build && sam deploy` だけでデプロイできます。
