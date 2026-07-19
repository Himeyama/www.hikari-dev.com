---
title: Windows へ LaTeX (日本語) の環境をインストールして PDF を作成する手順
authors: hikari
tags: [LaTeX, Windows, MiKTeX]
image: /img/ogp/2026-07-19-windows-latex-miktex-ltjsarticle.webp
---

`document.tex`(`ltjsarticle` クラス、LuaTeX-ja 前提)を LuaLaTeX で PDF 化するための環境構築手順をまとめる。Windows + winget を前提とする。

{/* truncate */}

## 1. TeX ディストリビューションのインストール

[MiKTeX](https://miktex.org/) を winget でインストールする。

```powershell
winget install MiKTeX.MiKTeX --accept-package-agreements --accept-source-agreements --silent
```

デフォルトではユーザーローカルにインストールされる (例: `%LOCALAPPDATA%\Programs\MiKTeX`)。インストール直後は現在のシェルの `PATH` に反映されないことがあるため、新しいターミナルを開くか、以下のように一時的に `PATH` へ追加する。

```powershell
$miktexBin = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64"
$env:PATH = "$miktexBin;$env:PATH"
```

## 2. パッケージの自動インストールを有効化

MiKTeX はビルド時に不足パッケージ (`luatexja`、`ltjsarticle`、`haranoaji` フォントなど) をオンデマンドで自動取得できる。以下のコマンドで自動インストールを有効化する (初回のみ)。

```powershell
initexmf --set-config-value [MPM]AutoInstall=1
```

これにより、`lualatex` 実行時に必要なパッケージ (日本語組版に必要な `luatexja` 一式や、同梱の Haranoaji フォントなど) が自動的にダウンロード・インストールされる。手動でのコレクション選択は不要である。

## 3. ビルド

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- 初回ビルドでは不足パッケージのダウンロードが走るため数分かかることがある。
- 相互参照・しおり (hyperref) を正しく確定させるため、通常は 2 回連続で実行する。

```powershell
lualatex -interaction=nonstopmode document.tex
lualatex -interaction=nonstopmode document.tex
```

成功すると `document.pdf` が生成される。

```
Output written on document.pdf (2 pages, ...)
```

## 4. 動作確認

PDF のテキストを抽出して日本語が正しく組版されているか確認できる (`pdftotext` は MiKTeX に同梱)。

```powershell
pdftotext document.pdf - | Select-Object -First 30
```

## 使用しているフォント

`ltjsarticle` (LuaTeX-ja) はフォントを明示指定しない場合、デフォルトで **Haranoaji (原ノ味フォント)** を使用する。このフォントは MiKTeX のオンデマンドインストールにより自動取得されるため、Windows 標準フォント (游明朝・游ゴシックなど) の有無に依存せず、どの環境でも同じ見た目で再現できる。

## 5. 2 回目以降のコンパイル方法

環境構築が済んでいれば、以降は次のコマンドだけで PDF を再生成できる。`PATH` が通っていない新しいターミナルの場合は、先に手順 1 の `$env:PATH` 設定を行う。

```powershell
cd C:\Users\hikari\lualatex
lualatex -interaction=nonstopmode document.tex
```

- 目次・相互参照・しおりを更新したい場合は、変更のたびに 2 回連続で実行する。
- `document.tex` 以外のファイルをコンパイルする場合は、ファイル名部分を置き換える (例: `lualatex -interaction=nonstopmode other.tex`)。
- `.aux` `.log` `.out` などの中間ファイルは削除しても再ビルドで自動生成される。不要になった場合は次のように削除できる。

```powershell
Remove-Item document.aux, document.log, document.out -ErrorAction SilentlyContinue
```

## トラブルシューティング

### `listings` パッケージが `language=javascript` を認識しない

MiKTeX 同梱の `listings` パッケージは JavaScript のシンタックスハイライトを標準サポートしていない (`lstlang*.sty` に定義が存在しない)。`document.tex` の `\lstset{...}` の直前に以下のように `\lstdefinelanguage{javascript}{...}` を追加して回避している。

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

### `lualatex` コマンドが見つからない

インストール直後は `PATH` が反映されていないことがある。ターミナルを開き直すか、手順 1 の `$env:PATH` 設定を実行する。

### `initexmf: major issue: So far, you have not checked for MiKTeX updates.`

初回実行時に出る通知メッセージである。ビルド自体は継続され、`document.pdf` は正常に生成される。気になる場合は `miktex-console` からアップデート確認を行う。
