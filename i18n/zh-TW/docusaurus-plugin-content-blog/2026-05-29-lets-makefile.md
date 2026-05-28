---
title: "Makefile のすすめ"
authors: hikari
tags: [Makefile, Linux]
draft: true
---

## Makefile 的推薦

## 背景與問題意識
在日常工作中，使用 Python 腳本進行資料轉換自動化時，常常會遇到以下問題：
- 明明只更新了原始資料的一部分，卻得整體重新執行，白白浪費時間。
- 哪個步驟依賴哪個檔案不夠清楚，難以管理執行順序與遺漏情況。
- 不容易掌握腳本修改會影響哪些產出物。

Makefile 具備「相依關係」與「只重跑差異部分（增量建置）」這些標準功能，能用很少的描述解決上述問題。

## Make 的基本概念
- 目標（target）：產出物（例：output/report.csv）
- 相依關係（dependency）：產出所需的檔案（例：data/clean/*.csv 或腳本）
- 配方（recipe）：用來產出的指令（例：python scripts/aggregate.py ...）

Make 會在「相依關係比目標更新」時才執行配方。如此一來，當原始資料或 Python 腳本更新時，只會自動重跑必要的部分。

## 最小構成的 Makefile 範例
以下是一個將 raw 資料清理後，再產生彙總報表的差異執行範例。

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

# 目錄為順序相依（不存在時建立，但不作為更新判定依據）
$(CLEAN_DIR) $(OUT_DIR):
	mkdir -p $@

# 彙總報表依賴已清理的 CSV 與彙總腳本
$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR)
	python scripts/aggregate.py -i $(CLEAN_DIR) -o $@

# 由各 raw CSV 產生對應的 clean CSV
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@

.PHONY: all clean status

all: $(REPORT)

clean:
	rm -rf $(CLEAN_DIR) $(OUT_DIR)

# 確認哪些項目會被重建的輔助指令
status:
	@echo "RAW   : $(RAW)"
	@echo "CLEAN : $(CLEAN)"
	@echo "REPORT: $(REPORT)"
	@echo
	@echo "Dry-run (what would run):"
	@$(MAKE) -n all
```

透過這個架構，可以達成以下效果：
- 更新原始資料 data/raw/foo.csv 時，只會重新產生對應的 data/clean/foo.csv。
- 更新 scripts/clean.py 時，只會在必要範圍內重新執行清理流程。
- 更新 scripts/aggregate.py 時，只會重新執行彙總報表。

## 動作示意
```sh
# 第一次執行（全部產生）
make -j

# 部分 raw 更新（只重新執行該檔案的清理與報表）
touch data/raw/a.csv
make -j

# 清理腳本更新（重新執行所有清理與報表）
touch scripts/clean.py
make -j

# 彙總腳本更新（只重新執行報表）
touch scripts/aggregate.py
make
```

想事先確認「會執行什麼」時，`make -n` 很有用。

## 腳本相依性的設計指引
- 每個規則都應明確將其直接呼叫的 Python 腳本列為相依關係，這很重要。
- 若拆分成多個模組，應將目標規則所 import 的模組也納入相依關係，才能正確傳遞變更。簡便作法是把目標目錄下所有 Python 檔案變成變數，再加進相依關係中。

例（簡便作法）:
```makefile
PY_SRCS := $(wildcard scripts/**/*.py) $(wildcard scripts/*.py)

$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv $(PY_SRCS) | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@
```

## 平行執行與加速
- 透過 `make -j` 可以將彼此獨立的檔案轉換平行化。資料點越多，效果越明顯。
- 中間產物切得越細，增量執行越有效，也越能避免整體重算。
- 若 I/O 是瓶頸，可搭配壓縮格式、檔案分割、或本機 SSD 使用。

## 實務上的訣竅
- 目錄建立使用順序相依（`| dir`）處理，可避免不必要的重建。
- 為了在失敗時不留下不完整產物，建議啟用 `.DELETE_ON_ERROR`。
- 常用入口可用 `.DEFAULT_GOAL := all` 標準化，讓 `make` 一次就能執行。
- 除錯時可使用 `make -n`（只顯示不執行）、`make --trace`（顯示為何會執行）、`make -d`（詳細日誌）。
- 清理請使用 `.PHONY: clean`，並注意只刪除生成物。

## 虛擬環境與依賴套件（選用）
Python 執行環境也可以交由 Make 管理。

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

更新 requirements.txt 時，只會在必要範圍內重新完成設定。

## 總結
- Makefile 是一種能自動化「明確相依關係」與「只重跑差異部分」的工具，能大幅提升資料轉換流程的可靠性與開發速度。
- 正確連結原始資料、腳本與產出物，並將處理細化後，更新影響的範圍就能被快速重新計算。
- 以最少的描述即可獲得可重現性、平行化與可觀測性，讓日常自動化工作變得更加順手。