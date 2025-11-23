---
title: How to Install Powerline
date: '2021-09-21 06:12'
authors: hikari
---

# Installation
## Go Installation
Install Go to install powerline-go.

```bash
brew install go
```

## Powerline-go Installation
```bash
go get -u github.com/justjanne/powerline-go
```

# Configuration
## Bashrc
Open `~/ .bashrc` with Vim or nano and add the following.

```bash
GOPATH=$HOME/go
function _update_ps1() {
   PS1="$( $GOPATH/bin/powerline-go -newline -error $? )"
}
if [ "$TERM" != "linux" ] && [ -f "$GOPATH/bin/powerline-go" ]; then
   PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
fi
```

Run `source ~/.bashrc` to apply the changes.

# Font
This should finish it, but there might be character encoding issues.
You need to set a font that corresponds to Powerline.
On Windows, you can use Cascadia Code PL or Cascadia Mono PL.

We recommend PlemolJP from https://github.com/yuru7/PlemolJP/.
Download it from https://github.com/yuru7/PlemolJP/releases, click on PlemolJP_NF_vX.X.X.zip, download, extract, and install the font.
Set the font to PlemolJP35 Console NF.