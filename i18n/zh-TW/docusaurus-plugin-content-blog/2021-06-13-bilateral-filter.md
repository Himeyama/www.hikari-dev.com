---
title: 使用 ImageMagick 進行雙邊濾波
authors: hikari
tags: [Image Processing, Ruby]
description: 使用 ImageMagick 進行雙邊濾波以美化圖像
date: "2021-6-13"
image: /img/blog/2021-06-13-bilateral-filter/Parrots.jpg
---

嘗試使用 ImageMagick 進行雙邊濾波。
ImageMagick 的安裝方法請參考 [install-magick.html](/blog/2021/06/13/install-magick)

# 指令範例
    magick convert Parrots.jpg -bilateral-blur 10x10 output.png

# 結果
- 輸入圖像

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/Parrots.jpg)

- 輸出圖像

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/output.png)
