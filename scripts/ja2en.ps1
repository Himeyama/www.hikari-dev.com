# すべての .md ファイルに対して ts-node を実行
Get-ChildItem -Recurse -Filter blog\*.md | ForEach-Object {
    ts-node .\bin\ja2en.ts -i $_.FullName
}