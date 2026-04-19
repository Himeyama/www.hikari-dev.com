---
title: AWS S3 から Cloudflare Pages へ移行しました
authors: [hikari]
tags: [AWS, Cloudflare, Docusaurus, CI/CD]
image: /img/ogp/2026-04-19-migrate-to-cloudflare-pages.png
---

このブログを AWS S3 から Cloudflare Pages へ移行した。これまでは S3 で静的ホスティングを行い、CloudFront を通じて配信していたが、管理の簡素化とパフォーマンス向上のために Cloudflare Pages を採用することにした。

{/* truncate */}

## なぜ Cloudflare Pages か

これまで S3 + CloudFront + Route53 という AWS 標準の構成で運用してきたが、以下の理由から Cloudflare Pages への移行を決めた。

1. **管理コストの低さ**: SSL 証明書の自動更新、グローバルエッジへのデプロイが標準で組み込まれている。
2. **無料枠の広さ**: 個人ブログ程度のトラフィックであれば、ほとんどの機能を無料枠で利用できる。
3. **デプロイの柔軟性**: GitHub 連携だけでなく、GitHub Actions からの Direct Upload にも対応しており、複雑なビルドフローも維持できる。

## 移行の手順

### 1. GitHub Actions のワークフロー作成

既存の S3 デプロイ用のワークフローを Cloudflare Pages 用に書き換えた。今回は `cloudflare/pages-action` を使用している。

### 2. Cloudflare Pages プロジェクトの作成

Cloudflare のダッシュボード、または CLI (Wrangler) からプロジェクトを作成する。今回は確実にブランチを指定して作成するため、Wrangler を使用した。

### 3. DNS の切り替え

S3 を向いていた `www.hikari-dev.com` の DNS レコードを Cloudflare Pages のエンドポイント（`xxx.pages.dev`）に向けるよう更新した。

Cloudflare Pages 側でカスタムドメインを追加すると、自動的に検証が走り、SSL 証明書が発行される。この際、古いレコードが残っていると検証に失敗することがあるため、一度ドメイン設定を削除して再登録することでスムーズに反映された。

## 移行後の所感

移行自体は非常にスムーズで、デプロイ速度も S3 へのアップロードと遜色ない。何より、AWS 側で管理していた複数のリソース（S3 バケット、CloudFront ディストリビューション、ACM 証明書）を Cloudflare Pages という一つのプロジェクトに集約できたのが大きなメリットだと感じている。

今後は Cloudflare Workers などを活用した動的な機能追加も検討していきたい。
