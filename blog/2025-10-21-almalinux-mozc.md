---
title: AlmaLinux 10 (Raspberry Pi 5 / GNOME / aarch64) に Mozc をインストールする方法
authors: hikari
tags: [Linux]
image: /img/ogp/2025-10-21-almalinux-mozc.png
---

## rpm ファイルをダウンロード
- mozc
- mozc-gui-tools
- ibus-mozc

を検索し、[rpmfind.net](https://www.rpmfind.net/) から検索してダウンロードする。

アーキテクチャが正しいかを確かめる。
- Raspberry Pi 5 の場合は、aarch64
- 一般的な PC の場合は、x86_64

### rpm ファイルの例
- mozc-2.31.5810.102-160000.1.2.aarch64.rpm
- mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm
- ibus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm

## インストール
ダウンロードした rpm ファイルを指定し、dnf コマンドでインストールする。

```sh
cd ~/Downloads
sudo dnf install ./mozc-2.31.5810.102-160000.1.2.aarch64.rpm ./mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm ./ibus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm
```

## ログアウト
一旦ログアウトする。

## 設定
「設定」→「キーボード」を開き、

- Japanese (Mozc)
- Japanese

の順に登録。

設定完了！