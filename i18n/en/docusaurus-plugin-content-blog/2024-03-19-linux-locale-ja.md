---
tags: [Linux, Debian, Ubuntu, WSL2, Japanese]
title: How to Japanese the Linux Prompt
authors: hikari
---

This post introduces how to Japanese the Linux prompt.

## 1. Install Japanese Locale

Next, if the Japanese locale does not exist, install it with the following command.

```bash
sudo apt update
sudo apt install language-pack-ja
```

## 2. Set the Locale

Set the Japanese locale with the following command.

```bash
sudo update-locale LANG=ja_JP.UTF8
```

## 3. Restart the System

Finally, restart the system. This will reflect the new locale settings.

```bash
sudo reboot
```

With the above steps, the Linux prompt will be Japanese.