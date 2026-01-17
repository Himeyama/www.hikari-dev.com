---
title: How to expose a server on WSL2 to the LAN using SSH tunneling
---

## Step1. Install OpenSSH Server on WSL
Install OpenSSH Server on WSL2.
Also, start the sshd service.

```bash
# WSL2 side
sudo apt install openssh-server
sudo service sshd start
```

## Step2. Register the public key on the Windows side

If you have not registered the public key on Windows, run the following command.

```ps1
# Windows side
ssh-keygent -t ed25519
```

Next, register the public key on WSL2.

```ps1
# Windows side
$pubkey = $(cat $HOME\.ssh\id_ed25519.pub)
wsl -- echo $pubkey `| tee -a `$HOME/.ssh/authorized_keys
```

## Step3. Tunnel with SSH

Connect to WSL2 from Windows via SSH.

```ps1
# Windows side
ssh (wsl -- hostname -I).trim() -g -L8081:localhost:8080
```

Explanation of the command:

- `(wsl -- hostname -I).trim()` retrieves the IP address of WSL2.
- `-g` forwards the port to the LAN (accessible from external devices with an address like 192.168.x.x).
- `-L` is the local forward option. It forwards the server's port to a local port.
- `8081` and `localhost:8080` mean that accessing `http://localhost:8081` will forward to `localhost:8080`.
  Here, `localhost` refers to `localhost` as seen from the server side.

## Step4. Start the server

Start the server that you want to expose on WSL2.

```ps1
# WSL2 side
ruby -run -e httpd . # Directory listing will be exposed
```

## Step5. Access the server

You can access the service at `http://localhost:8081` or `http://<IP address displayed by ipcconfig>:8081`.

A disadvantage of tunnel connections is that it is tedious to tunnel every time.
Although unstable, you can do the same thing by using `netsh interface portproxy ~`.
