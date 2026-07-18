---
title: About My Personal Site
tag: [Technical Blog]
image: /img/ogp/2023-06-26-create-homepage.webp
---

While Twitter and Instagram are major platforms for information dissemination, they are limited by terms of service and regulations, restricting freedom of expression. Returning to a personal website is a viable option. This site is user-friendly as it does not utilize W○X and therefore lacks advertising or promotion.

## Design Aspects
This site is built using the Jekyll framework, and all themes are custom-made. Here, "theme" refers to font sizes, site structure, margins, etc. It also supports responsive design (adapting to various devices like smartphones and PCs) and dark mode. Although it appears simple, the CSS alone amounts to 13.5 KiB. There's a reason for this. A common pitfall in presentations by those unfamiliar with design is the overuse of accent colors, rainbow gradients, or small margins, resulting in a gaudy design. In other words, poorly executed design can actually make things look worse. Therefore, using accent colors sparingly and setting appropriate margins is beneficial. The result of these meticulous efforts is the large amount of CSS. If anyone finds this homepage gaudy, please share your opinion. Personally, I believe a website with a simple design and no unnecessary animations is the best.

## Homepage Design
This homepage is built with Jekyll. Jekyll simplifies web page creation by allowing you to write HTML templates and combine them with Markdown content. Typically, creating web pages would require writing HTML for each one, and modifying them would involve changing each page individually, which is cumbersome. However, using Jekyll makes modifications easier.

## Deployment to GitHub Pages
This site utilizes GitHub Pages. GitHub Pages allows you to publish web pages for free and even set up a custom domain. However, the free tier has limitations, such as only allowing Pages for public repositories. For Jekyll deployment, GitHub Actions are used to generate the web page whenever a push is made. While Jekyll can be configured to generate pages on every push, workflows enable the use of plugins.

## Required Technologies
The technologies necessary to create such a personal site are:

- Jekyll
- HTML
- CSS / Sass
- GitHub
- JavaScript / TypeScript (not essential)

Considering that creating a personal site alone equips you with these skills, I recommend that programming beginners start by creating a personal site.
