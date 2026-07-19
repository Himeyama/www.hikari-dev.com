---
title: How to Set Up a LaTeX (Japanese) Environment on Windows and Build PDFs
authors: hikari
tags: [LaTeX, Windows, MiKTeX]
image: /img/ogp/2026-07-19-windows-latex-miktex-ltjsarticle.webp
---

This post summarizes the steps for setting up an environment to produce a PDF from `document.tex` (using the `ltjsarticle` class, which assumes LuaTeX-ja) with LuaLaTeX. It assumes Windows + winget.

{/* truncate */}

## 1. Install a TeX distribution

Install [MiKTeX](https://miktex.org/) via winget.

```powershell
winget install MiKTeX.MiKTeX --accept-package-agreements --accept-source-agreements --silent
```

By default it installs to a user-local location (e.g. `%LOCALAPPDATA%\Programs\MiKTeX`). Immediately after installation, the current shell's `PATH` may not be updated yet, so either open a new terminal or temporarily add it to `PATH` as shown below.

```powershell
$miktexBin = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
$env:PATH = "$miktexBin;$env:PATH"
```

## 2. Enable automatic package installation

MiKTeX can fetch missing packages on demand at build time (`luatexja`, `ltjsarticle`, the `haranoaji` fonts, and so on). Enable automatic installation with the following command (only needed once).

```powershell
initexmf --set-config-value [MPM]AutoInstall=1
```

With this enabled, the packages required when running `lualatex` (the full `luatexja` set needed for Japanese typesetting, the bundled Haranoaji fonts, etc.) will be downloaded and installed automatically. There's no need to manually select package collections.

## 3. Build

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- The first build can take a few minutes since missing packages need to be downloaded.
- To correctly resolve cross-references and bookmarks (hyperref), you typically run it twice in a row.

```powershell
lualatex -interaction=nonstopmode document.tex
lualatex -interaction=nonstopmode document.tex
```

On success, `document.pdf` is generated.

```
Output written on document.pdf (2 pages, ...)
```

## 4. Verify the result

You can extract the text from the PDF to check that the Japanese text is typeset correctly (`pdftotext` ships with MiKTeX).

```powershell
pdftotext document.pdf - | Select-Object -First 30
```

## Fonts in use

When no font is explicitly specified, `ltjsarticle` (LuaTeX-ja) defaults to **Haranoaji (原ノ味フォント)**. Since this font is fetched automatically via MiKTeX's on-demand installation, the output looks the same on any machine, regardless of whether Windows' standard fonts (Yu Mincho, Yu Gothic, etc.) are present.

## 5. Compiling again later

Once the environment is set up, you can regenerate the PDF afterward with just the following command. In a fresh terminal where `PATH` isn't set up, run the `$env:PATH` setup from step 1 first.

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- If you want to update the table of contents, cross-references, or bookmarks, run it twice in a row after each change.
- To compile a file other than `document.tex`, substitute the filename (e.g. `lualatex -interaction=nonstopmode other.tex`).
- Intermediate files such as `.aux`, `.log`, and `.out` are regenerated automatically on rebuild, so they can be deleted safely. Remove them if you no longer need them:

```powershell
Remove-Item document.aux, document.log, document.out -ErrorAction SilentlyContinue
```

## Troubleshooting

### The `listings` package doesn't recognize `language=javascript`

The `listings` package bundled with MiKTeX doesn't support JavaScript syntax highlighting out of the box (there's no definition in `lstlang*.sty`). This is worked around by adding a `\lstdefinelanguage{javascript}{...}` block right before `\lstset{...}` in `document.tex`, as shown below.

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

### The `lualatex` command isn't found

Right after installation, `PATH` may not be updated yet. Reopen your terminal, or run the `$env:PATH` setup from step 1.

### `initexmf: major issue: So far, you have not checked for MiKTeX updates.`

This is a notification message that appears on the first run. The build continues regardless, and `document.pdf` is generated normally. If it bothers you, check for updates from `miktex-console`.
