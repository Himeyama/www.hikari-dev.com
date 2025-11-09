---
title: youtube-dl のインストールと使い方
date: 2021-05-09
authors: hikari
---

## 注意
- Downloading from certain Tube sources may violate the terms of service.
- Downloading videos that have been illegally uploaded is illegal.
- For private use only.

## pip3 のインストール
```bash
sudo apt update -y && sudo apt install python3-pip -y
```

## youtube-dl のインストール
I had trouble installing it via `apt` for some reason, so I'm installing it with `pip3`.

```bash
pip3 install youtube-dl
```

## ダウンロード

If youtube-dl is not executable, check if the path is in your environment.

```bash
youtube-dl https://xxx.xxxxxxx.xxx/?xxx=xxxxxxxx
[XXXXXXX] xxxxxxxxxxx: Downloading web page
[download] Destination: xxxxxxxxxxxx.mp4
[download] 100% of 50.00MiB in 00:05
```