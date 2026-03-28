---
title: Use ResizeObserver to run when an element is resized
tags: [JavaScript]
image: /img/ogp/2024-03-23-js-resizeelement.png
---

<p>Define the element in your HTML as follows:</p>

<pre><code class="language-html">&lt;div id="element" style="height: 80px; width: 100%; background: #888; line-height: 80px; font-size: 36px; text-align: center;"&gt;
    0
&lt;/div&gt;</code></pre>

<p>I have written the following JavaScript, which increments the count when the element is resized.</p>

<pre>
    <code>const resizeObserver = new ResizeObserver((entries) => {
   const element = document.getElementById("element");
   element.innerText = "" + (parseInt(element.innerText) + 1);
});
resizeObserver.observe(document.getElementById("element"));
</code>
</pre>

<p>You can resize the window to make the element larger or smaller and see the count up in action.</p>

<div id="element" style="height: 80px; width: 100%; background: #888; line-height: 80px; font-size: 36px; text-align: center;">0</div>

<script>
   const resizeObserver = new ResizeObserver((entries) => {
       const element = document.getElementById("element");
       element.innerText = "" + (parseInt(element.innerText) + 1);
   });
   resizeObserver.observe(document.getElementById("element"));
</script>