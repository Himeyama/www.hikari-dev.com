---
title: Ubuntu (WSL2 含む) に pyenv と Python をインストールする方法
layout: post
tags: [Python, pyenv, Debian, Ubuntu, WSL2, インストール]
toc: true
---


## 依存パッケージのインストール
参考: [Home · pyenv/pyenv Wiki](https://github.com/pyenv/pyenv/wiki#suggested-build-environment)

```bash
sudo apt update
sudo apt install build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev curl \
    libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
```

## Pyenv のインストール
参考: [pyenv/pyenv-installer: This tool is used to install `pyenv` and friends.](https://github.com/pyenv/pyenv-installer?tab=readme-ov-file)

```bash
curl https://pyenv.run | bash
```

## ~/.bashrc に初期化スクリプトを書き込む

```bash
# ~/.bashrc を開く
code ~/.bashrc
```

以下を書き込みます。

```bash
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

eval "$(pyenv virtualenv-init -)"

```

## Python のインストール

### インストール可能なバージョン一覧を表示

```bash
pyenv install -l
```

### Python のインストール
Python 3.12.2 をインストールします。

```bash
pyenv install 3.12.2
```

### Python のバージョンを指定
デフォルトのバージョンを Python 3.12.2 に設定します。

```bash
pyenv global 3.12.2

python -V # Python 3.12.2
```
