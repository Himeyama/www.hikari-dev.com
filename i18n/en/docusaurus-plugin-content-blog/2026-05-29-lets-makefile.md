---
title: "Makefile のすすめ"
authors: hikari
tags: [Makefile, Linux]
draft: true
---

## Recommendation: Makefile

## Background and problems
When automating data transformations with Python scripts in daily work, you often face problems like:
- Wasting time by re-running the entire pipeline when only part of the source data changed.
- Unclear which steps depend on which files, making it hard to manage execution order and omissions.
- Difficult to know which outputs are affected by changes to scripts.

Makefile provides "dependencies" and "incremental rebuilds" as built-in features, and can solve these problems with small amounts of configuration.

## Basics of Make
- Target: the artifact to produce (e.g. output/report.csv)
- Dependencies: files needed to produce it (e.g. data/clean/*.csv or scripts)
- Recipe: commands used to produce it (e.g. python scripts/aggregate.py ...)

Make only runs a recipe when any of its dependencies is newer than the target. This makes it so that when source data or Python scripts are updated, only the necessary parts are automatically re-run.

## Minimal Makefile example
Below is an example that incrementally runs a pipeline which cleans raw data and produces an aggregated report.

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

# Directories are order-only prerequisites (create if missing, but not used for freshness checks)
$(CLEAN_DIR) $(OUT_DIR):
	mkdir -p $@

# Aggregated report depends on cleaned CSVs and the aggregation script
$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR)
	python scripts/aggregate.py -i $(CLEAN_DIR) -o $@

# Produce each clean CSV from the corresponding raw CSV
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@

.PHONY: all clean status

all: $(REPORT)

clean:
	rm -rf $(CLEAN_DIR) $(OUT_DIR)

# Helper to check what would be rebuilt
status:
	@echo "RAW   : $(RAW)"
	@echo "CLEAN : $(CLEAN)"
	@echo "REPORT: $(REPORT)"
	@echo
	@echo "Dry-run (what would run):"
	@$(MAKE) -n all
```

With this setup you get:
- Updating a source file like data/raw/foo.csv will only re-generate the corresponding data/clean/foo.csv.
- Updating scripts/clean.py will re-run only the cleaning step as needed.
- Updating scripts/aggregate.py will re-run only the aggregation report.

## Usage examples
```sh
# First run (generate everything)
make -j

# Some raw files updated (only clean that file and the report are re-run)
touch data/raw/a.csv
make -j

# Cleaning script updated (re-run all cleaning and the report)
touch scripts/clean.py
make -j

# Aggregation script updated (re-run only the report)
touch scripts/aggregate.py
make
```

To check "what will run" in advance, use `make -n`.

## Design guidelines for script dependencies
- For each rule, explicitly list the Python script that it directly invokes as a dependency.
- If your code is split across multiple modules, include the modules that the target rule imports in the dependencies so changes propagate correctly. A convenient approach is to glob the Python files in the relevant directory into a variable and add them as dependencies.

Example (simple approach):
```makefile
PY_SRCS := $(wildcard scripts/**/*.py) $(wildcard scripts/*.py)

$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv $(PY_SRCS) | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@
```

## Parallel execution and performance
- Use `make -j` to parallelize independent file transformations. The larger the number of data items, the more effective this is.
- The finer you split intermediate artifacts, the more effective incremental builds become, avoiding full recomputation.
- If I/O is the bottleneck, consider compressed formats, splitting files, or using a local SSD.

## Practical tips for production use
- Treat directory creation as order-only prerequisites (`| dir`) to avoid unnecessary rebuilds.
- Enable `.DELETE_ON_ERROR` to avoid leaving incomplete artifacts on failure.
- Standardize common entry points with `.DEFAULT_GOAL := all` so `make` runs the usual pipeline.
- For debugging, use `make -n` (show without running), `make --trace` (show why targets are considered), and `make -d` (detailed logs).
- Declare cleanup as `.PHONY: clean` and be careful to delete only generated artifacts.

## Virtual environments and dependencies (optional)
You can also manage the Python runtime with Make.

```makefile
VENV := .venv
PY := $(VENV)/bin/python

$(VENV)/bin/python: requirements.txt
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r requirements.txt
	touch $@

# Use $(PY) in subsequent recipes
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR) $(VENV)/bin/python
	$(PY) scripts/clean.py -i $< -o $@

$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR) $(VENV)/bin/python
	$(PY) scripts/aggregate.py -i $(CLEAN_DIR) -o $@
```

Updating requirements.txt will re-setup only the necessary parts.

## Summary
- Makefile automates "explicit dependencies" and "incremental re-execution", greatly improving the reliability and development speed of data transformation pipelines.
- By correctly linking source data, scripts, and outputs and breaking processing into small steps, only the affected parts are quickly recomputed after changes.
- With minimal configuration you gain reproducibility, parallelism, and observability, making daily automation tasks much more pleasant.