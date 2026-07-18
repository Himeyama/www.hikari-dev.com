import MarkdownIt from 'markdown-it';
import type {FontOption} from './fonts';

type Token = ReturnType<MarkdownIt['parse']>[number];

// プレビュー (render) と docx 変換 (parse) で同一インスタンスを共用し、解釈を一致させる
// html: true により <br> <u> <sup> <sub> <mark> 等のインラインタグを透過させる (プレビューは DOMPurify でサニタイズ)
export const md = new MarkdownIt({html: true, linkify: true, typographer: true});

// 見出しレベル別フォントサイズ (半ポイント: 20/16/14/12/11/11pt)
const HEADING_SIZES = [40, 32, 28, 24, 22, 22];
const LIST_INDENT_TWIP = 720;
const QUOTE_INDENT_TWIP = 360;
const MONO_FONT = '<w:rFonts w:ascii="Cascadia Code" w:hAnsi="Cascadia Code"/>';
const CODE_FILL = '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
  highlight?: string;
  vertAlign?: 'superscript' | 'subscript';
  code?: boolean;
  color?: string;
  size?: number;
}

// <tag>, </tag>, <tag/> を解析する。マッチしない (コメント等) 場合は null
function parseHtmlTag(raw: string): {name: string; closing: boolean} | null {
  const m = raw.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>$/);
  if (!m) return null;
  return {name: m[2].toLowerCase(), closing: m[1] === '/'};
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 太字時だけ差し替えたいフォント (実体の Bold がないファミリー用)
interface BoldFonts {
  eastAsia?: string;
  latin?: string;
}

// w:rPr の子要素はスキーマ順 (rFonts → b → i → strike → color → sz → highlight → u → shd → vertAlign) に並べる
function runProps(style: RunStyle, boldFonts?: BoldFonts): string {
  const parts: string[] = [];
  if (style.code) parts.push(MONO_FONT);
  else if (style.bold && (boldFonts?.eastAsia || boldFonts?.latin)) {
    const attrs: string[] = [];
    if (boldFonts.latin) {
      const f = escapeXml(boldFonts.latin);
      attrs.push(`w:ascii="${f}"`, `w:hAnsi="${f}"`);
    }
    if (boldFonts.eastAsia) attrs.push(`w:eastAsia="${escapeXml(boldFonts.eastAsia)}"`);
    parts.push(`<w:rFonts ${attrs.join(' ')}/>`);
  }
  if (style.bold) parts.push('<w:b/>');
  if (style.italic) parts.push('<w:i/>');
  if (style.strike) parts.push('<w:strike/>');
  if (style.color) parts.push(`<w:color w:val="${style.color}"/>`);
  if (style.size) parts.push(`<w:sz w:val="${style.size}"/>`);
  if (style.highlight) parts.push(`<w:highlight w:val="${style.highlight}"/>`);
  if (style.underline) parts.push('<w:u w:val="single"/>');
  if (style.code) parts.push(CODE_FILL);
  if (style.vertAlign) parts.push(`<w:vertAlign w:val="${style.vertAlign}"/>`);
  return parts.length > 0 ? `<w:rPr>${parts.join('')}</w:rPr>` : '';
}

