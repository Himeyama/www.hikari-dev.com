---
title: I Built "DOC," a Mini App That Converts Markdown to docx
authors: hikari
tags: [Docusaurus, ミニアプリ, Markdown, Word]
image: /img/ogp/2026-07-18-doc-mini-app.webp
---

For those times when you want to convert a Markdown document into Word (docx), I built "DOC," an editor that runs entirely in the browser. It never sends your content to a server — the conversion itself happens entirely in the browser.

{/* truncate */}

## What is DOC?

DOC is a mini app available at [/doc](/doc). You write your document while comparing the Markdown editor on the left with the preview on the right, then download it directly as a docx file. The editor uses Monaco Editor (the same editor component used in VS Code), so you get the same syntax highlighting and comfortable cursor operations you're used to.

## Main features

### Markdown editing with a real-time preview

The screen is split left and right: the Markdown editor on the left, the preview on the right. You can drag the divider to freely adjust the width of each pane. Scrolling the editor also scrolls the preview in sync.

### One-click conversion to docx

A single button on the toolbar generates OOXML (the XML that makes up the inside of a docx file) from your Markdown, packages it as a zip in the browser, and lets you download it as a `.docx` file. Your content is never sent to an external server.

It supports common Markdown syntax — headings, paragraphs, bold/italic/strikethrough, bullet and numbered lists, code blocks, blockquotes, and tables — and the converted file opens and edits normally in Word.

### Inspecting the conversion result directly via the OOXML tab

You can switch from the preview to an "OOXML" tab to see the converted XML directly in the editor. This is handy when you're curious how the inside of a docx file is actually structured.

:::tip
I previously touched on how a docx file is internally structured as a package in [I Tried Building a docx File With a Text Editor](/en/blog/2026/07/18/handmade-docx). DOC can be thought of as a tool that automates that OOXML generation and packaging process.
:::

### Formatting toolbar

Selecting text and clicking the bold, italic, or strikethrough buttons automatically adds or removes the corresponding Markdown syntax (`**`, `*`, `~~`). Combinations are supported too — applying both bold and italic, for example, produces `***text***`.

### Font selection

You can choose the output font from serif, sans-serif, and combined options, including Noto Serif JP / Noto Sans JP. The selected font is reflected in the preview immediately, and your choice is remembered in the browser for next time.

### Importing Markdown / docx files

You can import existing `.md` or `.markdown` files, and even `.docx` files, via drag-and-drop or a file picker. Importing a `.docx` file converts it back into Markdown, which is useful when you want to start editing from an existing Word document.

### AI chat panel

Opening the AI chat panel, which supports OpenRouter, lets you ask the AI to generate a document, apply its response to a selected range of text, or replace the entire document with its output. It also supports prompt caching, so you can keep referring to the same document across a conversation without burning unnecessary tokens.

### Auto-save

The document you're editing is automatically saved to the browser's localStorage with debouncing. Even if you accidentally close the tab, you can pick up right where you left off the next time you open the page.

## Summary

- [/doc](/doc) is a browser-only editor that converts Markdown into docx
- Editing with Monaco Editor plus a real-time preview, with an OOXML tab for inspecting the conversion result
- Supports a formatting toolbar for bold/italic/strikethrough, font selection, and Markdown/docx import
- An AI chat panel with OpenRouter support can also generate and edit documents
- Content is auto-saved to local storage, and since all conversion happens in the browser, nothing is ever sent to a server

Give it a try the next time you want to quickly write up meeting notes or a spec in Markdown and share it as a Word file.
