---
title: "Recommendation for Makefile"
authors: hikari
tags: [Makefile, Linux]
draft: true
---

## Background and Problem Awareness
In daily work, when automating data transformation with Python scripts, you often run into the following issues:
- Only part of the source data has been updated, but you end up rerunning everything and wasting time.
- It is unclear which steps depend on which files, making execution order and missed steps hard to manage.
- It is difficult to tell which outputs will be affected when a script changes.

A Makefile is a tool that natively provides "dependencies" and "incremental rebuilds" (rerunning only the changed parts), and can solve these issues with just a small amount of notation.

## Basics of Make
- Target: the artifact to be generated (e.g. `output/report.csv`)
- Dependencies: the files required for generation (e.g. `data/clean/*.csv` and scripts)
- Recipe: the command used to generate it (e.g. `python scripts/aggregate.py ...`)

Make runs the recipe only when the dependencies are newer than the target. This automatically reruns only the necessary parts when source data or Python scripts are updated.

## Minimal Makefile Example
The following is an example of incrementally processing raw data, cleaning it, and generating an aggregate report.

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

# Directories are order-only dependencies (they are created if missing, but not used for rebuild checks)
$(CLEAN_DIR) $(OUT_DIR):
	mkdir -p $@

# The aggregate report depends on the cleaned CSVs and the aggregation script
$(REPORT): $(CLEAN) scripts/aggregate.py | $(OUT_DIR)
	python scripts/aggregate.py -i $(CLEAN_DIR) -o $@

# Generate the corresponding clean CSV from each raw CSV
$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv scripts/clean.py | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@

.PHONY: all clean status

all: $(REPORT)

clean:
	rm -rf $(CLEAN_DIR) $(OUT_DIR)

# Helper to check what will be rebuilt
status:
	@echo "RAW   : $(RAW)"
	@echo "CLEAN : $(CLEAN)"
	@echo "REPORT: $(REPORT)"
	@echo
	@echo "Dry-run (what would run):"
	@$(MAKE) -n all
```

With this structure, the following becomes possible:
- When `data/raw/foo.csv` is updated, only the corresponding `data/clean/foo.csv` is regenerated.
- When `scripts/clean.py` is updated, only the cleaning steps that are needed are rerun.
- When `scripts/aggregate.py` is updated, only the aggregate report is rerun.

## How It Works
```sh
# First run (generate everything)
make -j

# Part of the raw data is updated (only that file's cleaning and the report are rerun)
touch data/raw/a.csv
make -j

# The cleaning script is updated (all cleaning steps and the report are rerun)
touch scripts/clean.py
make -j

# The aggregation script is updated (only the report is rerun)
make
```

To check in advance what will run, `make -n` is useful.

## Guidelines for Designing Script Dependencies
- For each rule, it is important to explicitly list the Python script it directly invokes as a dependency.
- If you split code across multiple modules, include in the dependencies the modules imported by the target rule so that changes propagate correctly. A simple approach is to collect all Python files in the relevant directory into a variable and add them to the dependencies.

Example (simple approach):
```makefile
PY_SRCS := $(wildcard scripts/**/*.py) $(wildcard scripts/*.py)

$(CLEAN_DIR)/%.csv: $(RAW_DIR)/%.csv $(PY_SRCS) | $(CLEAN_DIR)
	python scripts/clean.py -i $< -o $@
```

## Parallel Execution and Speedup
- `make -j` can parallelize independent file transformations. The more data points you have, the more effective this becomes.
- The more finely you split intermediate outputs, the more effective incremental builds become, avoiding full recomputation.
- If I/O is the bottleneck, combine this with compressed formats, file partitioning, or a local SSD.

## Practical Tips for Production Use
- Treat directory creation as an order-only dependency (`| dir`) to avoid unnecessary rebuilds.
- Enable `.DELETE_ON_ERROR` so incomplete outputs are not left behind on failure.
- Standardize the common entry point with `.DEFAULT_GOAL := all` so that `make` works out of the box.
- For debugging, use `make -n` (show without running), `make --trace` (show why something runs), and `make -d` (verbose logs).
- Use `.PHONY: clean` for cleanup, and be careful to delete only generated artifacts.

## Virtual Environments and Dependencies (Optional)
Python execution environments can also be managed with Make.

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

If `requirements.txt` is updated, only the necessary portion will be set up again.

## Summary
- A Makefile is a tool that automates "explicit dependencies" and "incremental rebuilds," greatly improving the reliability and development speed of data transformation pipelines.
- By correctly linking source data, scripts, and generated outputs, and by splitting processing into smaller steps, only the affected scope of updates is quickly recomputed.
- With minimal notation, you get reproducibility, parallelization, and observability, making everyday automation work much more comfortable.