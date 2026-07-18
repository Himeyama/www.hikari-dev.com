---
title: When nokogiri cannot be installed under brew
date: '2021-10-07 01:32'
image: /img/ogp/2021-10-07-nokogiri-build-error.webp
---

# Problem
The following two errors occurred:

```
zlib is missing; necessary for building libxml2
```

```
xslt is missing. Please locate mkmf.log to investigate how it is failing.
```

# Solution
- Install libxslt and libxml2
- Specify the path of libxml2 installed by brew

```sh
brew install libxslt libxml2
bundle config build.nokogiri --use-system-libraries --with-xml2-include=$(brew --prefix libxml2)/include/libxml2
```

# Reference sites
- [Don't hate nokogiri ~Overcoming installation errors~](https://qiita.com/dskst/items/b1f073fcffeca3bc9fc6)
- [nokogiri cannot be installed on macOS](https://qiita.com/ywindish/items/5cb01ee974f8a7f403ba)