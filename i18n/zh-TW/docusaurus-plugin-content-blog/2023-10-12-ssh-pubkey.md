---
title: SSH 公鑰認證
description: 關於 SSH 公鑰認證的備忘錄
authors: hikari
tags: [SSH, 安全]
image: /img/ogp/2023-10-12-ssh-pubkey.webp
---

這篇備忘錄記錄了 SSH 公鑰認證。

:::info
SSH (Secure Shell) 公鑰認證是一種比密碼認證更安全、更便捷的遠端登錄方式。它使用非對稱加密（公鑰和私鑰對）來驗證用戶身份，無需每次都輸入密碼。
:::

## 1. 原理

SSH 公鑰認證涉及兩部分：

-   **私鑰 (Private Key)**：保存在你的本地電腦上，是秘密的，**絕對不能洩露**。
-   **公鑰 (Public Key)**：放置在你要連接的遠端伺服器上，可以公開分享。

當你嘗試連接遠端伺服器時：
1.  客戶端向伺服器發送連接請求，並提供你的用戶名和公鑰 ID。
2.  伺服器檢查其 `~/.ssh/authorized_keys` 文件中是否有匹配的公鑰。
3.  如果找到匹配的公鑰，伺服器會生成一個隨機字串，並使用該公鑰加密。
4.  伺服器將加密後的字串發送回客戶端。
5.  客戶端使用其私鑰解密該字串，並將解密後的內容發送回伺服器。
6.  伺服器將收到的解密內容與其原始隨機字串進行比較。如果匹配，則表示客戶端擁有正確的私鑰，驗證成功，允許登錄。

## 2. 設置步驟

### A. 生成 SSH 密鑰對 (在本地電腦上)

1.  打開終端 (Linux/macOS) 或 Git Bash/WSL (Windows)。
2.  運行 `ssh-keygen` 命令。

    ```bash
    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
    ```
    -   `-t rsa`：指定生成 RSA 算法的密鑰。
    -   `-b 4096`：指定密鑰長度為 4096 位 (建議長度，比默認的 2048 位更安全)。
    -   `-C "your_email@example.com"`：添加註釋，通常是你的電子郵件地址，便於識別。

3.  系統會提示你輸入文件儲存位置。默認通常是 `~/.ssh/id_rsa`。直接按 Enter 即可使用默認路徑。
4.  系統會提示你輸入密碼 (passphrase)。強烈建議設置一個密碼，這會為你的私鑰提供額外的保護。每次使用私鑰時都需要輸入此密碼。如果你不希望每次都輸入密碼，可以留空（不推薦）。

生成成功後，你會在 `~/.ssh/` 目錄下看到兩個文件：
-   `id_rsa`：你的私鑰 (Private Key)。
-   `id_rsa.pub`：你的公鑰 (Public Key)。

### B. 將公鑰複製到遠端伺服器

有兩種主要方法：

#### i. 使用 `ssh-copy-id` (推薦)

`ssh-copy-id` 是一個非常方便的工具，它會自動將你的公鑰複製到遠端伺服器的 `~/.ssh/authorized_keys` 文件中。

```bash
ssh-copy-id user@remote_host
```
-   `user`：你在遠端伺服器上的用戶名。
-   `remote_host`：遠端伺服器的 IP 地址或域名。

系統會提示你輸入遠端伺服器的密碼（第一次連接時），然後它會完成其餘的工作。

#### ii. 手動複製

如果你無法使用 `ssh-copy-id`，可以手動複製公鑰。

1.  **在本地查看公鑰內容**：
    ```bash
    cat ~/.ssh/id_rsa.pub
    ```
    複製完整的輸出內容（從 `ssh-rsa` 開始到你的電子郵件地址結束）。

2.  **連接到遠端伺服器** (使用密碼或已有的其他認證方式)。
    ```bash
    ssh user@remote_host
    ```

3.  **在遠端伺服器上創建 `.ssh` 目錄** (如果不存在) 並設置正確的權限。
    ```bash
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    ```

4.  **將公鑰添加到 `authorized_keys` 文件**：
    ```bash
    echo "你的公鑰內容" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
    ```
    將 `"你的公鑰內容"` 替換為你在步驟 1 中複製的公鑰字串。

5.  **設置 `authorized_keys` 文件的權限**：
    ```bash
    chmod 600 ~/.ssh/authorized_keys
    ```
    正確的權限非常重要，否則 SSH 服務器會拒絕使用該文件。

### C. 測試連接

設置完成後，嘗試使用 SSH 連接到遠端伺服器：

```bash
ssh user@remote_host
```

如果一切順利，系統會提示你輸入私鑰的密碼 (如果你設置了)，然後你就可以成功登錄而無需輸入遠端伺服器的用戶密碼。

## 3. SSH Agent (可選)

如果你設置了私鑰密碼，每次連接時都會被提示輸入。SSH Agent 可以幫助你解決這個問題。它是一個程序，在記憶體中保存你的解密私鑰，這樣你在一個會話中只需輸入一次密碼。

```bash
eval "$(ssh-agent -s)" # 啟動 ssh-agent
ssh-add ~/.ssh/id_rsa # 添加私鑰 (會提示輸入密碼)
```

## 4. 禁用密碼認證 (推薦)

為了進一步提高安全性，一旦確認公鑰認證正常工作，你可以在遠端伺服器的 SSH 配置中禁用密碼認證。

1.  **在遠端伺服器上編輯 SSH 服務器配置文件**：
    ```bash
    sudo vim /etc/ssh/sshd_config
    ```

2.  **查找並修改以下行**：
    ```
    PasswordAuthentication no
    ```
    （確保前面沒有 `#` 注釋符號）

3.  **重啟 SSH 服務**：
    ```bash
    sudo systemctl restart sshd # 或 sudo service ssh restart
    ```

## 總結

SSH 公鑰認證是遠端伺服器管理的基本安全實踐。它提供了更高的安全性、便利性和自動化潛力。遵循這些步驟，你可以輕鬆地為你的伺服器設置公鑰認證，並享受更安全高效的遠端連接。
