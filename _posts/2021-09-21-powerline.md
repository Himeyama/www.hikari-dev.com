---
title: Powerline のインストール方法
layout: default
date: '2021-09-21 06:12'
---

# インストール
## Go のインストール
powreline-go のインストールのために Go をインストールする。

```bash
brew install go
```

## Powerline-go のインストール
```bash
go get -u github.com/justjanne/powerline-go
```

# 設定
## Bashrc
Vim とか nano とかで `~/.bashrc` を開き、以下を追加する。

```bash
GOPATH=$HOME/go
function _update_ps1() {
    PS1="$($GOPATH/bin/powerline-go -newline -error $?)"
}
if [ "$TERM" != "linux" ] && [ -f "$GOPATH/bin/powerline-go" ]; then
    PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
fi
```

`source ~/.bashrc` を実行すると変更が適応される。

# フォント
一応これで終了だが、文字化けする場合がある。
Powerline に対応したフォントを設定する必要がある。
Windows では、Cascadia Code PL とか、Cascadia Mono PL とかが使える。

おすすめは、https://github.com/yuru7/PlemolJP/ の PlemolJP。
ダウンロードは、
https://github.com/yuru7/PlemolJP/releases
の PlemolJP_NF_vX.X.X.zip をクリックし、ダウンロードし展開してフォントをインストール。
フォントの設定は、PlemolJP35 Console NF とする。
