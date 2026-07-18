---
title: SSH 隧道
description: 關於 SSH 隧道的備忘錄
authors: hikari
tags: [SSH, 隧道]
image: /img/ogp/2021-09-23-ssh-tunnel.webp
---

這篇備忘錄記錄了 SSH 隧道。

## 什麼是 SSH 隧道？

:::info
SSH 隧道（也稱為 SSH 端口轉發）是一種通過 SSH 連接在客戶端和服務器之間創建加密隧道的方法。它允許你將網絡流量從一個端口轉發到另一個端口，即使這些端口原本無法直接訪問。
:::

SSH 隧道有三種類型：

1.  **本地端口轉發 (Local Port Forwarding)**：將本地機器的端口轉發到遠端機器的端口。
2.  **遠端端口轉發 (Remote Port Forwarding)**：將遠端機器的端口轉發到本地機器的端口。
3.  **動態端口轉發 (Dynamic Port Forwarding)**：創建一個 SOCKS 代理，允許通過 SSH 連接動態轉發多個目的地。

## 1. 本地端口轉發 (Local Port Forwarding)

用途：訪問防火牆後的遠端服務。

語法：
```bash
ssh -L [本地端口]:[目標主機]:[目標端口] [SSH用戶]@[SSH服務器]
```

範例：
假設你本地機器上的 8080 端口，通過 SSH 服務器（`ssh.example.com`）將流量轉發到遠端機器（`remote.example.com`）的 80 端口。

```bash
ssh -L 8080:remote.example.com:80 user@ssh.example.com
```

現在，你可以通過訪問本地的 `localhost:8080` 來訪問 `remote.example.com` 上的網頁服務。

## 2. 遠端端口轉發 (Remote Port Forwarding)

用途：讓遠端機器訪問本地機器上的服務。

語法：
```bash
ssh -R [遠端端口]:[目標主機]:[目標端口] [SSH用戶]@[SSH服務器]
```

範例：
假設你希望遠端 SSH 服務器上的用戶可以通過 `localhost:9000` 訪問你本地機器上的 3000 端口（例如一個 Web 應用）。

```bash
ssh -R 9000:localhost:3000 user@ssh.example.com
```

現在，連接到 `ssh.example.com` 的用戶可以通過訪問 `localhost:9000` 來訪問你的本地服務。

## 3. 動態端口轉發 (Dynamic Port Forwarding)

用途：創建一個 SOCKS 代理，用於繞過防火牆或匿名上網。

語法：
```bash
ssh -D [本地端口] [SSH用戶]@[SSH服務器]
```

範例：
在本地機器上創建一個 SOCKS 代理，監聽 8181 端口。

```bash
ssh -D 8181 user@ssh.example.com
```

然後，你需要將你的瀏覽器或其他應用程式配置為使用 `localhost:8181` 作為 SOCKS 代理。所有通過這個代理的流量都將通過 `ssh.example.com` 加密隧道轉發。

## 保持隧道開啟

如果你希望 SSH 隧道在後台保持運行，可以使用 `-N`（不執行遠端命令）和 `-f`（在後台運行）選項：

```bash
ssh -fN -L 8080:remote.example.com:80 user@ssh.example.com
```

## 總結

SSH 隧道是一個非常強大且靈活的工具，它提供了安全地訪問網絡服務、繞過網絡限制以及增強隱私保護的方法。了解並熟練使用不同類型的端口轉發，可以大大提高你的網絡操作效率和安全性。
