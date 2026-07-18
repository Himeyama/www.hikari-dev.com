---
title: 安裝 Firefox 建置版本
tags: [Web]
image: /img/ogp/2022-04-27-install-binary-firefox.webp
---

Ubuntu 22.04 似乎預設安裝了 snap 版本的 Firefox，在某些環境下無法啟動，因此記錄如何安裝預先建置的 Firefox。

## 移除 apt / snap 版本的 Firefox
```bash
sudo apt purge firefox
sudo snap remove firefox
```

## 安裝 Firefox 建置版本

```bash
# 下載
wget "https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=ja" --trust-server-names

# 解壓縮
tar xvf firefox-*.tar.bz2

# 安裝
sudo cp -r firefox /usr/lib

# 建立執行檔的符號連結
sudo ln -s /usr/lib/firefox/firefox /usr/bin/firefox

# 下載並放置桌面捷徑檔案
sudo mkdir -p /usr/share/applications
sudo wget https://bit.ly/3Mwigwx -O /usr/share/applications/firefox.desktop
```
