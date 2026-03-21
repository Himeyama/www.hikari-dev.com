---
title: How to install .NET on Ubuntu (including WSL2)
tags: [Linux, .NET, WSL]
---

Reference:
[Install .NET on Linux without using a package manager - .NET | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/core/install/linux-scripted-manual#scripted-install)

## Download the install script
```bash
wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
```

## Make the install script executable
```bash
chmod +x ./dotnet-install.sh
```

## Install the dot.net SDK
```bash
./dotnet-install.sh
```

### To install the latest version
```bash
./dotnet-install.sh --version latest
```

## Add to path
Open `$HOME/.bashrc` and add the following:

```bash
export DOTNET_ROOT=$HOME/.dotnet
export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools
```