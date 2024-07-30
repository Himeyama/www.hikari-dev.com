---
layout: post
title: fluent-listbox のスクロールを可能にする方法 (@fluentui/web-components)
tags: [Fluent UI]
---

## 概要
以下の ListBox (fluent-listbox および fluent-option) をスクロール可能にする

[Listbox | Microsoft Learn'](https://learn.microsoft.com/ja-jp/fluent-ui/web-components/components/listbox?pivots=typescript)

## 解決法
fluent-listbox に対しては `overflow-y: auto;` を、fluent-option に対しては `flex-shrink: 0;` を設定

```css
fluent-listbox {
    overflow-y: auto;
}

fluent-option {
    flex-shrink: 0;
}
```