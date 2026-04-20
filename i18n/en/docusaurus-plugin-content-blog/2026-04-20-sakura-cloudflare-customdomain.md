---
title: Assigned a Custom Domain to a Subpath on Sakura Server with Cloudflare Workers
authors: [hikari]
tags: [AWS, Cloudflare, Sakura Rental Server]
image: /img/ogp/2026-04-20-sakura-cloudflare-customdomain.png
---

## Background

Sakura’s rental server "Lite Plan" offers an incredibly low price of **121 yen per month** for a 36-month lump sum payment (165 yen per month for a 12-month lump sum). It's sufficient for hosting static files and **CGI** purposes, making it easy to use as personal storage.

However, the assigned domain will be a subdomain of `username.sakura.ne.jp`, so some ingenuity is required if you want to associate your custom domain with a specific path.

## What I Want to Achieve

When accessing `https://app.example.com`,
the content from `https://sakurauser.sakura.ne.jp/app/` should be displayed
**without changing the URL**.

## Why Simple DNS Settings Won't Work

DNS CNAME records can only specify hostnames,
and **URLs that include paths like `/app/` cannot be specified**.

While it can be achieved using a redirect (301),
the URL in the browser's address bar would change to `sakurauser.sakura.ne.jp/flower/`.

Using **transparent proxy** with Cloudflare Workers allows 
the URL to remain as `app.example.com`.

## Prerequisites

- You must be registered with a custom domain on Cloudflare (e.g., `example.com`)
- A free plan on Cloudflare is acceptable (up to 100,000 requests per day for free)

## Steps

### 1. Create a Worker

1. Cloudflare Dashboard → **Workers & Pages** → **Create**
2. Select **Start with Hello World!**
3. Enter the Worker name (e.g., `storage-proxy`) 
4. Click **Deploy**

### 2. Edit the Code

After deploying, click **Edit code** and 
**replace all** with the following code.

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL("https://sakurauser.sakura.ne.jp");
    target.pathname = "/app" + url.pathname;
    target.search = url.search;

    const newRequest = new Request(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await fetch(newRequest);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete("content-security-policy");
    newHeaders.delete("x-frame-options");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }
};
```

## Summary

- Sakura's rental server Lite Plan is **121 yen per month** and can sufficiently serve as a storage for static files.
- However, assigning a custom domain to a subpath is not possible with standard DNS settings.
- By using **Cloudflare Workers** as a transparent proxy, you can deliver content without changing the URL.
- The Workers' code is only a few dozen lines, and it operates within the limits of the Cloudflare free plan.