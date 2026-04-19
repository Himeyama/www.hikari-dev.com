---
title: 比較 Anthropic API 與 AWS Bedrock 的費用
authors: hikari
tags: [AI, AWS, Claude]
image: /img/ogp/2026-03-30-anthropic-api-vs-bedrock-price.png
---

Claude 若要透過 API 使用，除了直接使用 Anthropic API 外，也能經由 **AWS Bedrock**、**Google Vertex AI**、**Microsoft Azure (Azure AI Foundry)** 使用。基本價格各路徑幾乎相同，但在批次處理與與雲端生態系統整合面會有差異。

{/**/}

> 單位：USD / 1M 代幣 (MTok)。資料截至 2026 年 3 月。

## 基本價格（按需）

| 模型 | 項目 | Anthropic API | Bedrock | Vertex AI | Azure |
|--------|------|:---:|:---:|:---:|:---:|
| **Claude Opus 4.6** | 輸入 | $5.00 | $5.00 | $5.00 | $5.00 |
| | 輸出 | $25.00 | $25.00 | $25.00 | $25.00 |
| **Claude Sonnet 4.6** | 輸入 | $3.00 | $3.00 | $3.00 | $3.00 |
| | 輸出 | $15.00 | $15.00 | $15.00 | $15.00 |
| **Claude Haiku 4.5** | 輸入 | $1.00 | $1.00 | $1.00 | $1.00 |
| | 輸出 | $5.00 | $5.00 | $5.00 | $5.00 |
| **Claude Sonnet 4.5** | 輸入 | $3.00 | $3.00 | $3.00 | $3.00 |
| | 輸出 | $15.00 | $15.00 | $15.00 | $15.00 |

**基本價格在各路徑相同。**

不過在 Vertex AI 若不是使用全球端點而指定區域端點（regional endpoint），標準價格會額外加收 **10%**。Bedrock 有 Long Context 變體（另有 SKU），但價格相同。Anthropic API 則已將 Long Context 整合在一般模型中。

## 快取費用

Prompt 快取（Prompt Caching）的費用在各路徑也相同。

| 模型 | 快取類型 | Anthropic API | Bedrock | Vertex AI | Azure |
|:--------:|:-------------:|:---:|:---:|:--:|:--:|
| **Claude Opus 4.6** | 5 分快取寫入 | $6.25 | $6.25 | $6.25 | $6.25 |
| | 1 小時快取寫入 | $10.00 | $10.00 | $10.00 | $10.00 |
| | 快取讀取 | $0.50 | $0.50 | $0.50 | $0.50 |
| **Claude Sonnet 4.6** | 5 分快取寫入 | $3.75 | $3.75 | $3.75 | $3.75 |
| | 1 小時快取寫入 | $6.00 | $6.00 | $6.00 | $6.00 |
| | 快取讀取 | $0.30 | $0.30 | $0.30 | $0.30 |
| **Claude Haiku 4.5** | 5 分快取寫入 | $1.25 | $1.25 | $1.25 | $1.25 |
| | 1 小時快取寫入 | $2.00 | $2.00 | $2.00 | $2.00 |
| | 快取讀取 | $0.10 | $0.10 | $0.10 | $0.10 |

快取寫入依 TTL 分為 5 分（短期）和 1 小時（長期）兩種。長期快取的寫入成本較高，但如果系統提示（system prompt）很長且會被重複參考，透過節省讀取費用通常是划得來的。

## 批次處理費用

Bedrock、Vertex AI、Anthropic API 三者的非同步批次 API 可享按需價格的 **50% 折扣**。Azure 目前未明示。

| 模型 | 批次輸入 | 批次輸出 |
|--------|:---:|:---:|
| **Claude Opus 4.6** | $2.50 | $12.50 |
| **Claude Sonnet 4.6** | $1.50 | $7.50 |
| **Claude Haiku 4.5** | $0.50 | $2.50 |
| **Claude Sonnet 4.5** | $1.50 | $7.50 |

若要大量處理資料（例如日誌分析、向量嵌入生成等）並頻繁使用批次處理，無論走哪個路徑都能把成本砍半。

## 生態系比較

| 比較重點 | Anthropic API | Bedrock | Vertex AI | Azure |
|------------|:---:|:---:|:---:|:---:|
| 基本價格 | 相同 | 相同 | 相同 | 相同 |
| 區域加價 | — | — | +10%（區域端點） | — |
| 批次處理（50% OFF） | ○ | ○ | ○ | 未明示 |
| 東京區域 | — | ○ | ○ | — |
| IAM / 審計日誌整合 | — | AWS | Google Cloud | Azure |
| VPC / PrivateLink | — | ○ | ○ | ○ |
| 計費整合 | Anthropic 直接 | AWS | Google Cloud | Azure |
| 新功能推出速度 | 最快 | 會延遲 | 會延遲 | 會延遲 |

新功能（例如 Extended Thinking）通常會先在 Anthropic API 上推出，向 Vertex AI、Bedrock、Azure 的推展有時會晚幾週。

## 如何選擇

- 單純使用／原型開發：Anthropic API，只要一組 API 金鑰即可啟動，新功能也能最先使用。
- 已整合到 AWS：若需 IAM、CloudWatch、VPC，選 Bedrock。支援東京區域。
- 已整合到 Google Cloud：Vertex AI 是自然的選擇，但注意區域端點會加收 10%。
- 已整合到 Azure：可透過 Azure AI Foundry 使用，能整合到 Azure 的計費與管理。
- 大量使用批次以節省成本：Bedrock、Vertex AI、Anthropic API 都有 50% OFF 的批次 API 可用。

## 參考

- [Anthropic API 料金 – Claude API Docs](https://www.anthropic.com/pricing#anthropic-api)
- [AWS Bedrock 料金 – Amazon Web Services](https://aws.amazon.com/jp/bedrock/pricing/)
- [Vertex AI 料金 – Google Cloud](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Claude in Microsoft Azure AI Foundry – Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry)