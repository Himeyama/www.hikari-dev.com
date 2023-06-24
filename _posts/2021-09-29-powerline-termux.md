---
title: termux に powerline をインストールする
layout: default
date: '2021-09-29 08:11'
---

# Go のインストール
```sh
pkg install golang
```

# powerline のインストール
あとは、[Powerline のインストール方法](/2021/09/29/powerline-termux.html)とほぼ同じ

```sh
go get -u github.com/justjanne/powerline-go
```

# .profile に設定
`~/.profile` を開き、以下を追加する。

```bash
GOPATH=$HOME/go
function _update_ps1() {
    PS1="$($GOPATH/bin/powerline-go -newline -error $?)"
}
if [ "$TERM" != "linux" ] && [ -f "$GOPATH/bin/powerline-go" ]; then
    PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
fi
```

# フォントの設定
例として、[yuru7/PlemolJP](https://github.com/yuru7/PlemolJP) をインストールする。

```bash
wget https://github.com/yuru7/PlemolJP/releases/download/v0.4.0/PlemolJP_NF_v0.4.0.zip
unzip PlemolJP_NF_v0.4.0.zip
cp PlemolJP_NF_v0.4.0/PlemolJP35Console_NF/PlemolJP35ConsoleNF-Medium.ttf $HOME/.term
ux/font.ttf
rm PlemolJP_NF_v0.4.0 -rf
rm PlemolJP_NF_v0.4.0.zip
```