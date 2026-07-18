---
title: docx をテキストエディタで作ってみた
authors: hikari
tags: [Word, XML, PowerShell]
image: /img/ogp/2026-07-18-handmade-docx.png
---

「docx って結局 zip なんでしょ? じゃあ XML を zip して拡張子変えれば docx になるのでは?」

そう思って実際にやってみたら、普通にダメだった。docx は zip 「でしかない」わけではなく、zip の中身が **OOXML (Office Open XML)** という決まったパッケージ構造に従っている必要がある。せっかくなので、どこまでやれば本物の docx になるのかを手を動かして確かめてみた。

{/* truncate */}

## 本物の docx を最小構成で組み立てる

docx として成立するために最低限必要なのは、次の 3 パーツだけ。

```
[Content_Types].xml           # パッケージ内の各パーツの MIME タイプ定義
_rels/.rels                   # ルートのリレーションシップ (docx 全体が word/document.xml を指す)
word/document.xml             # 本文。WordprocessingML 名前空間 (w:) で記述
```

本文にあたる `word/document.xml` は、独自 XML ではなく **Word 専用スキーマ** で書く必要がある。

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>太字</w:t></w:r>
      <w:r><w:t>のテストです。</w:t></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>
```

`<w:p>` が段落、`<w:r>` がその中のひとかたまりのテキスト (run)、`<w:t>` が実際の文字列。太字にしたければ `<w:rPr><w:b/></w:rPr>` を run に添える、というシンプルな作り。

残る 2 パーツも最小限でいい。

```xml
<!-- [Content_Types].xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
```

```xml
<!-- _rels/.rels -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
```

この 3 ファイルを、次のフォルダ構成のまま用意する。

```
scratch_docx/
├── [Content_Types].xml
├── _rels/
│   └── .rels
└── word/
    └── document.xml
```

## PowerShell で zip → docx にする

`[Content_Types].xml` のようなブラケット付きファイル名があると `Compress-Archive` はワイルドカードと誤認識して失敗するのでは、と身構えていたが、実際に試すと普通に成功した。フォルダの中身をまとめて指定すればいい。

```powershell
Compress-Archive -Path "scratch_docx\*" -DestinationPath "handmade.zip" -Force
Rename-Item "handmade.zip" "handmade.docx" -Force
```

ポイントは `scratch_docx\*` とフォルダの**中身**をワイルドカードで指定すること。`scratch_docx` フォルダそのものを指定すると `handmade.docx\scratch_docx\[Content_Types].xml` のような余計な階層ができてしまい、docx として認識されなくなる。

できあがった `handmade.docx` は当然バイナリなので、中身を覗きたければ `.zip` としてコピーしてから展開する。

```powershell
Copy-Item handmade.docx handmade_check.zip
Expand-Archive handmade_check.zip -DestinationPath handmade_extracted -Force
```

これで python-docx で開いてみると、ちゃんと段落もテキストも太字も読める。ここまでで、正真正銘の docx が完成したことになる。

## `[Content_Types].xml` と `_rels/.rels` は本当に必須なのか

作ってから気になったので、それぞれを抜いた版も作って壊してみた。結果はこの通り。

| 外したパーツ | 結果 |
| --- | --- |
| `[Content_Types].xml` なし | `KeyError: There is no item named '[Content_Types].xml' in the archive` |
| `_rels/.rels` なし | `KeyError: no relationship of type '...officeDocument' in collection` |

両方ともきっちり壊れた。理由を整理すると:

- **`[Content_Types].xml`**: zip 内の各パーツ (`word/document.xml` など) が何の MIME タイプかを宣言している。これがないと、リーダーは各 XML をどう解釈すべきか分からない
- **`_rels/.rels`**: パッケージのルートリレーションシップ。「どのパーツがメイン文書か」 (`officeDocument` タイプの関係) をここで宣言している。これがないと、zip の中に `word/document.xml` があっても、それが本文だという手がかりがどこにもない

これは docx が準拠している **OPC (Open Packaging Conventions)** という仕様でパッケージのエントリーポイントとして規定されているもので、省略可能なオプションではなく必須パーツだった。つまり `word/document.xml` の中身がどれだけ正しくても、この 2 つのどちらかが欠けた時点でアウト。`[Content_Types].xml` + `_rels/.rels` + `word/document.xml` の 3 点セットが、docx として成立する本当の最小構成ということになる。

## まとめ

- docx は zip だが、中身が OOXML というパッケージ構造に従っていないと開けない
- 最小構成は `[Content_Types].xml` / `_rels/.rels` / `word/document.xml` の 3 ファイルだけ
- `word/document.xml` は WordprocessingML (`<w:document>` `<w:p>` `<w:r>` `<w:t>` ...) というスキーマで書く必要がある。他のスキーマの XML をそのまま突っ込んでも読めない
- PowerShell の `Compress-Archive` でも zip 化できる。ただし対象フォルダの**中身** (`フォルダ\*`) を指定すること。フォルダごと指定すると余計な階層ができて docx として認識されない

この手作りアプローチは、docx の仕組みそのものを理解したいときには向いている。ただし見出しスタイルや表、画像などを増やしていくと `styles.xml` や `numbering.xml`、リレーションシップの管理が一気に複雑になるので、実用的な変換をしたいだけなら素直にライブラリやツールを使うほうが楽、というのが今回触ってみた実感。
