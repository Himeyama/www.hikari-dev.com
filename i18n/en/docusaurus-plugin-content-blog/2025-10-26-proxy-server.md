---
title: Publishing a Website Using Raspberry Pi as a Server
authors: hikari
---

## Setting up nginx on Raspberry Pi

```sh
# Install and enable nginx
sudo dnf install nginx

# Edit /etc/nginx/nginx.conf
# sudo nano /etc/nginx/nginx.conf

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

## Editing /etc/nginx/nginx.conf
Add the following inside `http { server {} }`:

```
location / {
    return 200 'Hello, world!';
    add_header Content-Type text/plain;
}
```

## Cloudflare Settings
1. Go to https://one.dash.cloudflare.com/.
2. Open "Network" → "Tunnels".
3. Click "Add a tunnel".

![Cloudflare Tunnels](/img/blog/2025-10-26-proxy-server/image.png)

4. Click "Select Cloudflared".

![Select Cloudflared](/img/blog/2025-10-26-proxy-server/image-1.png)

5. Enter a suitable name for "Tunnel name" and click "Save tunnel".

![Save Tunnel Name for Cloudflare](/img/blog/2025-10-26-proxy-server/image-2.png)

## Installing cloudflared
```sh
# Add cloudflared.repo to /etc/yum.repos.d/
curl -fsSl https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo

sudo dnf clean packages

# Install cloudflared
sudo dnf install -y cloudflared --nogpgcheck
```

## Starting cloudflared service
```sh
sudo cloudflared service install xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Routing traffic
Set the hostname's subdomain and domain, service type, and URL.

![alt text](/img/blog/2025-10-26-proxy-server/image-3.png)

Click "Complete setup".
