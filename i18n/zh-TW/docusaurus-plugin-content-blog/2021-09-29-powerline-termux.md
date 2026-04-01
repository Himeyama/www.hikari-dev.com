---
title: Termux 上的 Powerline
description: 關於 Termux 上的 Powerline 的備忘錄
authors: hikari
tags: [Powerline, Termux]
image: /img/ogp/2021-09-29-powerline-termux.png
---

這篇備忘錄記錄了在 Termux 上安裝和配置 Powerline 的方法。

:::info
Powerline 是一個為各種 Shell（如 Bash、Zsh）和編輯器（如 Vim）提供美觀且功能豐富的狀態欄插件。它顯示有用的信息，如當前 Git 分支、Vim 模式、Python 虛擬環境等。
:::

## 安裝步驟

### 1. 更新 Termux 套件

在安裝任何新軟體之前，建議先更新 Termux 的套件列表：

```bash
pkg update && pkg upgrade
```

### 2. 安裝必要的套件

Powerline 需要 Python 環境。此外，為了顯示特殊字元（如箭頭），你需要安裝一個支持 Powerline 字體。

```bash
pkg install python python-pip
pkg install git
```

### 3. 安裝 Powerline

使用 `pip` 安裝 Powerline：

```bash
pip install --user powerline-status
```

安裝完成後，Powerline 的可執行文件會位於 `~/.local/bin/`。

### 4. 配置 Shell

你需要將 Powerline 添加到你的 Shell 配置中。這裡以 Bash 為例。

編輯 `~/.bashrc` 文件：

```bash
vim ~/.bashrc
```

在文件末尾添加以下內容：

```bash
# Powerline
export PATH="$PATH:$HOME/.local/bin"
powerline-daemon -q
POWERLINE_BASH_CONTINUATION=1
POWERLINE_BASH_SELECT=1
. ~/.local/lib/python*/site-packages/powerline/bindings/bash/powerline.sh
```

保存並退出，然後重新載入 `~/.bashrc`：

```bash
source ~/.bashrc
```

### 5. 安裝 Powerline 字體

為了讓 Powerline 正確顯示特殊字元，你需要一個 Powerline 字體。在 Termux 中，你可以直接安裝。

```bash
pkg install termux-api
termux-setup-storage
```

然後，你可以下載並安裝一個 Powerline 字體。由於 Termux 的環境限制，直接修改系統字體可能比較麻煩。一種常見的做法是使用支持 Powerline 的終端模擬器（如 Termux 的默認字體通常已支持）。

如果你在其他 Linux 環境下，你可以安裝 `fonts-powerline`：

```bash
sudo apt install fonts-powerline
```

或者手動下載並安裝字體。

### 6. 配置 Powerline 主題 (可選)

Powerline 允許你自定義狀態欄的外觀。你可以創建自己的配置或修改現有的配置。

通常，配置文件位於 `~/.config/powerline/`。你可以複製預設配置進行修改：

```bash
mkdir -p ~/.config/powerline
cp -r ~/.local/lib/python*/site-packages/powerline/config_files ~/.config/powerline/
```

然後編輯 `~/.config/powerline/config.json` 或 `~/.config/powerline/themes/shell/default.json`。

## 總結

通過上述步驟，你可以在 Termux 上成功安裝和配置 Powerline，為你的命令行界面帶來更美觀和信息豐富的狀態欄。這將極大地提升你的終端使用體驗。