function textRun(text: string, style: RunStyle, boldFonts?: BoldFonts): string {
  return `<w:r>${runProps(style, boldFonts)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

// 各 run (または <w:br/>) を 1 要素とする配列を返す。整形時に 1 行 1 要素で並べる
function renderRuns(tokens: Token[], base: RunStyle, boldFonts?: BoldFonts): string[] {
  let bold = base.bold ?? false;
  let italic = base.italic ?? false;
  let strike = base.strike ?? false;
  let underline = base.underline ?? false;
  let highlight = base.highlight;
  let vertAlign = base.vertAlign;
  const out: string[] = [];
  const current = (): RunStyle => ({...base, bold, italic, strike, underline, highlight, vertAlign});
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        // markdown-it は ***text*** 等で空テキストトークンを挟むため、空 run は出さない
        if (t.content) out.push(textRun(t.content, current(), boldFonts));
        break;
      case 'strong_open':
        bold = true;
        break;
      case 'strong_close':
        bold = base.bold ?? false;
        break;
      case 'em_open':
        italic = true;
        break;
      case 'em_close':
        italic = base.italic ?? false;
        break;
      case 's_open':
        strike = true;
        break;
      case 's_close':
        strike = base.strike ?? false;
        break;
      case 'code_inline':
        out.push(textRun(t.content, {...current(), code: true}, boldFonts));
        break;
      case 'softbreak':
        out.push(textRun(' ', current(), boldFonts));
        break;
      case 'hardbreak':
        out.push('<w:br/>');
        break;
      case 'html_inline': {
        // <br> <b/strong> <i/em> <u> <s/strike/del> <sup> <sub> <mark> を装飾トグルとして解釈し、
        // それ以外の未対応タグ (div, span 等) はテキストとして出力せず読み飛ばす
        const tag = parseHtmlTag(t.content);
        if (!tag) break;
        switch (tag.name) {
          case 'br':
            out.push('<w:br/>');
            break;
          case 'b':
          case 'strong':
            bold = tag.closing ? (base.bold ?? false) : true;
            break;
          case 'i':
          case 'em':
            italic = tag.closing ? (base.italic ?? false) : true;
            break;
          case 'u':
            underline = tag.closing ? (base.underline ?? false) : true;
            break;
          case 's':
          case 'strike':
          case 'del':
            strike = tag.closing ? (base.strike ?? false) : true;
            break;
          case 'sup':
            vertAlign = tag.closing ? base.vertAlign : 'superscript';
            break;
          case 'sub':
            vertAlign = tag.closing ? base.vertAlign : 'subscript';
            break;
          case 'mark':
            highlight = tag.closing ? base.highlight : 'yellow';
            break;
          default:
            break;
        }
        break;
      }
      case 'image':
      case 'link_open':
      case 'link_close':
        break;
      default:
        if (t.content) out.push(textRun(t.content, current(), boldFonts));
    }
  }
  return out;
}

// 要素間の空白は WordprocessingML では無意味なので、整形しても docx は有効なまま
// (テキストは <w:t> 内にのみ存在し、textRun が 1 行に閉じている)
const P_INDENT = '    ';
const CHILD_INDENT = '      ';

function buildParagraph(pPr: string, children: string[]): string {
  const lines = [`${P_INDENT}<w:p>`];
  if (pPr) lines.push(`${CHILD_INDENT}${pPr}`);
  for (const c of children) lines.push(`${CHILD_INDENT}${c}`);
  lines.push(`${P_INDENT}</w:p>`);
  return lines.join('\n');
}

const TBL_INDENT = '    ';
const TR_INDENT = '      ';
const TC_INDENT = '        ';
const CELL_P_INDENT = '          ';
const CELL_RUN_INDENT = '            ';
const TABLE_HEADER_FILL = '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
const TABLE_BORDERS =
  '<w:tblBorders>' +
  '<w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '<w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '<w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>' +
  '</w:tblBorders>';

// 列タイトル (th) は左寄せ・ヘッダー網掛けにする。本文セル (td) は既定の左寄せのまま
function buildTableCell(runs: string[], header: boolean): string {
  const lines = [`${TC_INDENT}<w:tc>`];
  if (header) lines.push(`${CELL_P_INDENT}<w:tcPr>${TABLE_HEADER_FILL}</w:tcPr>`);
  lines.push(`${CELL_P_INDENT}<w:p>`);
  if (header) lines.push(`${CELL_RUN_INDENT}<w:pPr><w:jc w:val="left"/></w:pPr>`);
  for (const r of runs) lines.push(`${CELL_RUN_INDENT}${r}`);
  lines.push(`${CELL_P_INDENT}</w:p>`);
  lines.push(`${TC_INDENT}</w:tc>`);
  return lines.join('\n');
}

function buildTableRow(cells: string[]): string {
  return [`${TR_INDENT}<w:tr>`, ...cells, `${TR_INDENT}</w:tr>`].join('\n');
}

function buildTable(rows: string[], columnCount: number): string {
  const grid = Array.from({length: columnCount}, () => `${CELL_P_INDENT}<w:gridCol/>`);
  return [
    `${TBL_INDENT}<w:tbl>`,
    `${TR_INDENT}<w:tblPr><w:tblW w:w="5000" w:type="pct"/>${TABLE_BORDERS}</w:tblPr>`,
    `${TR_INDENT}<w:tblGrid>`,
    ...grid,
    `${TR_INDENT}</w:tblGrid>`,
    ...rows,
    `${TBL_INDENT}</w:tbl>`,
  ].join('\n');
}

export function markdownToDocumentXml(src: string, font: FontOption): string {
  const boldFonts: BoldFonts = {eastAsia: font.boldEastAsia, latin: font.boldLatin};
  const tokens = md.parse(src, {});
  const paragraphs: string[] = [];
  const listStack: {type: 'bullet' | 'ordered'; counter: number}[] = [];
  let pendingMarker: string | null = null;
  let blockquoteDepth = 0;
  let inHeaderRow = false;
  let tableRows: string[] = [];
  let rowCells: string[] = [];
  let tableColumnCount = 0;

  // w:pPr の子要素はスキーマ順 (pBdr → shd → spacing → ind) に並べる
  const blockContext = (extraPPr: string[] = []): {pPr: string; base: RunStyle} => {
    const parts: string[] = [];
    const base: RunStyle = {};
    if (blockquoteDepth > 0) {
      parts.push('<w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="AAAAAA"/></w:pBdr>');
      base.color = '666666';
    }
    parts.push(...extraPPr);
    const indent =
      listStack.length * LIST_INDENT_TWIP + (blockquoteDepth > 0 ? QUOTE_INDENT_TWIP : 0);
    if (indent > 0) parts.push(`<w:ind w:left="${indent}"/>`);
    const pPr = parts.length > 0 ? `<w:pPr>${parts.join('')}</w:pPr>` : '';
    return {pPr, base};
  };

  const pushInlineParagraph = (inline: Token) => {
    const {pPr, base} = blockContext();
    const children: string[] = [];
    if (pendingMarker !== null) {
      children.push(textRun(pendingMarker, base, boldFonts));
      pendingMarker = null;
    }
    children.push(...renderRuns(inline.children ?? [], base, boldFonts));
    paragraphs.push(buildParagraph(pPr, children));
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'heading_open': {
        const level = Number(t.tag.slice(1)) || 1;
        const inline = tokens[i + 1];
        const base: RunStyle = {
          bold: true,
          italic: level >= 6,
          size: HEADING_SIZES[level - 1] ?? 22,
        };
        const runs =
          inline?.type === 'inline' ? renderRuns(inline.children ?? [], base, boldFonts) : [];
        paragraphs.push(
          buildParagraph(
            `<w:pPr><w:pStyle w:val="Heading${level}"/><w:spacing w:before="240" w:after="120"/></w:pPr>`,
            runs,
          ),
        );
        i += 2;
        break;
      }
      case 'paragraph_open': {
        const inline = tokens[i + 1];
        if (inline?.type === 'inline') {
          pushInlineParagraph(inline);
          i += 2;
        }
        break;
      }
      case 'bullet_list_open':
        listStack.push({type: 'bullet', counter: 1});
        break;
      case 'ordered_list_open':
        listStack.push({type: 'ordered', counter: Number(t.attrGet('start') ?? '1') || 1});
        break;
      case 'bullet_list_close':
      case 'ordered_list_close':
        listStack.pop();
        break;
      case 'list_item_open': {
        const list = listStack[listStack.length - 1];
        pendingMarker = list?.type === 'ordered' ? `${list.counter++}. ` : '• ';
        break;
      }
      case 'blockquote_open':
        blockquoteDepth++;
        break;
      case 'blockquote_close':
        blockquoteDepth--;
        break;
      case 'fence':
      case 'code_block': {
        const {pPr, base} = blockContext([CODE_FILL, '<w:spacing w:after="120"/>']);
        const lines = t.content.replace(/\n$/, '').split('\n');
        const children: string[] = [];
        lines.forEach((line, idx) => {
          if (idx > 0) children.push('<w:br/>');
          children.push(textRun(line, {...base, code: true, size: 20}));
        });
        paragraphs.push(buildParagraph(pPr, children));
        break;
      }
      case 'hr':
        paragraphs.push(
          buildParagraph(
            '<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="AAAAAA"/></w:pBdr></w:pPr>',
            [],
          ),
        );
        break;
      case 'table_open':
        tableRows = [];
        tableColumnCount = 0;
        break;
      case 'table_close':
        paragraphs.push(buildTable(tableRows, tableColumnCount));
        tableRows = [];
        break;
      case 'thead_open':
        inHeaderRow = true;
        break;
      case 'thead_close':
        inHeaderRow = false;
        break;
      case 'tr_open':
        rowCells = [];
        break;
      case 'tr_close':
        tableColumnCount = Math.max(tableColumnCount, rowCells.length);
        tableRows.push(buildTableRow(rowCells));
        break;
      case 'th_open':
      case 'td_open': {
        // 列タイトル (th) は太字と同じ扱いにする (boldFonts によるフォント差し替えも適用される)
        const header = t.type === 'th_open';
        const inline = tokens[i + 1];
        const runs =
          inline?.type === 'inline'
            ? renderRuns(inline.children ?? [], header ? {bold: true} : {}, boldFonts)
            : [];
        rowCells.push(buildTableCell(runs, header));
        i += 2;
        break;
      }
      case 'inline':
        // 未対応ブロック内のテキストを素の段落として出力し、内容の消失を防ぐ
        pushInlineParagraph(t);
        break;
      case 'html_block': {
        // ブロックレベルの HTML (<div>...</div> 等) はタグを除去し、残ったテキストのみ段落として出力する
        const text = t.content.replace(/<[^>]*>/g, '').trim();
        if (text) {
          const {pPr, base} = blockContext();
          paragraphs.push(buildParagraph(pPr, [textRun(text, base, boldFonts)]));
        }
        break;
      }
      default:
        break;
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '  <w:body>',
    ...paragraphs,
    '    <w:sectPr/>',
    '  </w:body>',
    '</w:document>',
    '',
  ].join('\n');
}
