---
title: Installing ImageMagick (Ubuntu)
description: How to install ImageMagick
date: "2021-6-13"
---

# Download the source
```sh
wget https://download.imagemagick.org/ImageMagick/download/ImageMagick-7.0.11-14.tar.xz
```

# Extract
```sh
tar xf ImageMagick-7.0.11-14.tar.xz
```

# Make
```sh
sudo apt update
cd ImageMagick-7.0.11-14.tar.xz
./configure
make -j
sudo make install
sudo ldconfig /usr/local/lib
```