---
title: 用文字編輯器手工打造 docx
authors: hikari
tags: [Word, XML, PowerShell]
image: /img/ogp/2026-07-18-handmade-docx.png
---

「docx 說到底不就是 zip 嗎? 那把 XML 壓成 zip 再改個副檔名，不就變成 docx 了?」

抱著這個想法實際試了一下，結果理所當然地失敗了。docx 並不「只是」zip 而已，zip 裡的內容必須遵循一套固定的封裝結構，也就是 **OOXML (Office Open XML)**。既然都動手了，就順便實際驗證一下，到底要做到什麼程度才能做出貨真價實的 docx。

{/* truncate */}

## 以最小結構組出真正的 docx

要成立為 docx，最低限度只需要以下 3 個部件。

```
[Content_Types].xml           # 定義封裝內各部件的 MIME 類型
_rels/.rels                   # 根層級的關聯 (整個 docx 指向 word/document.xml)
word/document.xml             # 本文。以 WordprocessingML 命名空間 (w:) 撰寫
```

作為本文的 `word/document.xml` 不能是自訂 XML，必須用 **Word 專用的結構描述 (schema)** 來撰寫。

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

`<w:p>` 是段落，`<w:r>` 是段落中的一段文字 (run)，`<w:t>` 則是實際的字串。想要粗體，就在 run 裡加上 `<w:rPr><w:b/></w:rPr>`，構造相當簡單。

剩下的 2 個部件也只要最小限度即可。

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

把這 3 個檔案照著以下的資料夾結構準備好。

```
scratch_docx/
├── [Content_Types].xml
├── _rels/
│   └── .rels
└── word/
    └── document.xml
```

## 用 PowerShell 把 zip 變成 docx

原本還提防像 `[Content_Types].xml` 這種帶方括號的檔名會被 `Compress-Archive` 誤判成萬用字元而失敗，實際一試卻順利成功了。只要一次指定資料夾裡的全部內容即可。

```powershell
Compress-Archive -Path "scratch_docx\*" -DestinationPath "handmade.zip" -Force
Rename-Item "handmade.zip" "handmade.docx" -Force
```

重點是要像 `scratch_docx\*` 這樣，用萬用字元指定資料夾的**內容**。如果指定 `scratch_docx` 資料夾本身，就會多出一層像 `handmade.docx\scratch_docx\[Content_Types].xml` 的多餘階層，導致無法被識別為 docx。

做出來的 `handmade.docx` 當然是二進位檔，想看裡面的內容，就先複製成 `.zip` 再解壓縮。

```powershell
Copy-Item handmade.docx handmade_check.zip
Expand-Archive handmade_check.zip -DestinationPath handmade_extracted -Force
```

接著用 python-docx 開啟，段落、文字、粗體全都能正確讀出。到這裡，一個如假包換的 docx 就完成了。

## `[Content_Types].xml` 和 `_rels/.rels` 真的是必要的嗎

做完之後好奇心又來了，於是分別做了拿掉其中一個部件的版本來破壞看看。結果如下。

| 拿掉的部件 | 結果 |
| --- | --- |
| 沒有 `[Content_Types].xml` | `KeyError: There is no item named '[Content_Types].xml' in the archive` |
| 沒有 `_rels/.rels` | `KeyError: no relationship of type '...officeDocument' in collection` |

兩個都確實壞掉了。整理一下原因:

- **`[Content_Types].xml`**: 宣告 zip 內各部件 (例如 `word/document.xml`) 是什麼 MIME 類型。少了它，讀取端就不知道該如何解讀各個 XML
- **`_rels/.rels`**: 封裝的根層級關聯。「哪個部件是主文件」 (`officeDocument` 類型的關聯) 就是在這裡宣告的。少了它，就算 zip 裡有 `word/document.xml`，也沒有任何線索指出它就是本文

這兩者在 docx 所遵循的 **OPC (Open Packaging Conventions)** 規範中被規定為封裝的進入點，並不是可省略的選項，而是必要部件。換句話說，不管 `word/document.xml` 的內容多正確，只要缺了這 2 個之中的任何一個就出局。`[Content_Types].xml` + `_rels/.rels` + `word/document.xml` 這 3 件組，才是 docx 得以成立的真正最小結構。

## 總結

- docx 雖然是 zip，但內容不遵循 OOXML 封裝結構就打不開
- 最小結構只有 `[Content_Types].xml` / `_rels/.rels` / `word/document.xml` 這 3 個檔案
- `word/document.xml` 必須用 WordprocessingML (`<w:document>` `<w:p>` `<w:r>` `<w:t>` ...) 這套結構描述來撰寫。把其他結構描述的 XML 直接塞進去是讀不出來的
- 用 PowerShell 的 `Compress-Archive` 也能壓成 zip。但要指定目標資料夾的**內容** (`資料夾\*`)。指定整個資料夾會多出多餘的階層，導致無法被識別為 docx

這種手工打造的做法，很適合想理解 docx 本身運作機制的時候。不過一旦要加上標題樣式、表格、圖片等內容，`styles.xml`、`numbering.xml` 以及關聯的管理就會一口氣變得複雜，所以如果只是想做實用的轉換，老老實實用現成的函式庫或工具會輕鬆得多 —— 這是這次動手玩下來的實際感想。
