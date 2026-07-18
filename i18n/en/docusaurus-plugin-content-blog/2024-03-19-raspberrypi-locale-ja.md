---
title: How to change the Linux prompt to Japanese
tags: [Raspberry Pi, Security]
image: /img/ogp/2024-03-19-raspberrypi-locale-ja.webp
---

This post explains how to localize the prompt on Raspberry Pi.

## 1. Setting the locale

Set the Japanese locale. Execute the following commands:

1. Check the box as shown with a space and OK.
2. Select ja_JP.UTF-8 and OK.

```bash
sudo dpkg-reconfigure locales

# [*] ja_JP.UTF-8 UTF-8
```

## 2. Reboot

Reboot the system.

```bash
sudo reboot
```

That's all.