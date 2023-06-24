---
layout: default
title: アーカイブ
---

<ul class="posts" style="margin-top: 64px">
    {% for post in site.posts %}
    <li>
        <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
        <a class="post-link" href="{{ post.url | relative_url }}">{{ post.title }}</a>
    </li>
    {% endfor %}
</ul>
<script>
    let postedDates = document.getElementsByClassName("post-date");
    for(let i = 0; i < postedDates.length; i++){
        let date = postedDates[i].innerText
        if(date != ""){
            let warekiDate = Wareki.date(date)
            postedDates[i].innerText = warekiDate;
        }
    }
</script>