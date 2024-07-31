---
layout: post
title: fluent-listbox のスクロールを可能にする方法 (@fluentui/web-components)
tags: [Fluent UI]
---

## 概要
以下の ListBox (fluent-listbox および fluent-option) をスクロール可能にする

[Listbox \| Microsoft Learn](https://learn.microsoft.com/ja-jp/fluent-ui/web-components/components/listbox?pivots=typescript)

## 解決法
fluent-listbox に対しては `overflow-y: auto;` を、fluent-option に対しては `flex-shrink: 0;` を設定

<p class="codepen" data-height="300" data-default-tab="html,result" data-slug-hash="WNqpQJL" data-pen-title="fluent-listbox" data-user="himeyama" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/himeyama/pen/WNqpQJL">
  fluent-listbox</a> by ひかり (<a href="https://codepen.io/himeyama">@himeyama</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>