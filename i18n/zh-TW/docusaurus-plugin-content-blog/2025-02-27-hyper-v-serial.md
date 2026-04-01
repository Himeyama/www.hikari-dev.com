---
title: 如何透過序列埠連線到 Hyper-V 上的 Ubuntu
tags: [Linux, Windows]
image: /img/blog/2025-02-27-hyper-v-serial/image01.png
---

## 虛擬機器設定

選擇「具名管道」，並將管道名稱設定為「COM1」。

![Hyper-V 序列埠設定](/img/blog/2025-02-27-hyper-v-serial/image01.png)

## Ubuntu 設定

### GRUB 設定

使用 `sudo nano /etc/default/grub` 開啟 GRUB 設定檔。

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash console=ttyS0,115200n8"
```

儲存後，執行以下指令套用 GRUB 設定：

```bash
sudo update-grub
```

### 啟用序列埠
設定服務以允許透過序列埠登入。

```bash
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service
```

## 連線

以**系統管理員**身分啟動。

### 從 Tera Term 連線

![從 Tera Term 連線到 Hyper-V 上 Ubuntu 的序列埠](/img/blog/2025-02-27-hyper-v-serial/image02.png)

### 從 PuTTY 連線

以**系統管理員**身分啟動。

|序列線路|速率|連線類型:|
|:--:|:--:|:--:|
|\\.\pipe\COM1|115200|Serial|

設定以上項目。

![從 PuTTY 連線到 Hyper-V 上 Ubuntu 的序列埠](/img/blog/2025-02-27-hyper-v-serial/image05.png)

![從 PuTTY 連線到 Hyper-V 上 Ubuntu 的序列埠](/img/blog/2025-02-27-hyper-v-serial/image04.png)

### 從 plink 連線

以**系統管理員**身分啟動。

![從 Windows Terminal 上的 plink.exe 連線到 Hyper-V 上 Ubuntu 的序列埠](/img/blog/2025-02-27-hyper-v-serial/image03.png)

```ps1
[System.Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
[System.Console]::InputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
plink.exe -serial \\.\pipe\COM1 -sercfg 115200,8,n,1,N
```

按 Ctrl + C 結束。
