import type {FontOption} from './fonts';

// docx (OPC パッケージ) の最小 4 パーツ構成。
// [Content_Types].xml と _rels/.rels の 2 つはどちらが欠けても docx として開けない必須パーツ。
export const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
`;

export const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`;

// document.xml -> styles.xml の関連付け。これが無いと Word は docDefaults を参照しない。
export const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
`;

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// docDefaults だけでは Word 内蔵の既定 Normal スタイルに優先度で負けて無視されることがあるため、
// Normal 段落スタイルにも明示的に同じ rFonts を設定し、本文フォントを確実に反映させる
function buildStylesXml(family: string): string {
  const f = escapeXmlAttr(family);
  const rFonts = `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>${rFonts}</w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>${rFonts}</w:rPr>
  </w:style>
</w:styles>
`;
}

export async function buildDocxBlob(documentXml: string, font: FontOption): Promise<Blob> {
  const {default: JSZip} = await import('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', RELS_XML);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', DOCUMENT_RELS_XML);
  zip.file('word/styles.xml', buildStylesXml(font.family));
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
