---
title: Troubleshooting CGI not working with Ruby installed via rbenv on Webrick
authors: hikari
---

# Overview
When executing CGI in the browser, an error occurs stating:
`/usr/bin/env: 'ruby': No such file or directory`

```rb
#!/usr/bin/env ruby

# ...
```

# Cause
The `$PATH` is not set.

```bash
#!/usr/bin/env bash

echo -ne "Content-type: text/html\n\n"
echo $PATH
```

Running this will display:

```txt
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

This shows that the directory containing `Ruby` is not present.

# Solution
Set the Ruby path using `:CGIPathEnv`.

```rb
srv = WEBrick::HTTPServer.new({
   :DocumentRoot => "./site/",
   :Port => 8080,
   :CGIPathEnv => ENV["PATH"]
})
```