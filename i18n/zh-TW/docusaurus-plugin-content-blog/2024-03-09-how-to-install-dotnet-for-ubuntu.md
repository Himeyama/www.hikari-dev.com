---
title: 如何為 Ubuntu 安裝 .NET
description: 關於如何為 Ubuntu 安裝 .NET 的備忘錄
authors: hikari
tags: [.NET, Ubuntu, 安裝]
image: /img/ogp/2024-03-09-how-to-install-dotnet-for-ubuntu.png
---

這篇備忘錄記錄了如何為 Ubuntu 安裝 .NET。

:::info
.NET 是一個免費、開源的開發平台，用於構建各種應用程式，包括 Web、移動、桌面、遊戲和物聯網。在 Ubuntu 上安裝 .NET 可以讓你開發和運行 .NET 應用程式。
:::

## 1. 預覽 .NET 版本

在安裝之前，建議查看可用的 .NET SDK 和運行時版本，以選擇你需要的版本。

訪問官方 .NET 下載頁面：[https://dotnet.microsoft.com/download/dotnet](https://dotnet.microsoft.com/download/dotnet)

通常你會看到 LTS (長期支持) 版本和 Current (當前) 版本。對於生產環境，通常建議使用 LTS 版本。

## 2. 安裝 .NET SDK (推薦)

安裝 SDK 會同時包含運行時 (Runtime)，這對於開發和運行應用程式都是必要的。

### A. 註冊 Microsoft 套件儲存庫

Microsoft 提供了一個套件儲存庫，以便你可以使用 `apt` 包管理器輕鬆安裝 .NET。

1.  **安裝必要工具**：
    ```bash
    sudo apt update
    sudo apt install -y apt-transport-https ca-certificates curl
    ```

2.  **下載並註冊 Microsoft 簽名密鑰**：
    ```bash
    curl -fSsL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/microsoft.gpg > /dev/null
    ```

3.  **添加 Microsoft 套件儲存庫**：
    根據你的 Ubuntu 版本，選擇對應的命令。
    例如，對於 Ubuntu 22.04 (Jammy Jellyfish)：
    ```bash
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/trusted.gpg.d/microsoft.gpg] https://packages.microsoft.com/ubuntu/22.04/prod $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/dotnet.list
    ```
    將 `22.04` 替換為你的 Ubuntu 版本號。`$(lsb_release -cs)` 會自動獲取你的 Ubuntu 代號。

### B. 安裝 .NET SDK

1.  **更新套件列表**：
    ```bash
    sudo apt update
    ```

2.  **安裝 SDK**：
    安裝最新 LTS 版本的 .NET SDK。
    ```bash
    sudo apt install -y dotnet-sdk-8.0 # 安裝 .NET 8 SDK
    ```
    如果你想安裝特定版本，例如 .NET 6 SDK，可以使用 `dotnet-sdk-6.0`。

### C. 驗證安裝

```bash
dotnet --version
```
這應該會顯示已安裝的 .NET SDK 版本。

## 3. 安裝 .NET Runtime (如果只需運行應用程式)

如果你只打算運行使用 .NET 開發的應用程式，而不需要開發，可以只安裝運行時。

### A. 安裝 ASP.NET Core Runtime

```bash
sudo apt install -y aspnetcore-runtime-8.0 # 安裝 .NET 8 ASP.NET Core Runtime
```

### B. 安裝 .NET Runtime (標準版)

```bash
sudo apt install -y dotnet-runtime-8.0 # 安裝 .NET 8 Runtime
```

## 4. 其他安裝方法

### A. 手動安裝

你可以從 .NET 官方網站下載二進制發行版並手動解壓縮到你喜歡的位置。

1.  **下載**：從 [dotnet.microsoft.com/download](https://dotnet.microsoft.com/download) 下載 Linux x64 二進制文件。
2.  **解壓縮**：將下載的文件解壓縮到一個目錄，例如 `~/dotnet`。
3.  **設置環境變量**：將 `~/dotnet` 添加到 `PATH`。
    ```bash
    export DOTNET_ROOT=$HOME/dotnet
    export PATH=$PATH:$HOME/dotnet
    ```
    將這些行添加到 `~/.bashrc` 或 `~/.zshrc` 以便永久生效。

### B. 使用 Snap (不推薦，可能不是最新版)

對於某些 Ubuntu 版本，你可以使用 Snap 安裝 .NET，但通常不推薦，因為 Snap 提供的版本可能不是最新的，或者與 `apt` 儲存庫的版本存在兼容性問題。

```bash
sudo snap install dotnet-sdk --classic --channel=8.0/stable # 安裝 .NET 8 SDK
```

## 5. 總結

在 Ubuntu 上安裝 .NET 最推薦的方法是通過 Microsoft 的 `apt` 套件儲存庫。這確保了你可以方便地獲取最新更新和安全補丁。無論你是開發者還是應用程式用戶，正確安裝 .NET 都能讓你充分利用這個強大的平台。
