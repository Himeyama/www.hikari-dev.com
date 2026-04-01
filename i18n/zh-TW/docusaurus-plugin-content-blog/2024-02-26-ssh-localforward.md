---
title: SSH Local Forward 備忘錄
description: 關於 SSH Local Forward 的備忘錄
authors: hikari
tags: [SSH, 隧道, 本地轉發]
image: /img/ogp/2024-02-26-ssh-localforward.png
---

這篇備忘錄記錄了 SSH Local Forward。

:::info
SSH Local Forward (本地端口轉發) 是一種 SSH 隧道技術，它允許你將本地機器上的一個端口的流量，通過 SSH 連接轉發到遠端 SSH 伺服器可訪問的另一個目標主機和端口。
:::

這通常用於訪問防火牆後面的服務，或者在本地開發環境中模擬對遠端服務的訪問。

## 1. SSH Local Forward 的原理

當你設置一個本地端口轉發時：

1.  SSH 客戶端（你的本地機器）會在本地監聽一個指定的端口。
2.  當有流量發送到這個本地端口時，SSH 客戶端會將這些流量通過已建立的 SSH 加密連接發送到遠端 SSH 伺服器。
3.  遠端 SSH 伺服器接收到這些流量後，會將它們轉發到指定的目標主機和端口。
4.  目標主機處理請求並將響應發回遠端 SSH 伺服器。
5.  遠端 SSH 伺服器將響應通過 SSH 連接傳回本地 SSH 客戶端。
6.  本地 SSH 客戶端將響應發送回最初發起請求的本地應用程式。

**流程簡圖：**

```
本地應用 (localhost:LPORT) <---SSH隧道---> 本地SSH客戶端 ---加密通道---> 遠端SSH伺服器 ---非加密通道---> 目標主機:TPORT
```

## 2. 語法

```bash
ssh -L [本地端口]:[目標主機]:[目標端口] [SSH用戶]@[SSH伺服器]
```

-   `-L`：指定本地端口轉發。
-   `[本地端口]`：你本地機器上將要監聽的端口號。任何發送到 `localhost:[本地端口]` 的流量都將被轉發。
-   `[目標主機]`：遠端 SSH 伺服器能夠訪問的目標主機的 IP 地址或域名。
-   `[目標端口]`：目標主機上服務的端口號。
-   `[SSH用戶]`：用於登錄遠端 SSH 伺服器的用戶名。
-   `[SSH伺服器]`：遠端 SSH 伺服器的 IP 地址或域名。

## 3. 範例

### 範例 1：訪問防火牆後的遠端 Web 服務

假設：
-   你的本地機器無法直接訪問 `remote-web-server.com` 的 80 端口。
-   你有一台可以訪問 `remote-web-server.com` 的 SSH 伺服器 (`ssh.example.com`)。
-   你希望通過本地的 `localhost:8080` 訪問 `remote-web-server.com` 的 Web 服務。

命令：

```bash
ssh -L 8080:remote-web-server.com:80 user@ssh.example.com
```

執行此命令後，當你在本地瀏覽器中訪問 `http://localhost:8080` 時，你的請求會通過 `ssh.example.com` 轉發到 `remote-web-server.com` 的 80 端口。

### 範例 2：安全地訪問遠端資料庫

假設：
-   你本地機器無法直接訪問遠端資料庫伺服器 `db.example.com` 的 5432 端口 (PostgreSQL)。
-   你有一台可以訪問該資料庫伺服器的 SSH 伺服器 (`ssh.example.com`)。
-   你希望通過本地的 `localhost:54320` 連接到遠端資料庫。

命令：

```bash
ssh -L 54320:db.example.com:5432 user@ssh.example.com
```

執行此命令後，你可以配置你的本地資料庫客戶端（如 `psql` 或 DBeaver）連接到 `localhost:54320`，你的連接將安全地通過 SSH 隧道轉發到遠端資料庫。

### 範例 3：在後台運行隧道

如果你希望 SSH 隧道在後台運行，並且不執行遠端命令，可以使用 `-N` (不執行遠端命令) 和 `-f` (在後台運行) 選項。

```bash
ssh -fN -L 8080:remote-web-server.com:80 user@ssh.example.com
```

要停止這個後台運行的隧道，你需要找到 SSH 進程並終止它。

### 範例 4：訪問 SSH 伺服器本身的服務

如果你想訪問 SSH 伺服器上運行的服務，`[目標主機]` 可以是 `localhost` 或 `127.0.0.1`。

```bash
ssh -L 8000:localhost:8000 user@ssh.example.com
```

這將允許你通過本地的 `localhost:8000` 訪問 `ssh.example.com` 上運行的 8000 端口服務。

## 4. 安全注意事項

-   **身份驗證**：確保你的 SSH 連接是安全的，最好使用公鑰認證而不是密碼。
-   **本地端口選擇**：選擇一個未被佔用且高於 1024 的端口作為本地端口（非特權用戶無法綁定 1024 以下的端口）。
-   **目標主機可訪問性**：`[目標主機]` 必須是遠端 SSH 伺服器能夠訪問的主機。

## 總結

SSH Local Forward 是一個非常強大且常用的功能，它提供了一種安全、靈活的方式來訪問網絡受限的遠端服務。無論是繞過防火牆、訪問內部網絡服務還是本地開發，了解並熟練使用本地端口轉發都能極大地提高你的工作效率和安全性。
