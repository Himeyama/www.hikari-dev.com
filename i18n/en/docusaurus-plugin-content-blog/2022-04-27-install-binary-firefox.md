---
title: Install Firefox Build
---

Ubuntu 22.04 seems to have the snap version of Firefox installed, and it wasn't launching in some environments, so I'm documenting how to install the pre-built Firefox.

## Uninstall apt / snap version of Firefox
```bash
sudo apt purge firefox
sudo snap remove firefox
```

## Install Firefox Build

```bash
# Download
wget "https://download.mozilla.org/?product=firefox-latest-ssl&os=linux64&lang=ja" --trust-server-names

# Extract
tar xvf firefox-*.tar.bz2

# Install
sudo cp -r firefox /usr/lib

# Create a symbolic link to the executable
sudo ln -s /usr/lib/firefox/firefox /usr/bin/firefox

# Download and place the desktop file
sudo mkdir -p /usr/share/applications
sudo wget https://bit.ly/3Mwigwx -O /usr/share/applications/firefox.desktop
```