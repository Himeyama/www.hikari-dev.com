---
title: Webrick で rbenv 経由でインストールした Ruby の CGI が動かない場合の対処法
layout: default
---

# 概要
ブラウザで CGI を実行すると、
`/usr/bin/env: 'ruby': No such file or directory` とエラーが出る

```rb
#!/usr/bin/env ruby

# ...
```

# 原因
`$PATH` が設定されていない。

```bash
#!/usr/bin/env bash

echo -ne "Content-type: text/html\n\n"
echo $PATH
```

とすると、

```txt
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin 
```

と表示され、`Ruby` のあるディレクトリーがないことがわかる。

# 対処法
`:CGIPathEnv` で Ruby のパスを設定する。
```rb
srv = WEBrick::HTTPServer.new({
    :DocumentRoot => "./site/",
    :Port => 8080,
    :CGIPathEnv => ENV["PATH"]
})
```
