---
title: "什麼是適用於 Windows 的 Coreutils"
authors: hikari
tags: [Windows]
---

## WinGet 可安裝的 Microsoft 官方 Linux 指令群最新動向（2026 年 6 月更新）

2026 年 6 月，Microsoft 正式公開了 **Coreutils for Windows**。

```powershell
winget install Microsoft.Coreutils
```

透過這個指令可安裝的 **Microsoft.Coreutils**，是 Microsoft 官方專案，可讓 Linux 與 macOS 日常使用的 `ls`、`cp`、`rm`、`cat` 等 UNIX 系指令，能在 Windows 上以原生方式執行。

本文將整理專案概要、支援指令、限制事項，以及與 WSL 和 PowerShell 的差異。

# 概要

Microsoft.Coreutils 是由 Microsoft 維護、面向 Windows 的命令列工具集。

其內部是以以下專案為基礎構建：

* uutils/coreutils
* findutils
* grep

並以 Rust 實作。

Microsoft 將此專案的目的說明為：

> 降低在 Linux、macOS、WSL、容器、Windows 之間來回切換的開發者摩擦

# 安裝方法

可透過 WinGet 輕鬆導入。

```powershell
winget install Microsoft.Coreutils
```

WinGet 是 Windows 內建的套件管理員，可自動下載並安裝指定套件。

安裝後即可作為一般指令使用。

```powershell
ls
cat file.txt
grep keyword log.txt
cp source.txt backup.txt
```

# 可使用的主要指令

代表性的指令如下。

| 分類       | 指令範例      |
| -------- | ---------- |
| 檔案列表   | ls         |
| 檔案複製  | cp         |
| 檔案移動  | mv         |
| 檔案刪除  | rm         |
| 內容顯示     | cat        |
| 目前工作目錄 | pwd        |
| 建立目錄 | mkdir      |
| 休眠     | sleep      |
| 管線處理    | tee        |
| 搜尋       | grep, find |

對 Linux 使用者來說，熟悉的指令可直接使用。

# 與 PowerShell 的衝突問題

這裡是最大的注意點！

PowerShell 內已經存在同名的別名或內建指令。

例如：

| 指令 | 問題                 |
| ---- | ------------------ |
| ls   | 與 PowerShell 別名衝突 |
| cp   | 與 Copy-Item 衝突       |
| cat  | 與 Get-Content 衝突     |
| rm   | 與 Remove-Item 衝突     |
| pwd  | 與 Get-Location 衝突    |

因此，

```powershell
ls
```

即使執行了，也不一定會呼叫 Coreutils 版本。

Microsoft 建議使用 PowerShell 7.4 以上版本。

# Windows 特有的限制

雖然目標是相容 Linux，但仍存在因 Windows 機制造成的限制。

## 1. 沒有 POSIX 訊號

Linux 的

```bash
kill
SIGTERM
SIGKILL
```

機制在 Windows 中不存在。

因此，

```bash
kill
timeout
```

目前尚未提供。

## 2. 沒有 /dev/null

Linux：

```bash
grep error log.txt > /dev/null
```

Windows：

```cmd
grep error log.txt > NUL
```

會是這樣。

## 3. ACL 與 POSIX 權限的差異

Windows 是以 ACL 為基礎的權限管理。

因此，

```bash
chmod
chown
chgrp
```

等指令不會提供。

---

## 4. 建立符號連結

雖然可以讀取，但若要新建立，則需要：

* Developer Mode
* 管理員權限

# 不提供的主要指令

Microsoft 有意排除了一部分指令。

### 與 Windows 衝突的項目

* dir
* more
* paste
* whoami
* expand

### 與 POSIX 強烈依賴的項目

* chmod
* chown
* chgrp
* chroot
* nohup
* stty
* tty
* who

### 目前尚未實作的項目

* kill
* timeout
* dd

# 與 WSL 的差異

最常被比較的是 WSL（Windows Subsystem for Linux）。

| 項目          | Microsoft.Coreutils | WSL          |
| ----------- | ------------------- | ------------ |
| 導入成本       | 非常低                | 需要建置 Linux 環境 |
| 啟動速度        | 原生                 | 有虛擬環境層      |
| Linux 相容性    | 部分                 | 非常高        |
| Bash 環境      | 無                  | 有           |
| apt 可用性       | 不可                 | 可           |
| Shell 腳本相容性 | 有限制                 | 高           |

WSL 是「Linux 環境本身」，而 Coreutils 則是「在 Windows 上使用類 Linux 指令的工具集」。