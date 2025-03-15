---
title: Ubuntu (WSL2 含む) に dotnet をインストール方法
layout: post
tags: [dotnet, Debian, Ubuntu, WSL2, インストール]
toc: true
---

参考: 
[パッケージ マネージャーを使用せずに Linux に .NET をインストールする - .NET | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/core/install/linux-scripted-manual#scripted-install)


## インストールスクリプトのダウンロード
```bash
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
```

## インストールスクリプトへ実行権限付与
```bash
chmod +x ./dotnet-install.sh
```

## dotnet SDK をインストール
```bash
./dotnet-install.sh
```

### 最新版をインストールする場合は
```bash
./dotnet-install.sh --version latest
```

## パスを通す
`$HOME/.bashrc` を開き、以下を追記

```bash
export DOTNET_ROOT=$HOME/.dotnet
export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools

```