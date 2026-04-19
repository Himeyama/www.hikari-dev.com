---
title: Anthropic API と AWS Bedrock の料金比較してみた
authors: hikari
tags: [AI, AWS, Claude]
image: /img/ogp/2026-03-30-anthropic-api-vs-bedrock-price.png
---

Claude を API 経由で使う場合、Anthropic API 直接のほかに **AWS Bedrock**、**Google Vertex AI**、**Microsoft Azure (Azure AI Foundry)** 経由でも利用できる。基本料金はどの経路もほぼ同額だが、バッチ処理やクラウドエコシステムとの統合面で差がある。

{/* truncate */}

> 単位: USD / 1M トークン (MTok) 。2026 年 3 月時点の情報。

## 基本料金 (オンデマンド)

| モデル | 項目 | Anthropic API | Bedrock | Vertex AI | Azure |
|--------|------|:---:|:---:|:---:|:---:|
| **Claude Opus 4.6** | 入力 | $5.00 | $5.00 | $5.00 | $5.00 |
| | 出力 | $25.00 | $25.00 | $25.00 | $25.00 |
| **Claude Sonnet 4.6** | 入力 | $3.00 | $3.00 | $3.00 | $3.00 |
| | 出力 | $15.00 | $15.00 | $15.00 | $15.00 |
| **Claude Haiku 4.5** | 入力 | $1.00 | $1.00 | $1.00 | $1.00 |
| | 出力 | $5.00 | $5.00 | $5.00 | $5.00 |
| **Claude Sonnet 4.5** | 入力 | $3.00 | $3.00 | $3.00 | $3.00 |
| | 出力 | $15.00 | $15.00 | $15.00 | $15.00 |

**基本料金はどの経路でも同額。**

ただし Vertex AI ではグローバルエンドポイントではなくリージョナルエンドポイントを指定した場合、標準価格に **10% 上乗せ** される。Bedrock には Long Context バリアント (別 SKU) が存在するが同価格。Anthropic API では Long Context は通常モデルに統合済み。

## キャッシュ料金

プロンプトキャッシュ (Prompt Caching) の料金もどの経路でも同額。

| モデル | キャッシュ種別 | Anthropic API | Bedrock | Vertex AI | Azure |
|:--------:|:-------------:|:---:|:---:|:--:|:--:|
| **Claude Opus 4.6** | 5分キャッシュライト | $6.25 | $6.25 | $6.25 | $6.25 |
| | 1時間キャッシュライト | $10.00 | $10.00 | $10.00 | $10.00 |
| | キャッシュリード | $0.50 | $0.50 | $0.50 | $0.50 |
| **Claude Sonnet 4.6** | 5分キャッシュライト | $3.75 | $3.75 | $3.75 | $3.75 |
| | 1時間キャッシュライト | $6.00 | $6.00 | $6.00 | $6.00 |
| | キャッシュリード | $0.30 | $0.30 | $0.30 | $0.30 |
| **Claude Haiku 4.5** | 5分キャッシュライト | $1.25 | $1.25 | $1.25 | $1.25 |
| | 1時間キャッシュライト | $2.00 | $2.00 | $2.00 | $2.00 |
| | キャッシュリード | $0.10 | $0.10 | $0.10 | $0.10 |

キャッシュライトは TTL に応じて 5 分 (短期) と 1 時間 (長期) の 2 段階がある。長期キャッシュほど書き込みコストが高いが、繰り返し参照するシステムプロンプトが長い場合はリード料金の節約で十分ペイする。

## バッチ処理料金

Bedrock・Vertex AI・Anthropic API いずれも非同期バッチ API がオンデマンド料金の **50% OFF** で利用できる。Azure は現時点では非明示。

| モデル | バッチ入力 | バッチ出力 |
|--------|:---:|:---:|
| **Claude Opus 4.6** | $2.50 | $12.50 |
| **Claude Sonnet 4.6** | $1.50 | $7.50 |
| **Claude Haiku 4.5** | $0.50 | $2.50 |
| **Claude Sonnet 4.5** | $1.50 | $7.50 |

大量データの一括処理 (ログ解析、埋め込み生成など) でバッチを多用するなら、いずれの経路でもコストを半減できる。

## エコシステム比較

| 比較ポイント | Anthropic API | Bedrock | Vertex AI | Azure |
|------------|:---:|:---:|:---:|:---:|
| 基本料金 | 同額 | 同額 | 同額 | 同額 |
| リージョン課金 | — | — | +10% (リージョナル) | — |
| バッチ処理 (50% OFF) | ○ | ○ | ○ | 非明示 |
| 東京リージョン | — | ○ | ○ | — |
| IAM / 監査ログ統合 | — | AWS | Google Cloud | Azure |
| VPC / PrivateLink | — | ○ | ○ | ○ |
| 請求統合 | Anthropic 直接 | AWS | Google Cloud | Azure |
| 新機能の展開速度 | 最速 | 遅延あり | 遅延あり | 遅延あり |

新機能 (Extended Thinking など) は Anthropic API に最初に展開され、Vertex AI・Bedrock・Azure への展開は数週間遅れることがある。

## どれを選ぶか

- **シンプルな利用・プロトタイプ**: Anthropic API が API キー 1 本で始められ、新機能も最速で使える。
- **AWS に統合済み**: IAM・CloudWatch・VPC が必要なら Bedrock 一択。東京リージョン対応。
- **Google Cloud に統合済み**: Vertex AI が自然な選択。リージョナルエンドポイントは 10% 割高になる点に注意。
- **Azure に統合済み**: Azure AI Foundry 経由で利用可能。Azure の課金・管理に統合できる。
- **バッチ多用でコスト削減**: Bedrock・Vertex AI・Anthropic API いずれも 50% OFF のバッチ API が使える。

## 参考

- [Anthropic API 料金 – Claude API Docs](https://www.anthropic.com/pricing#anthropic-api)
- [AWS Bedrock 料金 – Amazon Web Services](https://aws.amazon.com/jp/bedrock/pricing/)
- [Vertex AI 料金 – Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Claude in Microsoft Azure AI Foundry – Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry)
