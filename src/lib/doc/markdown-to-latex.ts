import {md} from './markdown-to-ooxml';

type Token = ReturnType<typeof md.parse>[number];

// LaTeX の特殊文字をエスケープする (lstlisting 等の verbatim コンテキストでは呼ばない)。
// バックスラッシュを最初に処理し、その後で他の記号を置換する。
function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

// <tag>, </tag>, <tag/> を解析する。マッチしない (コメント等) 場合は null
function parseHtmlTag(raw: string): {name: string; closing: boolean} | null {
  const m = raw.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>$/);
  if (!m) return null;
  return {name: m[2].toLowerCase(), closing: m[1] === '/'};
}

// 装飾状態。適用中のものを外側から内側の順にラップする
interface InlineState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
}

// 素のテキストを現在の装飾状態でラップした LaTeX を返す。
// code (等幅) が有効なときはエスケープした中身を \texttt に入れる。
function wrapText(text: string, st: InlineState): string {
  let out = st.code ? `\\texttt{${escapeLatex(text)}}` : escapeLatex(text);
  if (st.strike) out = `\\sout{${out}}`;
  if (st.italic) out = `\\textit{${out}}`;
  if (st.bold) out = `\\textbf{${out}}`;
  return out;
}

// インライントークン列を LaTeX 文字列に変換する。markdown-to-ooxml.ts の renderRuns と
// 同じ状態機械 (strong/em/s の open/close, code_inline, softbreak/hardbreak, html_inline) を踏襲する。
function renderInline(tokens: Token[]): string {
  const st: InlineState = {bold: false, italic: false, strike: false, code: false};
  let out = '';
  let linkHref: string | null = null;
  let linkBuffer = '';
  // リンク中はテキストを linkBuffer に貯め、link_close で \href{url}{text} を組み立てる
  const emit = (s: string) => {
    if (linkHref !== null) linkBuffer += s;
    else out += s;
  };
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        if (t.content) emit(wrapText(t.content, st));
        break;
      case 'strong_open':
        st.bold = true;
        break;
      case 'strong_close':
        st.bold = false;
        break;
      case 'em_open':
        st.italic = true;
        break;
      case 'em_close':
        st.italic = false;
        break;
      case 's_open':
        st.strike = true;
        break;
      case 's_close':
        st.strike = false;
        break;
      case 'code_inline':
        emit(wrapText(t.content, {...st, code: true}));
        break;
      case 'softbreak':
        emit(' ');
        break;
      case 'hardbreak':
        emit('\\\\\n');
        break;
      case 'link_open':
        linkHref = t.attrGet('href') ?? '';
        linkBuffer = '';
        break;
      case 'link_close': {
        const url = linkHref ?? '';
        const href = url.replace(/([#%\\{}])/g, '\\$1');
        out += `\\href{${href}}{${linkBuffer}}`;
        linkHref = null;
        linkBuffer = '';
        break;
      }
      case 'image': {
        // 画像は alt を無視して \includegraphics に変換する
        const src = t.attrGet('src') ?? '';
        emit(`\\includegraphics{${src.replace(/([#%\\{}])/g, '\\$1')}}`);
        break;
      }
      case 'html_inline': {
        // <br> <b/strong> <i/em> <s/strike/del> <code> を装飾トグルとして解釈し、
        // 未対応タグ (span, div 等) は読み飛ばす
        const tag = parseHtmlTag(t.content);
        if (!tag) break;
        switch (tag.name) {
          case 'br':
            emit('\\\\\n');
            break;
          case 'b':
          case 'strong':
            st.bold = !tag.closing;
            break;
          case 'i':
          case 'em':
            st.italic = !tag.closing;
            break;
          case 's':
          case 'strike':
          case 'del':
            st.strike = !tag.closing;
            break;
          case 'code':
            st.code = !tag.closing;
            break;
          default:
            break;
        }
        break;
      }
      default:
        if (t.content) emit(wrapText(t.content, st));
    }
  }
  return out;
}

const HEADING_COMMANDS = [
  '\\section',
  '\\subsection',
  '\\subsubsection',
  '\\paragraph',
  '\\subparagraph',
  '\\subparagraph',
];

// markdown-it の table 区切り (:---: 等) から得たアラインメントを tabular の列指定にする
function columnAlign(style: string | undefined): string {
  if (!style) return 'l';
  if (style.includes('text-align:center')) return 'c';
  if (style.includes('text-align:right')) return 'r';
  return 'l';
}

const PREAMBLE = [
  '\\documentclass[11pt]{ltjsarticle}',
  '\\usepackage{amsmath,amssymb}',
  '\\usepackage{graphicx}',
  '\\usepackage[normalem]{ulem}',
  '\\usepackage{listings}',
  '\\usepackage{xcolor}',
  '\\usepackage[hidelinks]{hyperref}',
  '',
  '\\lstset{',
  '  basicstyle=\\ttfamily\\small,',
  '  breaklines=true,',
  '  columns=flexible,',
  '  frame=single,',
  '  framesep=6pt,',
  '  xleftmargin=6pt,',
  '  xrightmargin=6pt,',
  '}',
].join('\n');

// Markdown を LuaLaTeX (ltjsarticle, 日本語組版) の完全な .tex 文書に変換する。
export function markdownToLatex(src: string): string {
  const tokens = md.parse(src, {});
  const body: string[] = [];
  // リストのネスト種別 (bullet / ordered) をスタックで管理する
  const listStack: ('itemize' | 'enumerate')[] = [];
  let blockquoteDepth = 0;
  // 表の組み立て用の状態
  let tableAligns: string[] = [];
  let tableRows: string[] = [];
  let rowCells: string[] = [];
  let inHeaderRow = false;
  let headerRowCount = 0;

  const indent = () => '  '.repeat(listStack.length + blockquoteDepth);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'heading_open': {
        const level = Number(t.tag.slice(1)) || 1;
        const inline = tokens[i + 1];
        const text = inline?.type === 'inline' ? renderInline(inline.children ?? []) : '';
        const cmd = HEADING_COMMANDS[level - 1] ?? '\\subparagraph';
        body.push(`${cmd}{${text}}`);
        body.push('');
        i += 2;
        break;
      }
      case 'paragraph_open': {
        const inline = tokens[i + 1];
        if (inline?.type === 'inline') {
          const text = renderInline(inline.children ?? []);
          if (listStack.length > 0) {
            // リスト項目内の段落: \item は list_item_open では出さず、先頭段落にまとめて付ける
            body.push(`${indent()}${text}`);
          } else {
            body.push(`${indent()}${text}`);
            body.push('');
          }
          i += 2;
        }
        break;
      }
      case 'bullet_list_open':
        body.push(`${indent()}\\begin{itemize}`);
        listStack.push('itemize');
        break;
      case 'ordered_list_open':
        body.push(`${indent()}\\begin{enumerate}`);
        listStack.push('enumerate');
        break;
      case 'bullet_list_close':
      case 'ordered_list_close': {
        const kind = listStack.pop();
        body.push(`${indent()}\\end{${kind}}`);
        if (listStack.length === 0 && blockquoteDepth === 0) body.push('');
        break;
      }
      case 'list_item_open':
        body.push(`${indent()}\\item`);
        break;
      case 'blockquote_open':
        body.push(`${indent()}\\begin{quote}`);
        blockquoteDepth++;
        break;
      case 'blockquote_close':
        blockquoteDepth--;
        body.push(`${indent()}\\end{quote}`);
        if (listStack.length === 0 && blockquoteDepth === 0) body.push('');
        break;
      case 'fence':
      case 'code_block': {
        const lang = t.type === 'fence' && t.info ? t.info.trim().split(/\s+/)[0] : '';
        const code = t.content.replace(/\n$/, '');
        // listings の language 名と一致するものだけ渡す (未知の言語指定はプレーン表示にフォールバック)
        const langOpt = /^[A-Za-z+#-]+$/.test(lang) ? `[language=${lang}]` : '';
        body.push(`\\begin{lstlisting}${langOpt}`);
        body.push(code);
        body.push('\\end{lstlisting}');
        body.push('');
        break;
      }
      case 'hr':
        body.push('\\par\\noindent\\rule{\\linewidth}{0.4pt}\\par');
        body.push('');
        break;
      case 'table_open':
        tableAligns = [];
        tableRows = [];
        headerRowCount = 0;
        break;
      case 'table_close': {
        const colSpec = tableAligns.map((a) => a).join('');
        body.push(`\\begin{center}`);
        body.push(`\\begin{tabular}{${colSpec}}`);
        body.push('\\hline');
        tableRows.forEach((row, idx) => {
          body.push(row);
          // ヘッダー行の直後に区切り線を引く
          if (idx + 1 === headerRowCount) body.push('\\hline');
        });
        body.push('\\hline');
        body.push('\\end{tabular}');
        body.push('\\end{center}');
        body.push('');
        break;
      }
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
        tableRows.push(`${rowCells.join(' & ')} \\\\`);
        if (inHeaderRow) headerRowCount = tableRows.length;
        break;
      case 'th_open':
      case 'td_open': {
        const inline = tokens[i + 1];
        const text = inline?.type === 'inline' ? renderInline(inline.children ?? []) : '';
        if (t.type === 'th_open') {
          // 区切り記号のアラインメントを列指定に反映する (ヘッダーセルの style から取得)
          tableAligns.push(columnAlign(t.attrGet('style') ?? undefined));
          rowCells.push(`\\textbf{${text}}`);
        } else {
          rowCells.push(text);
        }
        i += 2;
        break;
      }
      case 'inline': {
        // 未対応ブロック内のテキストを素の段落として出力する
        const text = renderInline(t.children ?? []);
        body.push(`${indent()}${text}`);
        if (listStack.length === 0 && blockquoteDepth === 0) body.push('');
        break;
      }
      case 'html_block': {
        // ブロックレベルの HTML はタグを除去し、残ったテキストのみ段落として出力する
        const text = t.content.replace(/<[^>]*>/g, '').trim();
        if (text) {
          body.push(escapeLatex(text));
          body.push('');
        }
        break;
      }
      default:
        break;
    }
  }

  // 末尾の余分な空行を 1 つに詰める
  while (body.length > 0 && body[body.length - 1] === '') body.pop();

  return [PREAMBLE, '', '\\begin{document}', '', ...body, '', '\\end{document}', ''].join('\n');
}
