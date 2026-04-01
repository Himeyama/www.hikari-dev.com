---
title: 在 AlmaLinux 10 (Raspberry Pi 5 / GNOME / aarch64) 上安裝 Mozc 的方法
authors: hikari
tags: [Linux]
image: /img/ogp/2025-10-21-almalinux-mozc.png
---

## 下載 rpm 檔案
- mozc
- mozc-gui-tools
- ibus-mozc

請搜尋上述套件，並從 [rpmfind.net](https://www.rpmfind.net/) 下載。

確認架構是否正確。
- Raspberry Pi 5 則為 aarch64
- 一般 PC 則為 x86_64

### rpm 檔案範例
- mozc-2.31.5810.102-160000.1.2.aarch64.rpm
- mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm
- ibus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm

## 安裝
指定下載的 rpm 檔案，使用 dnf 指令安裝。

```sh
cd ~/Downloads
sudo dnf install ./mozc-2.31.5810.102-160000.1.2.aarch64.rpm ./mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm ./ibus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm
```

## 登出
先登出一次。

## 設定
打開「設定」→「鍵盤」，然後按此順序新增：

- Japanese (Mozc)
- Japanese

設定完成！