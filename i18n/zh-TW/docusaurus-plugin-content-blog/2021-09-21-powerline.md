---
title: 如何安裝 Powerline
tags: [CLI]
date: '2021-09-21 06:12'
image: /img/ogp/2021-09-21-powerline.webp
---

# 安裝
## 安裝 Go
安裝 Go 以便安裝 powerline-go。

```bash
brew install go
```

## 安裝 Powerline-go
```bash
go get -u github.com/justjanne/powerline-go
```

# 設定
## Bashrc
用 Vim 或 nano 開啟 `~/.bashrc`，並加入以下內容。

```bash
GOPATH=$HOME/go
function _update_ps1() {
   PS1="$( $GOPATH/bin/powerline-go -newline -error $? )"
}
if [ "$TERM" != "linux" ] && [ -f "$GOPATH/bin/powerline-go" ]; then
   PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
fi
```

執行 `source ~/.bashrc` 套用變更。

# 字型
到這裡應該就完成了，但可能會有字元編碼問題。
您需要設定對應 Powerline 的字型。
在 Windows 上，可以使用 Cascadia Code PL 或 Cascadia Mono PL。

推薦使用 https://github.com/yuru7/PlemolJP/ 的 PlemolJP。
從 https://github.com/yuru7/PlemolJP/releases 下載，點擊 PlemolJP_NF_vX.X.X.zip，下載後解壓縮並安裝字型。
將字型設定為 PlemolJP35 Console NF。
