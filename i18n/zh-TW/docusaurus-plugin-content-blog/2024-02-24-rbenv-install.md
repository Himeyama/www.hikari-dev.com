---
title: rbenv 安裝指南（WSL2 / Ubuntu）
tags: [Linux, Ruby, WSL]
image: /img/ogp/2024-02-24-rbenv-install.webp
---

## 安裝相依套件
- https://github.com/rbenv/ruby-build/wiki#ubuuntdebiandmint

```bash
sudo apt update
sudo apt install autoconf patch build-essential rusct libssl-dev libyaml-dev libreadline6-dev zlib1g-dev libgmp-dev libncurses5-dev libffi-dev libgdbm6 libgdbm-dev libdb-dev uuid-dev -y
```

## 安裝 rbenv
```bash
# 安裝 rbenv 和 ruby-build
curl -fsSL https://github.com/rbenv/rbenv-installer/raw/HEAD/bin/rbenv-installer | bash

# 在啟動時初始化 rbenv
echo 'eval "$($HOME/.rbenv/bin/rbenv init - bash)"' | tee -a ~/.bashrc
```

### 參考資料
- https://github.com/rbenv/rbenv-installer

## 安裝 Ruby 3.3.0
```bash
source ~/.bashrc    # 初始化 rbenv（也可以重新登入 WSL 後執行）
rbenv install 3.3.0 # 安裝 Ruby 3.3.0
rbenv global 3.3.0  # 將 Ruby 3.3.0 設為預設版本
```

### 參考資料
- https://github.com/rbenv/rbenv
