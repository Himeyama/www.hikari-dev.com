---
title: ImageMagick でバイラテラルフィルター
description: ImageMagick でバイラテラルフィルターをかけて画像をきれいにする
date: "2021-6-13"
layout: default
---

ImageMagick でバイラテラルフィルターをかける試み。
ImageMagick のインストール方法は [install-magick.html](install-magick.html)

# コマンド例
    magick convert Parrots.jpg -bilateral-blur 10x10 output.png

# 結果
- 入力画像

    ![Parrots](/assets/img/magick-bilateral/Parrots.jpg)

- 出力画像

    ![Parrots](/assets/img/magick-bilateral/output.png)

