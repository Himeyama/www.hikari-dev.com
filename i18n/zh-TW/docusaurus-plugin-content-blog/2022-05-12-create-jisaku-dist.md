---
title: 建立自製發行版
description: 關於如何建立自製發行版的備忘錄
authors: hikari
tags: [Linux, 發行版, 自製]
image: /img/ogp/2022-05-12-create-jisaku-dist.webp
---

這篇備忘錄記錄了如何建立自製的 Linux 發行版。

:::info
建立一個自製的 Linux 發行版是一個複雜的過程，它涉及選擇核心組件、配置構建環境、編譯軟體包、打包系統以及創建安裝介質。這通常是為了特定的目的或學習目的而進行的。
:::

## 核心組件

一個基本的 Linux 發行版通常包含以下核心組件：

-   **Linux 核心 (Kernel)**：操作系統的核心。
-   **Glibc (GNU C Library)**：C 語言標準庫。
-   **Binutils (GNU Binary Utilities)**：編譯器工具鏈的一部分。
-   **GCC (GNU Compiler Collection)**：編譯器。
-   **Coreutils (GNU Core Utilities)**：基本命令行工具（ls, cp, mv 等）。
-   **Bash (GNU Bash)**：Shell。
-   **Filesystem Hierarchy Standard (FHS)**：文件系統佈局標準。
-   **Init 系統**：啟動和管理系統進程（例如 Systemd、SysVinit、OpenRC）。

## 建立步驟概覽

建立自製發行版通常遵循類似於 [Linux From Scratch (LFS)](http://www.linuxfromscratch.org/) 的過程。以下是一個高階的步驟概覽：

### 1. 準備構建環境 (Host System)

你需要一個現有的 Linux 系統作為主機來進行構建。這個主機系統將提供編譯工具和必要的庫。

### 2. 創建分區和掛載文件系統

為你的新發行版創建獨立的分區（例如 `/`、`/boot`、`swap`）並將它們掛載到主機系統上的臨時目錄（例如 `/mnt/lfs`）。

### 3. 下載源碼

下載所有你需要編譯的軟體包的源碼，例如 Linux 核心、Glibc、Binutils、GCC 等。

### 4. 構建基本的工具鏈 (Cross-Compilation)

這是最關鍵也是最複雜的步驟之一。你需要構建一個獨立的、自給自足的工具鏈，它可以在新系統上編譯其他軟體。這通常涉及：
    -   構建 Binutils 的第一階段。
    -   構建 GCC 的第一階段（只包含 C）。
    -   構建 Glibc 的第一階段。
    -   重新構建 Binutils 和 GCC，使其鏈接到新的 Glibc。

### 5. 構建臨時系統

使用新構建的工具鏈，編譯和安裝一系列基本的實用程式，例如：
    -   Zlib
    -   File
    -   Readline
    -   Bash
    -   Coreutils
    -   Sed
    -   Tar
    -   Xz
    -   Grep
    -   ...等

這一步的目的是創建一個最小但功能齊全的 Linux 環境，以便在其中繼續構建。

### 6. 進入新系統 (Chroot)

使用 `chroot` 命令將根文件系統切換到你正在構建的新系統的目錄。從現在開始，所有命令都將在新系統的環境中執行。

```bash
chroot /mnt/lfs /usr/bin/env -i   
    HOME=/root TERM="$TERM"        
    PS1='(lfs chroot) \u:\w\$ '    
    PATH=/usr/bin:/usr/sbin        
    /bin/bash --login
```

### 7. 構建其餘的系統軟體包

在新系統中，編譯和安裝其餘的關鍵軟體包，包括：
    -   完整的 Glibc
    -   完整的 GCC
    -   Linux 核心標頭
    -   M4
    -   Ncurses
    -   Procps
    -   Util-linux
    -   E2fsprogs (文件系統工具)
    -   GRUB (引導加載器)
    -   ...等

### 8. 配置系統

配置網絡、用戶、密碼、時區、語言環境等。

### 9. 創建啟動腳本和配置文件

-   `/etc/fstab`：文件系統掛載點。
-   `/etc/passwd`, `/etc/group`：用戶和組。
-   `/etc/network/interfaces` 或 `systemd-networkd` 配置。
-   Init 系統的配置。

### 10. 安裝核心

編譯和安裝最終的 Linux 核心，並創建 `initramfs`。

### 11. 安裝引導加載器

配置和安裝 GRUB，使其能夠引導你的新發行版。

### 12. 退出 Chroot 並清理

從 `chroot` 環境中退出，卸載文件系統，並清理臨時文件。

### 13. 重啟並測試

從新建立的發行版啟動系統。

## 進階主題

-   **套件管理**：考慮使用或開發一個簡單的套件管理器。
-   **桌面環境**：安裝 Xorg、桌面環境（如 GNOME、KDE、XFCE）和相關應用程式。
-   **Live CD/USB**：創建一個可啟動的 Live 系統。

## 總結

建立一個自製的 Linux 發行版是一項艱巨但非常有益的學習經歷，它能讓你深入理解 Linux 系統的底層運作方式。遵循 LFS 的方法是一個很好的起點，但也可以根據你的具體需求進行客製化和簡化。
