---
layout: default
title: youtube-dl のインストールと使い方
date: 2021-05-09
---

## 注意
- 某 Tube からのダウンロードは利用規約に反する場合があること。
- 違法にアップロードされた動画をダウンロードするのは違法であること。
- 私的利用のみにすること。

## pip3 のインストール
```bash
sudo apt update -y && sudo apt install python3-pip -y
```

## youtube-dl のインストール
`apt` 経由でインストールすると、何故かうまくいかなかったりしたので `pip3` でインストールする。

```bash
pip3 install youtube-dl
```

## ダウンロード

youtube-dl が実行できない場合は、パスが通っているか確認する。

```bash
youtube-dl https://xxx.xxxxxxx.xxx/?xxx=xxxxxxxx
[XXXXXXX] xxxxxxxxxxx: Downloading webpage
[download] Destination: xxxxxxxxxxxx.mp4
[download] 100% of 50.00MiB in 00:05
```