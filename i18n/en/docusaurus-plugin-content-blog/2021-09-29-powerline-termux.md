---
title: Installing Powermline on Termux
date: '2021-09-29 08:11'
---

# Go Installation
```sh
pkg install golang
```

# Powermline Installation
This is almost the same as the [Powermline installation method](/blog/2021/09/29/powerline-termux)
```sh
go get -u github.com/justjanne/powermline-go
```

# Setting in .profile
Open `~/ .profile` and add the following:

```bash
GOPATH=$HOME/go
function _update_ps1() {
   PS1="$( $GOPATH/bin/powermline-go -newline -error $? )"
}
if [ "$TERM" != "linux" ] && [ -f "$GOPATH/bin/powermline-go" ]; then
   PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
fi
```

# Font Setup
For example, install [yuru7/PlemolJP](https://github.com/yuru7/PlemolJP).
```sh
wget https://github.com/yuru7/PlemolJP/releases/download/v0.4.0/PlemolJP_NF_v0.4.0.zip
unzip PlemolJP_NF_v0.4.0.zip
cp PlemolJP_NF_v0.4.0/PlemolJP35Console_NF/PlemolJP35ConsoleNF-Medium.ttf $HOME/.term
ux/font.ttf
rm PlemolJP_NF_v0.4.0 -rf
rm PlemolJP_NF_v0.4.0.zip
```