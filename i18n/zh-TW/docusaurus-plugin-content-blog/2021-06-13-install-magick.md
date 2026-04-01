---
title: 安裝 ImageMagick
description: 安裝 ImageMagick 的筆記
authors: hikari
tags: [ImageMagick, Ubuntu]
image: /img/ogp/2021-06-13-install-magick.png
---

這篇筆記記錄了在 Ubuntu 上安裝 ImageMagick 的方法。

:::info
ImageMagick 是一個開源的軟體套件，用於創建、編輯、組合或轉換點陣圖影像。它支持多種影像格式，包括 PNG、JPEG、GIF、TIFF 和 PDF。
:::

## 安裝步驟

### 1. 更新套件列表

在安裝任何新軟體之前，最好先更新系統的套件列表：

```bash
sudo apt update
sudo apt upgrade
```

### 2. 安裝 ImageMagick

直接使用 `apt` 命令安裝 ImageMagick：

```bash
sudo apt install imagemagick
```

這會安裝 ImageMagick 的核心工具和庫。如果你還需要開發庫，可以安裝 `imagemagick-dev`：

```bash
sudo apt install imagemagick-dev
```

### 3. 驗證安裝

安裝完成後，你可以通過檢查 ImageMagick 的版本來驗證是否成功：

```bash
convert --version
```

或

```bash
magick --version
```

你應該會看到類似以下的輸出：

```
Version: ImageMagick 6.9.10-23 Q16 x86_64 20190101 https://imagemagick.org
Copyright: © 1999-2019 ImageMagick Studio LLC
License: https://imagemagick.org/script/license.php
Features: DPC HDRI OpenMP
Delegates (built-in): bzlib djvu fftw fontconfig freetype gslib heic jbig jng jpeg lcms lqr ltdl lzma openexr pangocairo png raw rsvg tiff webp wmf x xml zlib
```

### 4. 基本使用範例

將 JPEG 影像轉換為 PNG 格式：

```bash
convert input.jpg output.png
```

調整影像大小：

```bash
convert input.jpg -resize 50% output_resized.jpg
```

添加文字到影像：

```bash
convert input.jpg -gravity South -pointsize 36 -fill white -annotate 0 'Hello, ImageMagick!' output_text.jpg
```

## 常見問題和故障排除

- **權限問題**：如果你在執行 ImageMagick 命令時遇到權限錯誤，請確保你對輸入和輸出文件有讀寫權限。
- **文件格式不支持**：如果轉換失敗，可能是因為缺少某些文件格式的支援。檢查 `convert --version` 的輸出中的 "Delegates" 部分，看看是否包含了你需要的格式。如果沒有，可能需要安裝額外的庫（例如 `libjpeg-dev`, `libpng-dev`）。
- **Policy 問題**：在某些情況下，ImageMagick 的預設安全策略可能會限制某些操作，例如處理 PDF 文件。這通常可以通過編輯 `/etc/ImageMagick-6/policy.xml` 文件來解決，但請謹慎操作。

## 總結

ImageMagick 是一個功能強大的影像處理工具，通過上述步驟可以輕鬆地在 Ubuntu 上安裝和使用它。它提供了豐富的命令行工具，可以滿足各種影像處理需求。
