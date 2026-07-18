---
title: pyenv 安裝
description: 關於 pyenv 安裝的備忘錄
authors: hikari
tags: [Python, pyenv, 安裝]
image: /img/ogp/2024-03-16-pyenv-install.webp
---

這篇備忘錄記錄了 pyenv 的安裝。

:::info
`pyenv` 是一個命令行工具，用於管理多個 Python 版本。它允許你在同一台機器上輕鬆地安裝、切換和管理不同的 Python 環境，而不會相互衝突。
:::

這對於需要使用不同 Python 版本進行開發的項目（例如，一個項目需要 Python 3.8，另一個需要 Python 3.10）非常有用。

## 1. 安裝 pyenv

安裝 pyenv 的方法因操作系統而異。

### A. macOS (使用 Homebrew) - 推薦

在 macOS 上，使用 Homebrew 安裝 pyenv 是最簡單的方法。

```bash
brew update
brew install pyenv
```

### B. Linux (使用 `pyenv-installer` 腳本) - 推薦

對於 Linux 系統，可以使用 `pyenv-installer` 腳本來自動化安裝 pyenv 及其常用的插件。

```bash
curl https://pyenv.run | bash
```

### C. Windows (使用 `pyenv-win`)

對於 Windows 用戶，官方推薦使用 `pyenv-win`，它是 pyenv 的一個 Windows 版本。

```powershell
# 通過 PowerShell 安裝
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" | Invoke-Expression

# 或者通過 pip 安裝 (需要先有 Python 環境)
pip install pyenv-win --target %USERPROFILE%\.pyenv
```

請參考 `pyenv-win` 的 GitHub 儲存庫獲取最新安裝說明：[https://github.com/pyenv-win/pyenv-win](https://github.com/pyenv-win/pyenv-win)

## 2. 配置 Shell 環境

安裝 pyenv 後，你需要將其添加到你的 Shell 環境中。這會讓 `pyenv` 命令在你的終端中可用。

### A. Bash

將以下內容添加到你的 `~/.bashrc` (或 `~/.bash_profile`) 文件中：

```bash
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)" # 確保 shell 能夠加載 pyenv
eval "$(pyenv virtualenv-init -)" # 如果你計劃使用虛擬環境
```

完成後，重新載入你的 shell 配置：

```bash
source ~/.bashrc
```

### B. Zsh

將以下內容添加到你的 `~/.zshrc` 文件中：

```bash
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
```

完成後，重新載入你的 shell 配置：

```bash
source ~/.zshrc
```

### C. 驗證安裝

打開一個新的終端會話，然後運行：

```bash
pyenv --version
```

如果成功，它會顯示 pyenv 的版本號。

## 3. 安裝 Python 版本

現在你可以使用 `pyenv install` 命令來安裝你需要的 Python 版本。

### 查看可用的 Python 版本

```bash
pyenv install --list
```

這會列出所有可安裝的 Python 版本，包括 CPython、Jython、Anaconda 等。

### 安裝特定版本

```bash
pyenv install 3.9.10 # 安裝 Python 3.9.10
pyenv install 3.10.6 # 安裝 Python 3.10.6
```

安裝可能需要一些時間，因為它會下載源碼並編譯 Python。

## 4. 使用 Python 版本

### 全局設置 Python 版本

設置全局 Python 版本：

```bash
pyenv global 3.10.6
```

這會將 `3.10.6` 設置為你所有 shell 會話的默認 Python 版本。

### 局部設置 Python 版本 (專案目錄)

在專案目錄中，你可以設置一個局部 Python 版本。

```bash
cd my_project
pyenv local 3.9.10
```

這會在當前目錄中創建一個 `.python-version` 文件。當你進入這個目錄時，`pyenv` 會自動切換到指定的 Python 版本。

### 查看當前使用的 Python 版本

```bash
pyenv versions
```

當前使用的版本會被標記一個星號 `*`。

```bash
* 3.10.6 (set by /home/user/.pyenv/version)
  3.9.10
```

## 5. 總結

`pyenv` 是一個非常實用且強大的工具，用於管理 Python 版本。它提供了一種簡潔而可靠的方式來應對多個 Python 環境的需求，避免了版本衝突，讓你的開發工作流更加順暢。正確安裝和配置 `pyenv` 是任何嚴肅 Python 開發者的基本技能。
