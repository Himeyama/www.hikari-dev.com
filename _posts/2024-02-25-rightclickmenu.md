---
title: JavaScript と HTML と CSS で右クリックメニューを実装
layout: post
toc: true
---

## JavaScript
`id="contextmenu"` がメニュー本体で、`id="main"` がメニューを表示する対象の部分。

```js
const contextmenu = document.getElementById('contextmenu');
const main = document.getElementById("main");
main.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextmenu.style.left = e.pageX + 'px';
    contextmenu.style.top = e.pageY + 'px';
    contextmenu.style.display = 'block';
});
main.addEventListener('click', () => {
    contextmenu.style.display = 'none';
});
```

## HTML
```html
<div id="contextmenu">
    <ul>
        <li>削除</li>
    </ul>
</div>
```

## CSS
```css
#contextmenu {
    display: none;
    position: fixed;
    left: 0;
    top: 0;
    border-radius: 8px;
    background-color: #F9F9F9;
    border: solid 1px #E3E3E3;
    padding: 4px;
    width: 192px;
}

#contextmenu ul{
    padding-left: 0;
    margin: 0;
}

#contextmenu li {
    cursor: pointer;
    margin: 0;
    padding: 4.75px 0 4.75px 16px;
    border-radius: 4px;
    list-style: none;
    font-size: 14px;
}
```

※クリックしたときのイベントと機能は別途作成する必要がある。
