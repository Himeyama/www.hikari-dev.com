---
title: 在 Windows 上安裝 LaTeX (日文) 環境並產生 PDF 的步驟
authors: hikari
tags: [LaTeX, Windows, MiKTeX]
image: /img/ogp/2026-07-19-windows-latex-miktex-ltjsarticle.webp
---

本文整理了將 `document.tex`(採用 `ltjsarticle` 文件類別，以 LuaTeX-ja 為前提)以 LuaLaTeX 轉換成 PDF 所需的環境建置步驟。以 Windows + winget 為前提。

{/* truncate */}

## 1. 安裝 TeX 發行版

透過 winget 安裝 [MiKTeX](https://miktex.org/)。

```powershell
winget install MiKTeX.MiKTeX --accept-package-agreements --accept-source-agreements --silent
```

預設會安裝在使用者本機路徑 (例如 `%LOCALAPPDATA%\Programs\MiKTeX`)。剛安裝完成時，目前的 shell `PATH` 有時尚未更新，此時可開啟新的終端機，或是像下面這樣暫時將其加入 `PATH`。

```powershell
$miktexBin = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
$env:PATH = "$miktexBin;$env:PATH"
```

## 2. 啟用套件自動安裝

MiKTeX 可以在編譯時依需求自動取得缺少的套件 (`luatexja`、`ltjsarticle`、`haranoaji` 字型等)。以下指令用來啟用自動安裝 (僅需執行一次)。

```powershell
initexmf --set-config-value [MPM]AutoInstall=1
```

啟用後，執行 `lualatex` 所需的套件 (日文排版所需的整套 `luatexja`、隨附的 Haranoaji 字型等) 會自動下載並安裝，不需要手動選取套件集合。

## 3. 編譯

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- 第一次編譯時會下載缺少的套件，可能需要花費數分鐘。
- 為了正確產生交互參照與書籤 (hyperref)，通常需要連續執行兩次。

```powershell
lualatex -interaction=nonstopmode document.tex
lualatex -interaction=nonstopmode document.tex
```

成功後會產生 `document.pdf`。

```
Output written on document.pdf (2 pages, ...)
```

## 4. 確認結果

可以擷取 PDF 中的文字，確認日文是否排版正確 (`pdftotext` 已隨 MiKTeX 附帶)。

```powershell
pdftotext document.pdf - | Select-Object -First 30
```

## 使用的字型

`ltjsarticle` (LuaTeX-ja) 在未明確指定字型時，預設會使用 **Haranoaji (原ノ味フォント)**。由於此字型會透過 MiKTeX 的隨選安裝自動取得，因此不論 Windows 是否內建標準字型 (游明朝、游黑體等)，在任何環境下都能呈現相同的排版效果。

## 5. 之後的編譯方式

環境建置完成後，之後只需執行以下指令即可重新產生 PDF。若在尚未設定 `PATH` 的新終端機中操作，請先執行步驟 1 的 `$env:PATH` 設定。

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- 若想更新目錄、交互參照或書籤，請在每次修改後連續執行兩次。
- 若要編譯 `document.tex` 以外的檔案，請替換檔名部分 (例如：`lualatex -interaction=nonstopmode other.tex`)。
- `.aux`、`.log`、`.out` 等中間檔案即使刪除，重新編譯時也會自動產生，若不再需要可如下刪除。

```powershell
Remove-Item document.aux, document.log, document.out -ErrorAction SilentlyContinue
```

## 疑難排解

### `listings` 套件無法辨識 `language=javascript`

MiKTeX 隨附的 `listings` 套件並未內建支援 JavaScript 語法高亮 (`lstlang*.sty` 中沒有對應定義)。因此在 `document.tex` 的 `\lstset{...}` 之前加入以下 `\lstdefinelanguage{javascript}{...}` 定義來解決此問題。

```latex
\lstdefinelanguage{javascript}{
  keywords={break,case,catch,class,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,in,instanceof,let,new,return,super,switch,this,throw,try,typeof,var,void,while,with,yield,async,await,static,get,set,of},
  keywordstyle=\bfseries,
  ndkeywords={true,false,null,undefined},
  ndkeywordstyle=\bfseries,
  sensitive=true,
  comment=[l]{//},
  morecomment=[s]{/*}{*/},
  morestring=[b]',
  morestring=[b]",
  morestring=[b]`,
  stringstyle=\itshape,
}
```

### 找不到 `lualatex` 指令

剛安裝完成時，`PATH` 有時尚未更新。請重新開啟終端機，或執行步驟 1 的 `$env:PATH` 設定。

### `initexmf: major issue: So far, you have not checked for MiKTeX updates.`

這是第一次執行時出現的通知訊息，編譯本身會照常繼續進行，`document.pdf` 仍會正常產生。若在意此訊息，可透過 `miktex-console` 檢查更新。
