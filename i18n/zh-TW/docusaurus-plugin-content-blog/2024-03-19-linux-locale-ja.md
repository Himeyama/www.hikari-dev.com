---
title: Linux 上的日語環境設置
description: 關於 Linux 上的日語環境設置的備忘錄
authors: hikari
tags: [Linux, 日語, 環境設置]
image: /img/ogp/2024-03-19-linux-locale-ja.webp
---

這篇備忘錄記錄了在 Linux 上設置日語環境的方法。

:::info
在 Linux 系統中設置日語環境（包括語言、輸入法和字體）對於需要處理日語文本或開發日語應用程式的用戶來說至關重要。這確保了系統能夠正確顯示日語字符，並允許用戶使用日語輸入法。
:::

## 1. 設置區域設置 (Locale)

區域設置決定了系統使用的語言、日期時間格式、貨幣符號等。

### A. 查看當前區域設置

```bash
locale
```

### B. 生成日語區域設置

如果你的系統中沒有日語區域設置，你需要生成它。

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

### C. 設置系統區域設置

你可以將系統的默認區域設置設置為日語。

```bash
sudo update-locale LANG=ja_JP.UTF-8
```

或者，對於基於 Systemd 的系統：

```bash
sudo localectl set-locale LANG=ja_JP.UTF-8
```

重啟系統或重新登錄以應用更改。

## 2. 安裝日語輸入法

最流行的日語輸入法是 Fcitx 和 Mozc。

### A. 安裝 Fcitx 和 Mozc

1.  **安裝 Fcitx 輸入法框架**：
    ```bash
    sudo apt install fcitx fcitx-mozc fcitx-ui-classic fcitx-frontend-gtk2 fcitx-frontend-gtk3 fcitx-frontend-qt5
    ```
    （對於基於 Debian/Ubuntu 的系統）

2.  **配置 Fcitx**：
    -   打開「設定」 -> 「地區和語言」(或類似名稱)。
    -   在「輸入來源」中，將 Fcitx 添加為輸入法系統。
    -   重啟系統。

3.  **啟用 Mozc**：
    -   重新登錄後，啟動 Fcitx 配置工具 (在應用程式菜單中搜索「Fcitx Configuration」)。
    -   在「Input Method」選項卡中，點擊左下角的「+」按鈕。
    -   取消勾選「Only Show Current Language」，然後搜索「Mozc」並添加它。
    -   將 Mozc 移動到列表的頂部或你偏好的位置。

4.  **切換輸入法**：
    通常默認的輸入法切換快捷鍵是 `Ctrl + Space` 或 `Shift + Space`。

### B. 安裝 IBus 和 Anthy/Mozc (另一種選擇)

IBus 是另一個流行的輸入法框架。

1.  **安裝 IBus 和 Mozc/Anthy**：
    ```bash
    sudo apt install ibus ibus-mozc # 或 ibus-anthy
    ```

2.  **配置 IBus**：
    -   打開「設定」 -> 「地區和語言」。
    -   在「輸入來源」中，添加「日語 (Mozc)」或「日語 (Anthy)」。
    -   重啟系統。

## 3. 安裝日語字體

為了正確顯示日語字符，你需要安裝日語字體。

### A. 安裝常見的日語字體

```bash
sudo apt install fonts-noto-cjk fonts-ipafont fonts-japanese-gothic fonts-japanese-mincho
```
-   `fonts-noto-cjk`：Google 的 Noto CJK 字體，支持中文、日文、韓文，推薦。
-   `fonts-ipafont`：IPA 明朝/哥特體字體。

### B. 配置字體 (可選)

在 GNOME 環境中，你可以通過「設定」->「外觀」->「字體」來更改系統默認字體。或者使用 GNOME Tweaks 工具進行更細緻的調整。

## 4. 終端中的日語支持

### A. 檢查終端編碼

大多數現代終端模擬器都支持 UTF-8 編碼，這對於顯示日語字符是必要的。

```bash
echo $LANG
```
確保輸出包含 `UTF-8`。

### B. 安裝日語 man page (可選)

如果你想查看日語版本的 `man` 手冊頁：

```bash
sudo apt install manpages-ja
```

## 5. 總結

在 Linux 上設置日語環境需要配置區域設置、安裝輸入法和字體。通過 Fcitx + Mozc 或 IBus + Mozc 的組合，你可以獲得一個功能齊全的日語輸入環境。安裝 Noto CJK 或 IPA 字體將確保日語字符的正確顯示。
