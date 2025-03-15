---
layout: post
tags: [Linux, Debian, Ubuntu, WSL2, 日本語化]
toc: true
title: Linux プロンプトを日本語化する方法
---

Linux のプロンプトを日本語化する方法を紹介します。

## 1. 日本語ロケールのインストール

次に、日本語のロケールが存在しない場合は、それをインストールします。以下のコマンドを実行します。

```bash
sudo apt update
sudo apt install language-pack-ja
```

## 2. ロケールの設定

日本語のロケールを設定します。以下のコマンドを実行します。

```bash
sudo update-locale LANG=ja_JP.UTF8
```

## 3. システムの再起動

最後に、システムを再起動します。これにより、新しいロケール設定が反映されます。

```bash
sudo reboot
```

以上で、Linux プロンプトが日本語化されます。
