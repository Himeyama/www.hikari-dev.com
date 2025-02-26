---
layout: post
title: Hyper-V の Ubuntu にシリアルコンソールで接続する方法
---

## VM の設定

「名前付きパイプ」を選択し、パイプ名を「COM1」に設定

![Hyper-V Serial Settings](/assets/img/hyper-v-serial/image01.png)

## Ubuntu の設定

### GRUB の設定

`sudo nano /etc/default/grub` で GRUB の設定ファイルを開き、

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash console=ttyS0,115200n8"
```

に変更する。

保存後、

```bash
sudo update-grub
```

で GRUB の設定を適用する。

### シリアルポートの有効化
シリアルポートでログインできるようにサービスを設定する。

```bash
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service
```

## 接続

**管理者権限**で起動する

### Tera Term から接続

![Connect Serial port of Ubuntu on Hyper-V from Tera Term](/assets/img/hyper-v-serial/image02.png)

### PuTTY から接続

**管理者権限**で起動する


|Serial line|Speed|Connection type:|
|:--:|:--:|:--:|
|\\.\pipe\COM1|115200|Serial|

に設定。

![Connect Serial port of Ubuntu on Hyper-V from PuTTy](/assets/img/hyper-v-serial/image05.png)

![Connect Serial port of Ubuntu on Hyper-V from PuTTy](/assets/img/hyper-v-serial/image04.png)

### plink から接続

**管理者権限**で起動する

![Connect Serial port of Ubuntu on Hyper-V from plink.exe on WindowsTerminal](/assets/img/hyper-v-serial/image03.png)

```ps1
[System.Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
[System.Console]::InputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
plink.exe -serial \\.\pipe\COM1 -sercfg 115200,8,n,1,N
```

Ctrl + C で終了