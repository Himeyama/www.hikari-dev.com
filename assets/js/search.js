const options = {
    includeScore: true,
    keys: ['url', 'title']
};

const search_button = document.getElementById("search-button");
search_button.addEventListener('click', () => {
    search();
});

const search_text = document.getElementById("search-text");
search_text.addEventListener("input", () => {
    search();
});

const search = () => {
    const search_text = document.getElementById("search-text");
    const search_result = document.getElementById("search-result");
    search_result.innerHTML = "";
    const fuse = new Fuse(posts_data, options);
    const result = fuse.search(search_text.value);

    for (const page_info of result) {
        const url_link_tag = document.createElement("a");
        url_link_tag.className = "post-link";
        const archive_post = document.createElement("div");
        archive_post.className = "archive-post";
        url_link_tag.appendChild(archive_post);
        const post_time = document.createElement("time");
        post_time.className = "post-date";
        const post_link_area = document.createElement("div");
        post_link_area.className = "post-link-area";
        archive_post.appendChild(post_link_area);
        archive_post.appendChild(post_time);

        url_link_tag.href = page_info.item.url;
        post_link_area.innerText = page_info.item.title;

        const date = page_info.item.date;
        post_time.innerText = Wareki.date(date);
        search_result.appendChild(url_link_tag);
    }
}