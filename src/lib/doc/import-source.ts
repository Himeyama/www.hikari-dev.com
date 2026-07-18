import mammoth from 'mammoth/mammoth.browser';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.remove('style');

// turndown 標準の listItem ルールはマーカー後の空白を 3 個 (箇条書き) / 2 個 (番号付き) 固定で
// 挿入する (ネスト行の桁揃え目的)。1 個スペースに統一するため上書きする
turndown.addRule('listItem', {
  filter: 'li',
  replacement: (content, node, options) => {
    const parent = node.parentNode as ParentNode & {getAttribute?: (name: string) => string | null};
    let prefix = `${options.bulletListMarker} `;
    if (parent?.nodeName === 'OL') {
      const start = parent.getAttribute?.('start');
      const index = Array.prototype.indexOf.call(parent.children, node);
      prefix = `${start ? Number(start) + index : index + 1}. `;
    }
    const isParagraph = /\n$/.test(content);
    const trimmed = content.replace(/^\n+/, '').replace(/\n+$/, '') + (isParagraph ? '\n' : '');
    const indented = trimmed.replace(/\n/gm, `\n${' '.repeat(prefix.length)}`);
    return prefix + indented + (node.nextSibling ? '\n' : '');
  },
});

// docx (OOXML) を一旦 HTML に変換してから Markdown へ変換する (mammoth は docx -> HTML のみ対応)
async function docxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const {value: html} = await mammoth.convertToHtml({arrayBuffer});
  return turndown.turndown(html).trim();
}

export const IMPORT_ACCEPT = '.md,.markdown,.docx';

// 拡張子からインポート方法を振り分け、Markdown ソース文字列を返す
export async function fileToMarkdownSource(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    return docxToMarkdown(file);
  }
  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return file.text();
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}
