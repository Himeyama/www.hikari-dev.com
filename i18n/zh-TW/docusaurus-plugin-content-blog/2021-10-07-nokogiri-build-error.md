---
title: 在 brew 環境下無法安裝 nokogiri 時的解決方法
date: '2021-10-07 01:32'
image: /img/ogp/2021-10-07-nokogiri-build-error.png
---

# 問題
發生了以下兩個錯誤：

```
zlib is missing; necessary for building libxml2
```

```
xslt is missing. Please locate mkmf.log to investigate how it is failing.
```

# 解決方法
- 安裝 libxslt 與 libxml2
- 指定 brew 安裝的 libxml2 路徑

```sh
brew install libxslt libxml2
bundle config build.nokogiri --use-system-libraries --with-xml2-include=$(brew --prefix libxml2)/include/libxml2
```

# 參考網站
- [Don't hate nokogiri ~Overcoming installation errors~](https://qiita.com/dskst/items/b1f073fcffeca3bc9fc6)
- [nokogiri cannot be installed on macOS](https://qiita.com/ywindish/items/5cb01ee974f8a7f403ba)
