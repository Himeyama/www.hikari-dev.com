---
title: 透過 rbenv 安裝的 Ruby 在 Webrick 上 CGI 無法運作的解決方法
tags: [Ruby]
image: /img/ogp/2021-08-05-webrick-cgi-path.webp
---

# 概要
在瀏覽器中執行 CGI 時，發生以下錯誤：
`/usr/bin/env: 'ruby': No such file or directory`

```rb
#!/usr/bin/env ruby

# ...
```

# 原因
`$PATH` 未設定。

```bash
#!/usr/bin/env bash

echo -ne "Content-type: text/html\n\n"
echo $PATH
```

執行後會顯示：

```txt
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

這表示包含 `Ruby` 的目錄不在其中。

# 解決方法
使用 `:CGIPathEnv` 設定 Ruby 路徑。

```rb
srv = WEBrick::HTTPServer.new({
   :DocumentRoot => "./site/",
   :Port => 8080,
   :CGIPathEnv => ENV["PATH"]
})
```
