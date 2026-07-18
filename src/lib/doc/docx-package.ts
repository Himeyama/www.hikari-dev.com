import type {FontOption} from './fonts';

// docx (OPC パッケージ) の最小 4 パーツ構成。
// [Content_Types].xml と _rels/.rels の 2 つはどちらが欠けても docx として開けない必須パーツ。
export const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
`;

export const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`;

// document.xml -> styles.xml / numbering.xml の関連付け。これが無いと Word は docDefaults や
// 箇条書き・番号付きリストの numPr 参照先を解決できない。
export const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
`;

// 箇条書き用 (abstractNumId=0) は全 9 レベル共通で "•" を使う。インデント幅は段落側の w:ind で
// 直接制御しているため、レベル側の ind は 0 にして二重インデントを避ける。
const BULLET_ABSTRACT_NUM = `  <w:abstractNum w:abstractNumId="0">
${Array.from({length: 9}, (_, lvl) => `    <w:lvl w:ilvl="${lvl}">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="0" w:hanging="0"/></w:pPr>
    </w:lvl>`).join('\n')}
  </w:abstractNum>`;

// 番号付きリスト用 (abstractNumId=1)。個々の <ol> ごとに w:num で参照し、開始番号を
// lvlOverride/startOverride で上書きすることで、リストごとに独立して番号を振り直せるようにする。
const ORDERED_ABSTRACT_NUM = `  <w:abstractNum w:abstractNumId="1">
${Array.from({length: 9}, (_, lvl) => `    <w:lvl w:ilvl="${lvl}">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%${lvl + 1}."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="0" w:hanging="0"/></w:pPr>
    </w:lvl>`).join('\n')}
  </w:abstractNum>`;

export const BULLET_NUM_ID = 1;

// markdown の <ol> 1 つごとに独立した numId を割り当てる (ordered-list 出現順)。
// 開始番号は markdown-it の attrGet('start') に基づき startOverride で反映する。
export function buildNumberingXml(orderedListStarts: number[]): string {
  const orderedNums = orderedListStarts
    .map((start, idx) => {
      const numId = idx + 2;
      return `  <w:num w:numId="${numId}">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0">
      <w:startOverride w:val="${start}"/>
    </w:lvlOverride>
  </w:num>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${BULLET_ABSTRACT_NUM}
${ORDERED_ABSTRACT_NUM}
  <w:num w:numId="${BULLET_NUM_ID}">
    <w:abstractNumId w:val="0"/>
  </w:num>
${orderedNums}
</w:numbering>
`;
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 見出しレベル別フォントサイズ (半ポイント: 20/16/14/12/11/11pt)。markdown-to-ooxml.ts の
// HEADING_SIZES と同じ値を Heading1-6 スタイルの sz にも設定し、pStyle 未反映の環境でも体裁が崩れないようにする
const HEADING_STYLE_SIZES = [40, 32, 28, 24, 22, 22];

// docDefaults だけでは Word 内蔵の既定 Normal スタイルに優先度で負けて無視されることがあるため、
// Normal 段落スタイルにも明示的に同じ rFonts を設定し、本文フォントを確実に反映させる
function buildStylesXml(family: string): string {
  const f = escapeXmlAttr(family);
  const rFonts = `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}"/>`;
  // w:pStyle="HeadingN" が Word の「見出し」段落スタイルとして認識されるよう、
  // Heading1-6 を明示的に定義する (これが無いと見出しがナビゲーション/目次に反映されない)
  const headingStyles = HEADING_STYLE_SIZES.map((size, idx) => {
    const level = idx + 1;
    return `  <w:style w:type="paragraph" w:styleId="Heading${level}">
    <w:name w:val="heading ${level}"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:outlineLvl w:val="${idx}"/>
    </w:pPr>
    <w:rPr>${rFonts}<w:b/><w:sz w:val="${size}"/></w:rPr>
  </w:style>`;
  }).join('\n');
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
${headingStyles}
</w:styles>
`;
}

export async function buildDocxBlob(
  documentXml: string,
  font: FontOption,
  orderedListStarts: number[] = [],
): Promise<Blob> {
  const {default: JSZip} = await import('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.file('_rels/.rels', RELS_XML);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', DOCUMENT_RELS_XML);
  zip.file('word/styles.xml', buildStylesXml(font.family));
  zip.file('word/numbering.xml', buildNumberingXml(orderedListStarts));
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
