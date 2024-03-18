---
layout: post
tags: [RaspberryPi, 日本語化]
toc: true
title: RaspberryPi のプロンプトを日本語化する方法
---

Raspberry Pi のプロンプトを日本語化する方法を紹介します。

## 1. ロケールの設定

日本語のロケールを設定します。以下のコマンドを実行します。

1. スペースで以下のようにチェックを入れ OK する
2. ja_JP.UTF-8 を選択し OK する

```bash
sudo dpkg-reconfigure locales

# [*] ja_JP.UTF-8 UTF-8
```

## 2. 再起動

再起動します。

```bash
sudo reboot
```

以上。
