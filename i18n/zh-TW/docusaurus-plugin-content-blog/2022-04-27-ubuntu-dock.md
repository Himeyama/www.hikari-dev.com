---
title: Ubuntu 上的 Dock
description: 關於 Ubuntu 上的 Dock 的備忘錄
authors: hikari
tags: [Ubuntu, Dock]
image: /img/ogp/2022-04-27-ubuntu-dock.webp
---

這篇備忘錄記錄了 Ubuntu 上的 Dock。

:::info
Ubuntu 的 Dock（也稱為啟動器或側邊欄）是 GNOME 桌面環境中的一個組件，它通常位於屏幕的左側，用於快速啟動應用程式和管理當前正在運行的窗口。
:::

## 1. Dock 的基本操作

-   **啟動應用程式**：點擊 Dock 上的應用程式圖標即可啟動。
-   **切換窗口**：如果應用程式有多個窗口，點擊圖標會顯示所有窗口的縮略圖，你可以選擇要切換的窗口。
-   **添加/移除應用程式**：
    -   **添加到 Dock**：右鍵點擊 Dock 上正在運行的應用程式圖標，然後選擇「加入最愛」。
    -   **從 Dock 移除**：右鍵點擊 Dock 上的應用程式圖標，然後選擇「從最愛移除」。
-   **拖放**：你可以將應用程式圖標拖放到 Dock 上進行重新排序。

## 2. 配置 Dock

Ubuntu 提供了多種方式來配置 Dock 的行為和外觀。

### A. 使用「設定」應用程式

這是最簡單直觀的方法。

1.  打開 **設定**。
2.  導航到 **外觀** (或在舊版本中是 **Dock**)。
3.  你可以配置以下選項：
    -   **Dock 位置**：將 Dock 放置在屏幕的左側、底部或右側。
    -   **Dock 大小**：調整 Dock 圖標的大小。
    -   **自動隱藏 Dock**：當窗口最大化或接近 Dock 時，自動隱藏 Dock。
    -   **顯示個人主目錄、磁碟機等**：選擇是否在 Dock 上顯示可移動媒體和網絡卷。
    -   **顯示應用程式菜單**：在 Dock 上顯示應用程式菜單按鈕。

### B. 使用 GNOME Tweaks 工具 (推薦用於更多自定義)

GNOME Tweaks（以前稱為 GNOME Tweak Tool）提供了更多進階的選項來自定義 GNOME 桌面環境，包括 Dock。

1.  **安裝 GNOME Tweaks**：
    ```bash
    sudo apt install gnome-tweaks
    ```
2.  **啟動 GNOME Tweaks**：
    在應用程式菜單中搜索「Tweaks」或在終端中運行 `gnome-tweaks`。
3.  **配置 Dock**：
    導航到「Extensions」（擴展），找到「Dash to Dock」擴展（如果已安裝，Ubuntu 默認的 Dock 實際上是 Dash to Dock 的一個變體）。
    在這裡，你可以找到更多控制 Dock 行為的選項，例如：
    -   **智能隱藏**：更精細的自動隱藏控制。
    -   **應用程式圖標行為**：點擊應用程式圖標時的行為。
    -   **自定義 Dock 主題**：更改 Dock 的視覺樣式。

### C. 使用命令行 (gsettings)

對於更精確的控制或腳本化配置，你可以使用 `gsettings` 命令。

範例：
-   將 Dock 放置在底部：
    ```bash
    gsettings set org.gnome.shell.extensions.dash-to-dock dock-position 'BOTTOM'
    ```
-   設置 Dock 圖標大小：
    ```bash
    gsettings set org.gnome.shell.extensions.dash-to-dock dash-max-icon-size 32
    ```
-   啟用自動隱藏：
    ```bash
    gsettings set org.gnome.shell.extensions.dash-to-dock autohide true
    ```

要查看所有可用的 Dash to Dock 設置：

```bash
gsettings list-keys org.gnome.shell.extensions.dash-to-dock
```

## 總結

Ubuntu 的 Dock 是其桌面體驗不可或缺的一部分，它提供了方便的應用程式啟動和窗口管理功能。通過內置的「設定」應用程式、GNOME Tweaks 工具或命令行 `gsettings`，你可以根據自己的喜好靈活地自定義 Dock 的外觀和行為。
