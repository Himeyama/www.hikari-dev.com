---
title: Why Bold Text Uses Gothic (Sans-serif) Font in Japanese Typography
authors: hikari
tags: [デザイン, CSS]
image: /img/ogp/2026-03-29-japanese-bold-serif-gothic.webp
---

Even when body text uses Mincho (serif) typeface, **bold text typically renders in Gothic (sans-serif)**. This is an intentional design choice rooted in readability, visual clarity, and historical printing conventions.

{/**/}

## Readability

Simply bolding Mincho type creates a severe contrast between the serifs and main strokes, causing the **counters** (the enclosed or partially enclosed spaces within a character) to collapse — especially at small sizes on screens. The result is dense, hard-to-read text.

Gothic type lacks serifs entirely, so increasing the weight preserves counters and maintains legibility.

## Visual Clarity

Switching font families entirely sends a clearer "this is emphasized" signal to the human visual system than merely darkening the same typeface. The contrast between Mincho body text and Gothic bold is immediately recognizable as intentional emphasis.

## Historical Convention

In traditional Japanese letterpress printing, **emphasis was expressed by switching typefaces rather than increasing weight**. Casting heavier Mincho type posed physical constraints, so Gothic — a structurally distinct face — was used for emphasis instead. This convention carried over into digital typesetting and the web.

## CSS Implementation

When using Mincho as the base typeface on the web, switching to Gothic for bold elements is straightforward:

```css
body {
  font-family: "Noto Serif JP", serif;
}

strong, b, h1, h2, h3, h4, h5, h6 {
  font-family: "Noto Sans JP", sans-serif;
  font-weight: 700;
}
```

This approach also has a practical advantage: only two weights need to be loaded — Regular Mincho for body text and Bold Gothic for emphasis — reducing font delivery overhead.

## Summary

Three reasons Japanese bold text uses Gothic type:

1. **Readability**: Gothic maintains counters at higher weights, keeping text legible
2. **Visual clarity**: A typeface switch communicates emphasis more effectively than weight alone
3. **Convention**: The letterpress-era rule of "use a different face for emphasis" carried over into digital and web typography

This combination is rational from both a design and web performance perspective.
