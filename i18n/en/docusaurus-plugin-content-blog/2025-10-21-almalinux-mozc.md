---
title: How to install Mozc on AlmaLinux 10 (Raspberry Pi 5 / GNOME / aarch64)
authoors: hikari
---

## Download the rpm files
Search and download the following from [rpmfind.net](https://www.rpmfind.net/):
- mozc
- mozc-gui-tools
- ibuus-mozc

Make sure the architecture is correct.
- For Raspberry Pi 5, it is aarch64
- For general PCs, it is x86_64

### Example of rpm files
- mozc-2.31.5810.102-160000.1.2.aarch64.rpm
- mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm
- ibuus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm

## Install
Specify the downloaded rpm files and install them using the dnf command.

```sh
cd ~/Downloads
sudo dnf install ./mozc-2.31.5810.102-160000.1.2.aarch64.rpm ./mozc-gui-tools-2.31.5810.102-160000.1.2.aarch64.rpm ./ibus-mozc-2.31.5810.102-160000.1.2.aarch64.rpm
```

## Logout
Log out once.

## Settings
Open "Settings" -> "Keyboard" and register the following in order:

- Japanese (Mozc)
- Japanese

Setup complete!