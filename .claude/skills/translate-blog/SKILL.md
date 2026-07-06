---
name: translate-blog
description: Translate a Japanese blog post in this Docusaurus site into English and Traditional Chinese (zh-TW) and save the i18n copies. Use when asked to translate a blog post/article, add an English/Taiwanese/zh-TW version of a post, or localize blog/*.md.
---

Japanese is this site's default locale; posts are authored directly under
`blog/*.md`. Translating means producing English and zh-TW copies of the same
file and saving them under Docusaurus's i18n content path — there is no
build step or app to launch, this is a pure content-translation task done by
the model itself.

All paths below are relative to the repo root.

## Locales

Configured in `docusaurus.config.*`: `locales: ['ja', 'en', 'zh-TW']`.

- `ja` (default) → source file lives at `blog/<slug>.md`.
- `en` → translation goes to `i18n/en/docusaurus-plugin-content-blog/<slug>.md`.
- `zh-TW` (Traditional Chinese / Taiwan) → translation goes to
  `i18n/zh-TW/docusaurus-plugin-content-blog/<slug>.md`.

The filename (`<slug>.md`) must be **identical** across all three locations —
Docusaurus matches translated posts to the original by filename.

## Run (agent path)

1. Read the source post at `blog/<slug>.md`.
2. Translate the frontmatter:
   - `title`: translate naturally (not word-for-word) — see existing pairs
     below for the tone this site uses.
   - `authors`, `tags`: copy unchanged.
3. Translate the body into natural English, preserving:
   - Heading structure and levels.
   - Code blocks verbatim (command lines, JSON/log output are not
     translated — only surrounding prose is).
   - Links (GitHub URLs, doc URLs) unchanged.
   - Tables: keep the table structure, translate cell text.
   - ASCII diagrams (e.g. `A → B → C` in fenced ` ```text ` blocks): translate
     the labels, keep the arrows/layout.
4. Write the English translation to
   `i18n/en/docusaurus-plugin-content-blog/<slug>.md`.
5. Repeat steps 2–3 for Traditional Chinese and write to
   `i18n/zh-TW/docusaurus-plugin-content-blog/<slug>.md`.
6. If either target directory doesn't exist yet, create it — it's a plain
   directory, no scaffolding required.

There is no build/test step for this — the translated files are the
deliverable. If you want to sanity-check locally, `npm run start -- --locale en`
(or `zh-TW`) serves that locale, but this isn't required to consider the
translation done.

## Reference: existing translation pairs

Use these as calibration for tone/register (both are in this repo):

- `blog/2026-06-28-proxa.md` ↔
  `i18n/en/docusaurus-plugin-content-blog/2026-06-28-proxa.md` ↔
  `i18n/zh-TW/docusaurus-plugin-content-blog/2026-06-28-proxa.md`

## Gotchas

- `i18n/ja/docusaurus-plugin-content-blog/` only contains `options.json` (UI
  strings) — Japanese posts are **not** duplicated there. Don't create a
  Japanese copy under `i18n/ja/`; the file in `blog/` already serves that
  locale.
- This repo has a second blog plugin instance,
  `docusaurus-plugin-content-blog-sukisuki-club` — don't confuse its i18n
  directories with the main blog's. Only translate into
  `docusaurus-plugin-content-blog` unless the source post is explicitly under
  the sukisuki-club blog.
- Technical values (env var names, flags, model IDs like `z-ai/glm-5.2`,
  file paths) stay untouched in both translations — only prose around them
  is translated.
