---
title: ImageMagick のインストール方法 (Ubuntu)
description: ImageMagick のインストール方法
date: "2021-6-13"
layout: post
---

# ソースのダウンロード

```sh
wget https://download.imagemagick.org/ImageMagick/download/ImageMagick-7.0.11-14.tar.xz
```

# 展開

```sh
tar xf ImageMagick-7.0.11-14.tar.xz
```

# make

```sh
sudo apt update
cd ImageMagick-7.0.11-14.tar.xz
./configure
make -j
sudo make install
sudo ldconfig /usr/local/lib
```
