---
title: rbenv (WSL2 / Ubuntu) へのインストール方法
layout: post
toc: true
---

## 依存パッケージのインストール
- https://github.com/rbenv/ruby-build/wiki#ubuntudebianmint

```bash
sudo apt update
sudo apt install autoconf patch build-essential rustc libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libgmp-dev libncurses5-dev libffi-dev libgdbm6 libgdbm-dev libdb-dev uuid-dev -y
```

## rbenv のインストール
```bash
# rbenv と ruby-build をインストール
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/HEAD/bin/rbenv-installer | bash

# 起動時に rbenv を読み込み
echo 'eval "$(/home/hikari/.rbenv/bin/rbenv init - bash)"' | tee -a ~/.bashrc
```

### 参考
- https://github.com/rbenv/rbenv-installer

## Ruby 3.3.0 のインストール

```bash
source ~/.bashrc     # rbenv を初期化 (WSL 再ログインでも可)
rbenv install 3.3.0  # Ruby 3.3.0 のインストール
rbenv global 3.3.0   # Ruby 3.3.0 を規定に設定
```

### 参考
- https://github.com/rbenv/rbenv
