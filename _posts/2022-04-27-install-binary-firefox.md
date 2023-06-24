---
title: Firefox のビルドをインストール
tags: [Ubuntu, Ubuntu 22.04, Firefox]
---

Ubuntu 22.04 は snap 版の Firefox がインストールされているらしく、
環境によって起動ができなかったので、ビルド済み Firefox のインストールの方法をメモ。

## apt / snap 版の Firefox のアンインストール
```bash
sudo apt purge firefox
sudo snap remove firefox
```

## Firefox のビルドをインストール

```bash
# ダウンロード
wget "https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=ja" --trust-server-names

# 展開
tar xvf firefox-*.tar.bz2

# 配置
sudo cp -r firefox /usr/lib

# 実行ファイルのシンボリックリンクを作成
sudo ln -s /usr/lib/firefox/firefox /usr/bin/firefox

# デスクトップファイルをダウンロードし配置
sudo mkdir -p /usr/share/applications
sudo wget https://bit.ly/3Mwigwx -O /usr/share/applications/firefox.desktop
```