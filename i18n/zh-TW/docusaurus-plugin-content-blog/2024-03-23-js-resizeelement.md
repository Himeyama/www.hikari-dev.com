---
title: 使用 ResizeObserver 在元素大小改變時執行處理
tags: [JavaScript]
image: /img/ogp/2024-03-23-js-resizeelement.webp
---

<p>在 HTML 中定義元素如下：</p>

<pre><code class="language-html">&lt;div id="element" style="height: 80px; width: 100%; background: #888; line-height: 80px; font-size: 36px; text-align: center;"&gt;
    0
&lt;/div&gt;</code></pre>

<p>以下 JavaScript 程式碼會在元素大小改變時將計數加一。</p>

<pre>
    <code>const resizeObserver = new ResizeObserver((entries) => {
   const element = document.getElementById("element");
   element.innerText = "" + (parseInt(element.innerText) + 1);
});
resizeObserver.observe(document.getElementById("element"));
</code>
</pre>

<p>您可以調整視窗大小來讓元素變大或變小，並觀察計數遞增的效果。</p>

<div id="element" style="height: 80px; width: 100%; background: #888; line-height: 80px; font-size: 36px; text-align: center;">0</div>

<script>
   const resizeObserver = new ResizeObserver((entries) => {
       const element = document.getElementById("element");
       element.innerText = "" + (parseInt(element.innerText) + 1);
   });
   resizeObserver.observe(document.getElementById("element"));
</script>
