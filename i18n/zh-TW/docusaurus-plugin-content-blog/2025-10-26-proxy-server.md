---
title: 用 Raspberry Pi 當作伺服器公開網站
authors: hikari
tags: [網路]
image: /img/blog/2025-10-26-proxy-server/image.png
---

## 在 Raspberry Pi 上設定 nginx

```sh
# 安裝並啟用 nginx
sudo dnf install nginx

# 編輯 /etc/nginx/nginx.conf
# sudo nano /etc/nginx/nginx.conf

# 啟動並設定 nginx 開機自動啟動
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

## 編輯 /etc/nginx/nginx.conf
在 `http { server {} }` 裡加入以下內容

```
location / {
    return 200 'Hello, world!';
    add_header Content-Type text/plain;
}
```

## CloudFlare 設定
1. 前往 https://one.dash.cloudflare.com/。
2. 開啟「網路」→「Tunnels」
3. 按「新增隧道」

![Cloudflare Tunnels](/img/blog/2025-10-26-proxy-server/image.png)

4. 按「選擇 cloudflared」

![選擇 Cloudflared](/img/blog/2025-10-26-proxy-server/image-1.png)

5. 在「隧道名稱」輸入適當名稱，然後按「儲存隧道」

![為 Cloudflare 儲存隧道名稱](/img/blog/2025-10-26-proxy-server/image-2.png)

## 安裝 cloudflared
```sh
# 將 cloudflared.repo 新增到 /etc/yum.repos.d/
curl -fsSl https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo

sudo dnf clean packages

# 安裝 cloudflared
sudo dnf install -y cloudflared --nogpgcheck
```

## 用 cloudflared 啟動服務
```sh
sudo cloudflared service install xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 流量路由設定
設定主機名稱的子網域與網域，以及服務類型和 URL。

![設定畫面](/img/blog/2025-10-26-proxy-server/image-3.png)

按「完成設定」。