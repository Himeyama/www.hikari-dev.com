---
title: 如何安裝 Docker
description: 關於如何安裝 Docker 的備忘錄
authors: hikari
tags: [Docker, 安裝]
image: /img/ogp/2022-06-26-how-to-install-docker.png
---

這篇備忘錄記錄了如何在 Linux（Ubuntu/Debian）上安裝 Docker。

:::info
Docker 是一個開源平台，用於開發、交付和運行應用程式。它允許你將應用程式及其所有依賴項打包到一個稱為容器的標準化單元中，該容器可以在任何地方運行。
:::

## 1. 卸載舊版本 (如果存在)

如果你之前安裝過舊版本的 Docker，建議先將其卸載，以避免潛在的衝突。

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

## 2. 更新套件索引並安裝必要工具

更新 `apt` 套件索引，並安裝一些允許 `apt` 通過 HTTPS 使用儲存庫的必要工具：

```bash
sudo apt-get update
sudo apt-get install 
    ca-certificates 
    curl 
    gnupg 
    lsb-release
```

## 3. 添加 Docker 的官方 GPG 密鑰

為了驗證 Docker 套件的真實性，你需要添加 Docker 的官方 GPG 密鑰：

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

## 4. 設置儲存庫

添加 Docker 儲存庫到你的 `apt` 源列表：

```bash
echo 
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu 
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

:::info
`$(lsb_release -cs)` 會輸出你的 Ubuntu 代號，例如 `focal` (20.04) 或 `jammy` (22.04)。
:::

## 5. 安裝 Docker Engine

再次更新 `apt` 套件索引，然後安裝 Docker Engine、Containerd 和 Docker Compose。

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

## 6. 驗證 Docker 安裝

通過運行 `hello-world` 影像來驗證 Docker Engine 是否正確安裝：

```bash
sudo docker run hello-world
```

如果一切正常，你會看到一條消息，表明 Docker 安裝成功。

## 7. 管理 Docker 作為非 root 用戶 (可選但推薦)

默認情況下，`docker` 命令需要 `sudo` 權限。如果你想作為非 root 用戶運行 Docker 命令，你需要將你的用戶添加到 `docker` 群組。

1.  **創建 `docker` 群組** (如果不存在)：
    ```bash
    sudo groupadd docker
    ```
2.  **將當前用戶添加到 `docker` 群組**：
    ```bash
    sudo usermod -aG docker $USER
    ```
3.  **重新登錄**：
    為了使群組更改生效，你需要註銷並重新登錄，或者重啟你的系統。
    或者，你可以運行 `newgrp docker` 命令，但這只會影響當前會話。

完成後，你可以無需 `sudo` 即可運行 Docker 命令：

```bash
docker run hello-world
```

## 8. 配置 Docker 在啟動時自動運行 (可選)

Docker 通常會自動配置為在系統啟動時運行。你可以檢查其狀態：

```bash
sudo systemctl status docker
```

如果它沒有在啟動時啟用，你可以手動啟用：

```bash
sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

## 總結

通過上述步驟，你可以在 Ubuntu/Debian 系統上成功安裝 Docker Engine 和相關工具。這將使你能夠開始使用容器來打包、部署和運行你的應用程式。記住將你的用戶添加到 `docker` 群組以獲得更方便的體驗。
