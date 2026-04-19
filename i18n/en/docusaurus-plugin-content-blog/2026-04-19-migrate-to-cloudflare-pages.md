---
title: Migrated from AWS S3 to Cloudflare Pages
authors: [hikari]
tags: [AWS, Cloudflare, Docusaurus, CI/CD]
image: /img/ogp/2026-04-19-migrate-to-cloudflare-pages.png
---

I migrated this blog from AWS S3 to Cloudflare Pages. Until now, I had been hosting statically on S3 and delivering through CloudFront, but I decided to adopt Cloudflare Pages to simplify management and improve performance.

{/* truncate */}

## Why Cloudflare Pages

I had been operating with the standard AWS setup of S3 + CloudFront + Route53, but I decided to switch to Cloudflare Pages for the following reasons:

1. **Low management cost**: Automatic SSL certificate renewal and global edge deployments are built-in by default.
2. **Generous free tier**: For traffic levels typical of a personal blog, almost all features can be used within the free tier.
3. **Flexible deployment**: Supports not only GitHub integration but also direct upload from GitHub Actions, maintaining complex build workflows.

## Migration Steps

### 1. Create GitHub Actions Workflow

I rewrote the existing workflow for S3 deployment to work with Cloudflare Pages. This time, I used `cloudflare/pages-action`.

### 2. Create Cloudflare Pages Project

Create a project from the Cloudflare dashboard or CLI (Wrangler). This time, to ensure specifying the branch correctly, I used Wrangler.

### 3. Switch DNS

Updated the DNS record for `www.hikari-dev.com`, which was pointing to S3, to point to the Cloudflare Pages endpoint (`xxx.pages.dev`).

When adding a custom domain on the Cloudflare Pages side, automatic verification runs and an SSL certificate is issued. If old records remain, verification can fail, so deleting the domain settings once and re-registering helped the changes reflect smoothly.

## Post-Migration Impressions

The migration itself was very smooth, and the deployment speed is comparable to uploading to S3. Above all, I feel the biggest benefit is that multiple AWS-managed resources (S3 buckets, CloudFront distributions, ACM certificates) could be consolidated into a single Cloudflare Pages project.

Going forward, I also want to consider adding dynamic features using Cloudflare Workers and the like.