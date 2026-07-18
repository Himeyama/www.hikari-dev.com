---
title: Building a docx by Hand in a Text Editor
authors: hikari
tags: [Word, XML, PowerShell]
image: /img/ogp/2026-07-18-handmade-docx.png
---

"A docx is just a zip, right? So if I zip up some XML and change the extension, I get a docx?"

I actually tried it, and it plainly failed. A docx is not *merely* a zip — the contents of the zip must follow a fixed package structure called **OOXML (Office Open XML)**. Since I was at it, I decided to find out hands-on exactly how far you have to go to produce a genuine docx.

{/* truncate */}

## Assembling a real docx with the minimal structure

The bare minimum required for a file to qualify as a docx is just these 3 parts.

```
[Content_Types].xml           # MIME type definitions for each part in the package
_rels/.rels                   # Root relationships (points the docx as a whole to word/document.xml)
word/document.xml             # Body text, written in the WordprocessingML namespace (w:)
```

The body, `word/document.xml`, cannot be arbitrary XML — it must be written in the **Word-specific schema**.

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

`<w:p>` is a paragraph, `<w:r>` is a run of text inside it, and `<w:t>` holds the actual string. If you want bold text, you attach `<w:rPr><w:b/></w:rPr>` to the run — a simple design.

The remaining 2 parts can also be minimal.

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

Lay out these 3 files in the following folder structure.

```
scratch_docx/
├── [Content_Types].xml
├── _rels/
│   └── .rels
└── word/
    └── document.xml
```

## Turning the zip into a docx with PowerShell

I braced myself expecting `Compress-Archive` to misinterpret bracketed file names like `[Content_Types].xml` as wildcards and fail, but in practice it just worked. Simply point it at the folder's contents all at once.

```powershell
Compress-Archive -Path "scratch_docx\*" -DestinationPath "handmade.zip" -Force
Rename-Item "handmade.zip" "handmade.docx" -Force
```

The key point is to specify the **contents** of the folder with a wildcard, as in `scratch_docx\*`. If you specify the `scratch_docx` folder itself, you end up with an extra layer like `handmade.docx\scratch_docx\[Content_Types].xml`, and the file is no longer recognized as a docx.

The resulting `handmade.docx` is of course binary, so if you want to peek inside, copy it to a `.zip` first and then extract it.

```powershell
Copy-Item handmade.docx handmade_check.zip
Expand-Archive handmade_check.zip -DestinationPath handmade_extracted -Force
```

Opening it with python-docx, the paragraphs, text, and bold formatting all read back correctly. At this point, a genuine, bona fide docx is complete.

## Are `[Content_Types].xml` and `_rels/.rels` really required?

Having built it, I got curious and made broken versions with each part removed. Here are the results.

| Removed part | Result |
| --- | --- |
| Without `[Content_Types].xml` | `KeyError: There is no item named '[Content_Types].xml' in the archive` |
| Without `_rels/.rels` | `KeyError: no relationship of type '...officeDocument' in collection` |

Both broke cleanly. To sort out why:

- **`[Content_Types].xml`**: declares the MIME type of each part in the zip (`word/document.xml` and so on). Without it, a reader has no idea how to interpret each XML file
- **`_rels/.rels`**: the package's root relationships. It declares "which part is the main document" (the `officeDocument` type relationship). Without it, even if `word/document.xml` exists inside the zip, there is no clue anywhere that it is the body

These are mandated as the package entry points by **OPC (Open Packaging Conventions)**, the specification docx conforms to — they are required parts, not optional extras. In other words, no matter how correct the contents of `word/document.xml` are, missing either of these two is game over. The trio of `[Content_Types].xml` + `_rels/.rels` + `word/document.xml` is the true minimal structure for a valid docx.

## Summary

- A docx is a zip, but it will not open unless its contents follow the OOXML package structure
- The minimal structure is just 3 files: `[Content_Types].xml` / `_rels/.rels` / `word/document.xml`
- `word/document.xml` must be written in the WordprocessingML schema (`<w:document>` `<w:p>` `<w:r>` `<w:t>` ...). XML in some other schema will not be readable even if you drop it in as is
- PowerShell's `Compress-Archive` works fine for creating the zip. Just be sure to specify the folder's **contents** (`folder\*`); specifying the folder itself adds an extra layer and the file is not recognized as a docx

This handmade approach is well suited to understanding how docx works under the hood. But once you start adding heading styles, tables, images, and so on, `styles.xml`, `numbering.xml`, and relationship management get complicated fast — so if all you want is practical conversion, my takeaway from this experiment is that you are better off just using a library or a tool.
