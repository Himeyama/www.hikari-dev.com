---
title: Applying a Bilateral Filter with ImageMagick
authors: hikari
description: Use ImageMagick's bilateral filter to clean up images
date: "2021-6-13"
---

An attempt to apply a bilateral filter using ImageMagick.
For installation instructions for ImageMagick, see [install-magick.html](/blog/2021/06/13/install-magick)

# Example command
    magick convert Parrots.jpg -bilateral-blur 10x10 output.png

# Results
- Input image

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/Parrots.jpg)

- Output image

    ![Parrots](/img/blog/2021-06-13-bilateral-filter/output.png)
