---
title: "GPT-5.4 / GPT-5.4 mini / GPT-5.4 nano / GPT-4o / GPT-4o mini 費用・效能比較"
authors: hikari
tags: [AI, OpenAI]
image: /img/ogp/2026-04-18-gpt-54-pricing-comparison.webp
draft: true
---

本文比較 OpenAI 目前可用的 API 模型——GPT-5.4、GPT-5.4 nano、GPT-5.4 mini、GPT-4o、GPT-4o mini 的費用、規格與效能，並整理各使用情境下的選擇建議。

{/**/}

> 單位：USD / 100 萬 Token（MTok）。資訊以 2026 年 4 月為準。

## 費用比較

| 模型 | 輸入 | 快取輸入 | 輸出 |
|------|-----:|---------:|-----:|
| **GPT-5.4** | $2.50 | $1.25 | $15.00 |
| **GPT-5.4 mini** | $0.75 | $0.075 | $4.50 |
| **GPT-5.4 nano** | $0.20 | $0.02 | $1.25 |
| **GPT-4o** | $2.50 | $1.25 | $10.00 |
| **GPT-4o mini** | $0.15 | $0.075 | $0.60 |

GPT-4o mini 的輸入與輸出費用均為最低，但知識截止日期為 2023 年 10 月，不適合需要最新資訊的任務。GPT-5.4 nano 的輸入費用與 GPT-4o mini 相近，同時具備 GPT-5.4 系列的品質及 2025 年 8 月為止的最新知識。GPT-5.4（旗艦）的輸入費用與 GPT-4o 相同，但輸出費用高達 $15.00/MTok，適合需要最高品質推理的場景。

使用區域處理端點時，GPT-5.4 系列將額外收取 **10% 加成費用**。

## 規格比較

| 模型 | Context | 最大輸出 | 圖片輸入 | 知識截止日期 |
|------|:-------:|:--------:|:--------:|:------------:|
| **GPT-5.4** | 400K | 128K | ○ | 2025 年 8 月 |
| **GPT-5.4 mini** | 400K | 128K | ○ | 2025 年 8 月 |
| **GPT-5.4 nano** | 400K | 128K | ○ | 2025 年 8 月 |
| **GPT-4o** | 128K | 16,384 | ○ | 2023 年 10 月 |
| **GPT-4o mini** | 128K | 16,384 | ○ | 2023 年 10 月 |

GPT-5.4 系列的 Context 視窗大幅擴展至 **400K Token**，最大輸出也支援 128K Token。GPT-4o / GPT-4o mini 則分別限制在 128K / 16K。

## 效能比較

### GPT-5.4

GPT-5.4 系列的旗艦模型。代表 OpenAI 當前世代的最高智能，在複雜推理、長文生成、進階程式開發等方面均大幅超越 GPT-5.4 mini。支援所有原生工具（電腦操作、MCP、網路搜尋等），並完整支援多模態輸入輸出。由於輸出費用高達 $15.00/MTok，建議限定在必須取得最高品質輸出的場景使用。

### GPT-5.4 mini

GPT-5.4 系列的中階模型，針對程式開發、電腦操作及子代理任務進行最佳化。效能穩定超越 GPT-5 mini，並以更快的速度實現接近旗艦 GPT-5.4 的通過率。與 GPT-5 mini 相比，速度提升確認達 **2 倍以上**，在程式開發工作流程中提供頂級的效能/延遲權衡。

### GPT-5.4 nano

GPT-5.4 系列中體積最小、費用最低的模型。針對速度與成本為首要考量的大量處理使用情境最佳化，例如分類、資料萃取、排序及程式開發子代理。不適合需要深度推理的複雜任務。

### GPT-4o

以通用旗艦模型之姿登場，兼具文字與圖片處理的高智能。目前已被 GPT-5.4 系列取代，定位為舊版模型。雖於 2026 年 2 月從 ChatGPT 退役，但 API 存取仍持續提供。

### GPT-4o mini

設計定位為「最適合微調的小型模型」。透過蒸餾大型模型（GPT-4o）的輸出，以低成本、低延遲實現同等效果。MMLU 分數為 **82.0%**。適合希望降低簡單任務推理成本的情境。

## 該選哪個模型？

- **大量處理・優先考量成本**：GPT-5.4 nano 或 GPT-4o mini。若需要最新知識則選 GPT-5.4 nano，若需要微調則選 GPT-4o mini。
- **程式開發・代理任務**：GPT-5.4 mini。速度與精確度的平衡最佳。
- **複雜推理・高品質輸出**：GPT-5.4。費用為輸入 $2.50、輸出 $15.00/MTok，雖然高成本，但可獲得當代最高品質的輸出。
- **與舊有系統相容**：GPT-4o。API 持續提供，可維持現有的系統整合。

## 性價比最佳選擇

從性價比角度特別值得關注的是 **GPT-5.4 nano** 和 **GPT-5.4 mini** 這兩個模型。

**GPT-5.4 nano** 的輸入費用與 GPT-4o mini 相近（$0.20 vs $0.15），但可使用 400K Context、2025 年 8 月為止的知識，以及網路搜尋、檔案搜尋、MCP 等所有原生工具。除知識截止日期外，幾乎在所有方面都優於 GPT-4o mini，因此只要不需要微調，遷移至 GPT-5.4 nano 是合理的選擇。

**GPT-5.4 mini** 的輸入費用（$0.75）低於 GPT-4o（$2.50/MTok），且在程式開發與代理工作流程中的效能超越 GPT-4o。若日常使用 GPT-4o，切換至 GPT-5.4 mini 很可能同時實現降低成本與提升效能的目標。

另一方面，**GPT-4o** 目前的性價比偏低。輸入費用與 GPT-5.4 相同（$2.50/MTok），在 Context 大小、知識新鮮度及工具支援方面卻全面落後於 GPT-5.4 系列。除非需要微調或與現有系統相容，否則主動選擇 GPT-4o 的理由並不充分。

## 參考資料

- [OpenAI API 費用](https://developers.openai.com/api/docs/pricing)
- [GPT-5.4 mini 模型詳細說明](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.4 nano 模型詳細說明](https://developers.openai.com/api/docs/models/gpt-5.4-nano)
- [GPT-5.4 mini 與 nano 介紹 – OpenAI](https://openai.com/index/introducing-gpt-5-4-mini-and-nano/)
- [GPT-5.4 模型詳細說明](https://developers.openai.com/api/docs/models/gpt-5.4)
- [GPT-4o mini 模型詳細說明](https://developers.openai.com/api/docs/models/gpt-4o-mini)
