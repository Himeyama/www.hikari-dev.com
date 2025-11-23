---
title: How to install pyenv and Python on Ubuntu (including WSL2)
tags: [Python, pyenv, Debian, Ubuntu, WSL2, Install]
authors: hikari
---



## Install Dependencies
Reference: [Home · pyenv/pyenv Wiki](https://github.com/pyenv/pyenv/wiki#sugegested-build-environment)

```bash
sudo apt update
sudo apt install build-essential libssl-dev zlib1g-dev \
   libbz2-dev libreadline-dev libsqlite3-dev curl \
   libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev lbmzma-dev
```

## Install pyenv
Reference: [pyenv/pyenv-installer: This tool is used to install `pyenv` and friends.] (https://github.com/pyenv/pyenv-installer?tab=readme-ov-file)

```bash
curl https://pyenv.run | bash
```

## Add initialization script to ~/.bashrc

```bash
# Open ~/.bashrc
code ~/.bashrc
```

Add the following:

```bash
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

eval "$(pyenv virtualenv-init -)"
```

## Install Python

### Display a list of installable versions

```bash
pyenv install -l
```

### Install Python

Install Python 3.12.2.

```bash
pyenv install 3.12.2
```

### Set the Python version

Set the default version to Python 3.12.2.

```bash
pyenv global 3.12.2

python -V # Python 3.12.2
```
