import mammoth from 'mammoth/mammoth.browser';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.remove('style');

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
