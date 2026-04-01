---
title: Raspberry Pi 上的日語環境設置
description: 關於 Raspberry Pi 上的日語環境設置的備忘錄
authors: hikari
tags: [Raspberry Pi, 日語, 環境設置]
image: /img/ogp/2024-03-19-raspberrypi-locale-ja.png
---

這篇備忘錄記錄了在 Raspberry Pi 上設置日語環境的方法。

:::info
在 Raspberry Pi OS (基於 Debian) 上設置日語環境，與在其他 Debian/Ubuntu 系統上的過程類似，但需要注意資源限制和 Raspberry Pi 特有的配置。正確配置後，你可以顯示和輸入日語。
:::

## 1. 設置區域設置 (Locale)

區域設置決定了系統使用的語言、日期時間格式、貨幣符號等。

### A. 打開 Raspberry Pi 配置工具

這是設置區域設置最簡單的方法。

1.  在終端中運行：
    ```bash
    sudo raspi-config
    ```
2.  導航到 `5 Localisation Options` (本地化選項)。
3.  選擇 `L1 Locale`。
4.  在列表中找到 `ja_JP.UTF-8 UTF-8`，按下空白鍵選中它。確保 `en_GB.UTF-8` 或 `en_US.UTF-8` 也被選中。
5.  在下一個屏幕中，選擇 `ja_JP.UTF-8` 作為系統的默認區域設置。
6.  選擇 `L2 Timezone`，並將時區設置為 `Asia/Tokyo`。
7.  完成後，重啟 Raspberry Pi。

### B. 手動配置 (如果 `raspi-config` 無法使用)

如果出於某種原因無法使用 `raspi-config`，你可以手動配置。

1.  **編輯 `locale.gen`**：
    ```bash
    sudo vim /etc/locale.gen
    ```
    查找並取消註釋（刪除前面的 `#`）以下行：
    ```
    ja_JP.UTF-8 UTF-8
    ```
    保存並退出。

2.  **生成區域設置**：
    ```bash
    sudo locale-gen
    ```

3.  **設置系統區域設置**：
    ```bash
    sudo update-locale LANG=ja_JP.UTF-8
    ```
    重啟 Raspberry Pi。

## 2. 安裝日語字體

為了正確顯示日語字符，你需要安裝日語字體。

```bash
sudo apt update
sudo apt install fonts-noto-cjk fonts-ipafont fonts-ipaexfont
```
-   `fonts-noto-cjk`：Google 的 Noto CJK 字體，支持中文、日文、韓文，推薦。
-   `fonts-ipafont`：IPA 明朝/哥特體字體。
-   `fonts-ipaexfont`：IPAEX 明朝/哥特體字體。

安裝後，可以通過 Raspberry Pi OS 的桌面環境中的「設定」->「外觀」或「字體」來檢查和配置。

## 3. 安裝日語輸入法 (Fcitx + Mozc)

Fcitx 和 Mozc 是在 Linux 環境中最常用且效果最好的日語輸入法組合。

1.  **安裝 Fcitx 和 Mozc**：
    ```bash
    sudo apt install fcitx fcitx-mozc
    ```

2.  **設置 Fcitx 為默認輸入法框架**：
    ```bash
    im-config
    ```
    在彈出的界面中，選擇 `fcitx` 作為默認輸入法。

3.  **配置 Fcitx**：
    -   重啟 Raspberry Pi。
    -   登錄後，打開 Fcitx 配置工具 (在應用程式菜單中搜索「Fcitx Configuration」或運行 `fcitx-configtool`)。
    -   在「Input Method」選項卡中，點擊左下角的「+」按鈕。
    -   取消勾選「Only Show Current Language」，然後搜索「Mozc」並添加它。
    -   將 Mozc 移動到列表的頂部或你偏好的位置。

4.  **切換輸入法**：
    通常默認的輸入法切換快捷鍵是 `Ctrl + Space` 或 `Shift + Space`。你可以在 Fcitx 配置工具中修改它。

## 4. 終端中的日語支持

確保你的終端模擬器（如 LXTerminal）使用支持 UTF-8 的字體，並且其編碼設置為 UTF-8。通常，在 Raspberry Pi OS 上，這些都是默認配置。

## 5. 總結

在 Raspberry Pi 上設置日語環境是一個相對簡單的過程，主要通過 `raspi-config` 工具來完成區域設置，然後安裝必要的字體和輸入法（Fcitx + Mozc）。完成這些步驟後，你的 Raspberry Pi 將能夠正確顯示和處理日語文本。
