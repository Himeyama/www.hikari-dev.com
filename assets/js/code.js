var codes = document.getElementsByTagName("pre");
for (var i = 0; i < codes.length; i++) {
    var n = codes[i];
    var r = n.innerHTML.match(/.*\n/g);
    for (var j = 0; j < r.length; j++) {
        r[j] = "<code>".concat(r[j].replace(/\r?\n/g, ""), "</code>\n");
    }
    n.innerHTML = r.join("");
}
