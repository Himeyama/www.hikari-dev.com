---
title: "Makefile のすすめ"
authors: hikari
tags: [Makefile, Linux]
draft: true
---

## Makefile 的推薦

## 背景與問題意識
在日常工作中使用 Python 腳本來自動化資料轉換時，常常會遇到以下這些問題：
- 明明只有原始資料的一部分更新了，卻要整體重新執行，浪費時間。
- 哪個步驟依賴哪個檔案不夠清楚，執行順序與有無遺漏都很難管理。
- 也很難掌握腳本變更會影響哪些產物。

Makefile 內建了「依賴關係」與「只重新執行差異部分（增量建置）」這兩項標準功能，能用很少的描述來解決這些問題。

## Make 的基本概念
- 目標（target）：產物（例：output/report.csv）
- 依賴關係：生成時所需的檔案（例：data/clean/*.csv 或腳本）
- 配方（recipe）：用來生成的命令（例：python scripts/aggregate.py ...）

Make 會在「依賴關係比目標更新」時才執行配方。如此一來，當原始資料或 Python 腳本更新時，只有必要的部分會自動重新執行。

## 最小構成的 Makefile 範例
以下是一個將 raw 資料清理後，接著產生彙總報告的流程，以差異執行方式處理的範例。

```makefile
# Makefile
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
.ONESHELL:
.DEFAULT_GOAL := all

RAW_DIR := data/raw
CLEAN_DIR := data/clean
OUT_DIR := output

RAW := $(wildcard $(RAW_DIR)/*.csv)
CLEAN := $(patsubst $(RAW_DIR)/%.csv,$(CLEAN_DIR)/%.csv,$(RAW))
REPORT := $(OUT_DIR)/report.csv

# 目錄採用順序限定依賴（若不存在則建立，但不作為更新判定依據）
$(CLEAN_DIR) $(OUT_DIR):
	mkdir -p $@

# 彙總報告依賴已清理的 CSV 與彙總腳本
$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR)
	python scripts/aggregate.py -i $(CLEAN_DIR) -o $@

# 從每個 raw CSV 生成對應的 clean CSV
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@

.PHONY: all clean status

all: $(REPORT)

clean:
	rm -rf $(CLEAN_DIR) $(OUT_DIR)

# 確認哪些內容會成為重建對象的輔助工具
status:
	@echo "RAW   : $(RAW)"
	@echo "CLEAN : $(CLEAN)"
	@echo "REPORT: $(REPORT)"
	@echo
	@echo "Dry-run (what would run):"
	@$(MAKE) -n all
```

透過這個架構，可以達成以下效果：
- 更新原始資料 `data/raw/foo.csv` 時，只會重新生成對應的 `data/clean/foo.csv`。
- 更新 `scripts/clean.py` 時，只會重新執行必要的清理流程。
- 更新 `scripts/aggregate.py` 時，只會重新生成彙總報告。

## 動作範例
```sh
# 初次執行（全部生成）
make -j

# 部分 raw 更新（只重新執行該檔案的清理與報告）
touch data/raw/a.csv
make -j

# 清理腳本更新（重新執行所有清理與報告）
touch scripts/clean.py
make -j

# 彙總腳本更新（只重新執行報告）
touch scripts/aggregate.py
make
```

若想事先確認「會執行哪些內容」，可使用 `make -n`。

## 腳本依賴的設計指引
- 每條規則都應明確將直接呼叫的 Python 腳本列為依賴關係，這點非常重要。
- 若拆成多個模組，最好把目標規則所 import 的模組也納入依賴，讓變更能正確傳遞。簡便做法是將目標目錄下的 Python 檔案全部變數化後加入依賴。

範例（簡便做法）:
```makefile
PY_SRCS := $(wildcard scripts/**/*.py) $(wildcard scripts/*.py)

$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv $(PY_SRCS) | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@
```

## 並行執行與加速
- 透過 `make -j` 可將彼此獨立的檔案轉換並行化。資料點越多，效果越明顯。
- 將中間產物切得越細，越容易發揮差異執行的效果，避免整體重算。
- 若 I/O 是瓶頸，可搭配壓縮格式、檔案分割、或本機 SSD 等方式使用。

## 實務上的技巧
- 目錄建立應以順序限定依賴（`| dir`）處理，以避免不必要的重建。
- 為了避免失敗時留下不完整的產物，建議啟用 `.DELETE_ON_ERROR`。
- 常用入口可用 `.DEFAULT_GOAL := all` 標準化，讓 `make` 一次就能執行。
- 除錯時可使用 `make -n`（只顯示不執行）、`make --trace`（顯示根據哪些判定而執行）、`make -d`（詳細記錄）。
- 清理動作請設為 `.PHONY: clean`，並注意只刪除生成物。

## 虛擬環境與依賴套件（選用）
Python 執行環境也可以由 Make 管理。

```makefile
VENV := .venv
PY := $(VENV)/bin/python

$(VENV)/bin/python: requirements.txt
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r requirements.txt
	touch $@

# 後續配方中使用 $(PY)
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR) $(VENV)/bin/python
	$(PY) scripts/clean.py -i $< -o $@

$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR) $(VENV)/bin/python
	$(PY) scripts/aggregate.py -i $(CLEAN_DIR) -o $@
```

更新 `requirements.txt` 時，只會在需要的範圍內重新完成環境設定。

## 總結
- Makefile 是一種能自動化「明確宣告依賴關係」與「只重新執行差異部分」的工具，能大幅提升資料轉換流程的可靠性與開發速度。
- 只要正確連結原始資料、腳本與產物，並把處理流程切分得更細，就能快速重算受到更新影響的範圍。
- 以最少的描述即可獲得可重現性、並行化與可觀測性，讓日常自動化工作更加順手。