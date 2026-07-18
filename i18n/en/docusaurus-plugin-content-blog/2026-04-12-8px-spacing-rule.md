---
title: Why "Multiples of 8" Are the Standard for Spacing in CSS
authors: hikari
tags: [Design, CSS]
image: /img/ogp/2026-04-12-8px-spacing-rule.webp
---

In modern UI design, the rule of setting "spacing in multiples of 8" is commonly used. This is not just a convention, but an empirical rule supported by the **mathematical consistency of screen density, typography, and scale**.

## Addressing Various Screen Densities

Modern displays have pixel ratios such as **1x, 1.5x, 2x, 3x, and 4x**.

| Value | 1x | 1.5x | 2x | 3x | 4x |
|-------|----|------|----|----|----|
| **8 px** | 8 | 12 | 16 | 24 | 32 |
| 5 px | 5 | 7.5 ⚠️ | 10 | 15 | 20 |

Since 8 is **divisible into integers** for many scales, it minimizes blurring caused by subpixel rendering. Using values like 5 px can generate fractions like 7.5 px in a 1.5x environment, leading to inaccurate rendering.

## Compatibility with Typography

The default font size in browsers is **16 px (= 8 × 2)**. Line height is typically 1.5 times that, which equals 24 px (= 8 × 3).

By setting spacing in multiples of 8, the rhythm of the text can visually align more easily. The height of headings and body text matches the spacing grid, creating a **well-organized vertical rhythm**.

## Ease of Creating Design Tokens

```css
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
```

The scale is simple, making it easy for designers and engineers to utilize as a **common language**. Material Design and Tailwind CSS also adopt this philosophy.

When a designer specifies "space-3," the engineer can confidently apply `24px`. A consistent naming convention reduces the communication cost during code reviews.

## The Option of a 4 px Base

For UIs that require finer adjustments, a **4 px base** (4, 8, 12, 16...) is also common. Tailwind CSS adopts a default 4 px base (`p-1 = 4px`).

The 4 px base is a subset of the 8 px base, so both can coexist without contradiction. It is effective to use 4 px units for small spacings within components, while using 8 px units for larger spacings between sections.

## Conclusion

The reasons for using multiples of 8 as the standard for spacing can be summarized in three points:

1. **Addressing Screen Density**: It divides into integers across many pixel ratios, preventing subpixel blurriness.
2. **Consistency with Typography**: Aligns with the default font size (16 px) and line height (24 px), creating a vertical rhythm.
3. **Consistency in Scale**: A simple token system serves as a common language for designers and engineers.