---
title: Termux 上的 SSH
description: 關於 Termux 上的 SSH 的備忘錄
authors: hikari
tags: [SSH, Termux]
image: /img/ogp/2021-09-29-termux-ssh.png
---

這篇備忘錄記錄了在 Termux 上使用 SSH 的方法。

:::info
Termux 是一個 Android 上的終端模擬器和 Linux 環境應用程式，它允許你運行許多 Linux 命令和工具。SSH 是一種安全的網絡協議，用於在不安全的網絡上安全地執行網絡服務。
:::

在 Termux 中，你可以將其作為 SSH 客戶端連接到遠端服務器，也可以將其設置為 SSH 服務器，以便從其他設備連接到你的 Android 設備。

## 1. 作為 SSH 客戶端

### 安裝 OpenSSH

Termux 提供了一個 OpenSSH 套件，你可以通過 `pkg` 命令安裝：

```bash
pkg update && pkg upgrade
pkg install openssh
```

### 連接到遠端服務器

安裝完成後，你可以使用 `ssh` 命令連接到遠端服務器：

```bash
ssh user@hostname_or_ip
```

例如：
```bash
ssh myuser@192.168.1.100
```

你也可以使用 SSH 密鑰進行身份驗證，這比密碼更安全。

### 生成 SSH 密鑰

如果尚未生成，你可以在 Termux 中生成 SSH 密鑰對：

```bash
ssh-keygen
```

按照提示操作，通常可以直接按 Enter 使用默認值。公鑰會保存在 `~/.ssh/id_rsa.pub`，私鑰在 `~/.ssh/id_rsa`。

### 上傳公鑰到遠端服務器

將你的公鑰複製到遠端服務器的 `~/.ssh/authorized_keys` 文件中：

```bash
ssh-copy-id user@hostname_or_ip
```

或者手動複製：

```bash
cat ~/.ssh/id_rsa.pub | ssh user@hostname_or_ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## 2. 作為 SSH 服務器

### 啟動 SSH 服務器

Termux 內置了一個 SSH 服務器。默認情況下，它在端口 8022 上運行。
要啟動 SSH 服務器，只需運行 `sshd` 命令：

```bash
sshd
```

:::warning 注意
每次 Termux 應用程式關閉或設備重啟後，你都需要重新運行 `sshd` 命令來啟動 SSH 服務器。
:::

### 設置 SSH 密碼

如果你想使用密碼連接，你需要為你的 Termux 用戶設置一個密碼：

```bash
passwd
```

輸入並確認你的密碼。

### 從其他設備連接

現在，你可以從你的電腦或其他設備連接到 Termux SSH 服務器。你需要知道你的 Android 設備在局域網中的 IP 地址。

在你的電腦上：

```bash
ssh -p 8022 user@android_device_ip
```

其中 `user` 是你的 Termux 用戶名（通常是 `u0_aXXX` 這樣的字串，但對於 Termux SSH 服務器，你可以直接使用 `sshd` 運行時的用戶名，通常是 `root` 或者你當前的 shell 用戶）。

### 查找 Termux 用戶名

你可以在 Termux 中運行 `whoami` 命令來查看當前用戶名。
更可靠的方法是，當你啟動 `sshd` 後，它會使用當前的用戶身份。如果你沒有顯式設置用戶，它可以是 `root` (如果你以 root 權限運行) 或者默認的 Termux 用戶。

### 停止 SSH 服務器

要停止 SSH 服務器，你可以找到 `sshd` 進程並終止它：

```bash
pkill sshd
```

## 總結

Termux 提供了強大的 SSH 功能，無論是作為客戶端還是服務器，都能極大地增強你的 Android 設備的實用性。這使得在手機上進行開發、遠端管理或其他基於 SSH 的任務變得可能。
