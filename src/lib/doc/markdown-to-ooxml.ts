import MarkdownIt from 'markdown-it';
import type {FontOption} from './fonts';

type Token = ReturnType<MarkdownIt['parse']>[number];

// プレビュー (render) と docx 変換 (parse) で同一インスタンスを共用し、解釈を一致させる
export const md = new MarkdownIt({html: false, linkify: true, typographer: true});

// 見出しレベル別フォントサイズ (半ポイント: 20/16/14/12/11/11pt)
const HEADING_SIZES = [40, 32, 28, 24, 22, 22];
const LIST_INDENT_TWIP = 720;
const QUOTE_INDENT_TWIP = 360;
const MONO_FONT = '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
const CODE_FILL = '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string;
  size?: number;
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

// w:rPr の子要素はスキーマ順 (rFonts → b → i → strike → color → sz → shd) に並べる
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
  if (style.code) parts.push(CODE_FILL);
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
  const out: string[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        // markdown-it は ***text*** 等で空テキストトークンを挟むため、空 run は出さない
        if (t.content) out.push(textRun(t.content, {...base, bold, italic, strike}, boldFonts));
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
        out.push(textRun(t.content, {...base, bold, italic, strike, code: true}, boldFonts));
        break;
      case 'softbreak':
        out.push(textRun(' ', {...base, bold, italic, strike}, boldFonts));
        break;
      case 'hardbreak':
        out.push('<w:br/>');
        break;
      case 'image':
      case 'link_open':
      case 'link_close':
        break;
      default:
        if (t.content) out.push(textRun(t.content, {...base, bold, italic, strike}, boldFonts));
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

export function markdownToDocumentXml(src: string, font: FontOption): string {
  const boldFonts: BoldFonts = {eastAsia: font.boldEastAsia, latin: font.boldLatin};
  const tokens = md.parse(src, {});
  const paragraphs: string[] = [];
  const listStack: {type: 'bullet' | 'ordered'; counter: number}[] = [];
  let pendingMarker: string | null = null;
  let blockquoteDepth = 0;

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
          buildParagraph('<w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>', runs),
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
      case 'inline':
        // 未対応ブロック (テーブル等) 内のテキストを素の段落として出力し、内容の消失を防ぐ
        pushInlineParagraph(t);
        break;
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
