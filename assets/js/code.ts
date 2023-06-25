let codes: HTMLCollection = document.getElementsByTagName("pre");
for(let i: number = 0; i < codes.length; i++){
    let n: Element = codes[i]
    let r: Array<string> = n.innerHTML.match(/.*\n/g)!
    for(let j: number = 0; j < r!.length; j++){
        r![j] = `<code>${r![j].replace(/\r?\n/g, "")}</code>\n`
    }
    n.innerHTML = r!.join("")
}
