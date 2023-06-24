---
title: brew 環境下で nokogiri をインストールできないとき
layout: default
date: '2021-10-07 01:32'
---

# 問題
以下の二つのエラーが出た。

```
zlib is missing; necessary for building libxml2
```

```
xslt is missing. Please locate mkmf.log to investigate how it is failing.
```

# 解決法
- libxslt, libxml2 をインストール
- brew でインストールされている libxml2 のパスを指定

```sh
brew install libxslt libxml2
bundle config build.nokogiri --use-system-libraries --with-xml2-include=$(brew --prefix libxml2)/include/libxml2
```

# 参考サイト
- [nokogiri を嫌いにならないで 〜インストール時のエラーを乗り越えろ〜](https://qiita.com/dskst/items/b1f073fcffeca3bc9fc6)
- [nokogiri が macOS でインストールできない](https://qiita.com/ywindish/items/5cb01ee974f8a7f403ba)