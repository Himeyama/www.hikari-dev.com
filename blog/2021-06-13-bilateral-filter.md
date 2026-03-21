---
title: ImageMagick でバイラテラルフィルター
authors: hikari
tags: [Image Processing, Ruby]
description: ImageMagick でバイラテラルフィルターをかけて画像をきれいにする
date: "2021-6-13"
---

ImageMagick でバイラテラルフィルターをかける試み。
ImageMagick のインストール方法は [install-magick.html](/blog/2021/06/13/install-magick)

# コマンド例
    magick convert Parrots.jpg -bilateral-blur 10x10 output.png

# 結果
- 入力画像

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/Parrots.jpg)

- 出力画像

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/output.png)
