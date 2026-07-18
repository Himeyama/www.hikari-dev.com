---
title: SSH to termux
tags: [SSH]
date: '2021-09-29 05:11'
image: /img/ogp/2021-09-29-termux-ssh.webp
---

# Install OpenSSH
```bash
pkg install openssh
```

## If an error occurs
If you run this on the Android version of termux, an error will occur.
We recommend deleting the existing termux and installing termux from Github.

# Start the server
```bash
sshd
```

# Configure the public key
Add the client's public key (`~/ .ssh/id_*.pub`) to `~/ .ssh/authorized_keys` in termux.

It's easy to copy and paste the public key by sending it to yourself via email or DM on Twitter.

```sh
# Example:
echo ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKYztjZfIVMl5o0J2DrigTsl1XgbSKMUgYCpfOfhMtmw hikari@B450M-K >> ~/.ssh/authorized_keys
```

# Login
```bash
# Check the IP address of your smartphone
ip a

ssh 192.168.x.x -p 8022
```