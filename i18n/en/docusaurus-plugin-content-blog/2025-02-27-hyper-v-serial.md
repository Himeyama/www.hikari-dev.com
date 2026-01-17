---
title: How to Connect to Ubuntu in Hyper-V via Serial Console
---

## VM Settings

Select "Named pipe" and set the pipe name to "COM1".

![Hyper-V Serial Settings](/img/blog/2025-02-27-hyper-v-serial/image01.png)

## Ubuntu Settings

### GRUB Settings

Open the GRUB configuration file with `sudo nano /etc/default/grub`.

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash console=ttyS0,115200n8"
```

After saving, apply the GRUB settings with:

```bash
sudo update-grub
```

### Enable Serial Port
Configure the service to allow login via the serial port.

```bash
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service
```

## Connection

Launch as **administrator**.

### Connect from Tera Term

![Connect Serial port of Ubuntu on Hyper-V from Tera Term](/img/blog/2025-02-27-hyper-v-serial/image02.png)

### Connect from PuTTY

Launch as **administrator**.

|Serial line|Speed|Connection type:|
|:--:|:--:|:--:|
|\\.\pipe\COM1|115200|Serial|

Set the above.

![Connect Serial port of Ubuntu on Hyper-V from PuTTy](/img/blog/2025-02-27-hyper-v-serial/image05.png)

![Connect Serial port of Ubuntu on Hyper-V from PuTTy](/img/blog/2025-02-27-hyper-v-serial/image04.png)

### Connect from plink

Launch as **administrator**.

![Connect Serial port of Ubuntu on Hyper-V from plink.exe on WindowsTerminal](/img/blog/2025-02-27-hyper-v-serial/image03.png)

```ps1
[System.Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
[System.Console]::InputEncoding = [System.Text.Encoding]::GetEncoding("utf-8")
plink.exe -serial \\.\pipe\COM1 -sercfg 115200,8,n,1,N
```

Exit with Ctrl + C.
