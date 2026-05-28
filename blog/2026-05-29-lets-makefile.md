---
title: "Makefile のすすめ"
authors: hikari
tags: [Makefile, Linux]
draft: true
---

## 背景と課題意識
日々の業務で Python スクリプトを用いてデータ変換の自動化を行うと、次のような課題に直面することが多い。
- 元データの一部だけが更新されたのに全体を実行し直して時間を浪費する。
- どの手順がどのファイルに依存しているかが曖昧で、実行順序や抜け漏れの管理が難しい。
- スクリプトの変更がどの成果物に影響するか掴みにくい。

Makefile は「依存関係」と「差分だけの再実行（インクリメンタルビルド）」を標準機能として備え、これらの課題を小さな記述で解決できる道具である。

## Make の基本
- ターゲット: 生成物（例: output/report.csv）
- 依存関係: 生成に必要なファイル（例: data/clean/*.csv やスクリプト）
- レシピ: 生成に使うコマンド（例: python scripts/aggregate.py ...）

Make は「依存関係がターゲットより新しいときにだけレシピを実行」する。これにより、元データや Python スクリプトを更新した場合に、必要な箇所のみが自動的に再実行される。

## 最小構成の Makefile 例
以下は raw データをクリーニングし、集計レポートを作る一連の処理を差分実行する例である。

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

# ディレクトリは順序限定依存（存在しなければ作るが、更新判定には使わない）
$(CLEAN_DIR) $(OUT_DIR):
	mkdir -p $@

# 集計レポートはクリーン済み CSV と集計スクリプトに依存
$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR)
	python scripts/aggregate.py -i $(CLEAN_DIR) -o $@

# 各 raw CSV から対応する clean CSV を生成
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@

.PHONY: all clean status

all: $(REPORT)

clean:
	rm -rf $(CLEAN_DIR) $(OUT_DIR)

# 何が再ビルド対象かを確認するヘルパ
status:
	@echo "RAW   : $(RAW)"
	@echo "CLEAN : $(CLEAN)"
	@echo "REPORT: $(REPORT)"
	@echo
	@echo "Dry-run (what would run):"
	@$(MAKE) -n all
```

この構成により次が実現できる。
- 元データ data/raw/foo.csv を更新すると、対応する data/clean/foo.csv だけが再生成される。
- scripts/clean.py を更新すると、クリーン工程だけが必要分再実行される。
- scripts/aggregate.py を更新すると、集計レポートだけが再実行される。

## 動作イメージ
```sh
# 初回（すべて生成）
make -j

# 一部の raw が更新（そのファイルのクリーンとレポートのみ再実行）
touch data/raw/a.csv
make -j

# クリーニングスクリプトが更新（全クリーンとレポートを再実行）
touch scripts/clean.py
make -j

# 集計スクリプトが更新（レポートのみ再実行）
touch scripts/aggregate.py
make
```

「何が走るか」を事前確認するには `make -n` が有効である。

## スクリプト依存の設計指針
- 各ルールには、それを直接呼び出す Python スクリプトを依存関係として明示することが重要である。
- 複数のモジュールに分割している場合、対象ルールが import するモジュールまで依存に含めると変更が正しく伝播する。簡便策としては対象ディレクトリの Python ファイル一式を変数化して依存に加える。

例（簡便策）:
```makefile
PY_SRCS := $(wildcard scripts/**/*.py) $(wildcard scripts/*.py)

$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv $(PY_SRCS) | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@
```

## 並列実行と高速化
- `make -j` により独立したファイル変換を並列化できる。データ点数が多いほど効果が高い。
- 中間生成物を細かく分割するほど差分実行が効きやすく、全体の再計算を回避できる。
- I/O がボトルネックの場合は圧縮形式やファイル分割、ローカル SSD などと併用する。

## 実運用のコツ
- ディレクトリ作成は順序限定依存（`| dir`）で扱い、無駄な再ビルドを避ける。
- 失敗時に不完全な生成物を残さないために `.DELETE_ON_ERROR` を有効化する。
- よく使う入口を `.DEFAULT_GOAL := all` で標準化し、`make` 一発で動かせるようにする。
- デバッグには `make -n`（実行せず表示）、`make --trace`（どの判定で動くか表示）、`make -d`（詳細ログ）を使う。
- クリーンアップは `.PHONY: clean` とし、生成物だけを削除するよう注意する。

## 仮想環境と依存パッケージ（任意）
Python の実行環境も Make で管理できる。

```makefile
VENV := .venv
PY := $(VENV)/bin/python

$(VENV)/bin/python: requirements.txt
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r requirements.txt
	touch $@

# 以降のレシピで $(PY) を使う
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR) $(VENV)/bin/python
	$(PY) scripts/clean.py -i $< -o $@

$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR) $(VENV)/bin/python
	$(PY) scripts/aggregate.py -i $(CLEAN_DIR) -o $@
```

requirements.txt を更新すると必要な範囲でのみ再セットアップされる。

## まとめ
- Makefile は「依存関係の明示」と「差分だけの再実行」を自動化し、データ変換パイプラインの信頼性と開発速度を大きく向上させる道具である。
- 元データ、スクリプト、生成物を正しく結び、処理を細かく分割することで、更新の影響範囲だけが素早く再計算される。
- 最小の記述で再現性・並列化・可観測性が手に入り、日々の自動化作業が一段と快適になるのである。