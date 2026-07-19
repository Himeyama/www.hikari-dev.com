import type {CSSProperties, DragEvent, ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import Editor, {type OnMount} from '@monaco-editor/react';
import DOMPurify from 'dompurify';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import {md, markdownToDocumentXml} from '../lib/doc/markdown-to-ooxml';
import {buildDocxBlob} from '../lib/doc/docx-package';
import {IMPORT_ACCEPT, fileToMarkdownSource} from '../lib/doc/import-source';
import {
  FONT_OPTIONS,
  FONT_CATEGORY_LABELS,
  DEFAULT_FONT_ID,
  getFontOption,
  type FontOption,
} from '../lib/doc/fonts';
import {DocChatPanel} from '../components/DocChat/DocChatPanel';
import styles from './doc.module.css';

// 初回表示・本文が空のときに読み込むサンプル文書。ロケールごとに翻訳する
// (code.json のキー doc.sample。コードブロック内の識別子はそのまま流用してよい)
function getSampleMarkdown(): string {
  return translate({
    id: 'doc.sample',
    message: `# サンプル文書

これは **太字** と *斜体* と ~~取り消し線~~ と \`インラインコード\` を含む段落である。
***太字 + 斜体*** のような組み合わせも可能である。
XML の特殊文字 (& < >) もエスケープされる。

## 見出しレベル

### レベル 3 の見出し

見出しはレベル 1 から 6 まで対応する。

## リスト

- 箇条書き 1
- 箇条書き 2
  - ネストした項目
    - さらにネストした項目
- 箇条書き 3

1. 番号リスト 1
2. 番号リスト 2
   1. ネストした番号リスト
3. 番号リスト 3

## コードブロック

言語を指定するとシンタックスハイライトが適用される。

\`\`\`bash
#!/bin/bash
echo "Hello, docx!"
\`\`\`

\`\`\`javascript
function greet(name) {
  // 挨拶を返す
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`python
def greet(name: str) -> str:
    """挨拶を返す"""
    return f"Hello, {name}!"
\`\`\`

## 引用

> 引用ブロックはこのように変換される。
> 複数行の引用にも対応する。

## 表

| 項目 | 説明 |
| --- | --- |
| 見出し | \`#\` から \`######\` |
| リスト | 番号なし・番号付き・ネスト |
| コード | インラインとブロック (シンタックスハイライト対応) |

---

以上がサンプル文書である。
`,
  });
}

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
  padding: {top: 12, bottom: 12},
};

const MIN_PANE_PCT = 20;
const MAX_PANE_PCT = 80;
const MIN_CHAT_PCT = 18;
const MAX_CHAT_PCT = 60;
const FONT_STORAGE_KEY = 'doc-font-id';
const CHAT_OPEN_STORAGE_KEY = 'doc-chat-open';
const SOURCE_STORAGE_KEY = 'doc-source';
const SOURCE_SAVE_DEBOUNCE_MS = 500;

function loadStoredSource(): string {
  try {
    const stored = localStorage.getItem(SOURCE_STORAGE_KEY);
    // 保存されていた内容が空 (全角スペースのみ等を含む) の場合はサンプル文書にフォールバックする
    return stored && stored.trim() !== '' ? stored : getSampleMarkdown();
  } catch {
    // localStorage が使用できない環境ではサンプル文書にフォールバック
    return getSampleMarkdown();
  }
}

function loadChatOpen(): boolean {
  try {
    return localStorage.getItem(CHAT_OPEN_STORAGE_KEY) === '1';
  } catch {
    // localStorage が使用できない環境では閉じた状態にフォールバック
    return false;
  }
}

function loadStoredFontId(): string {
  try {
    return localStorage.getItem(FONT_STORAGE_KEY) ?? DEFAULT_FONT_ID;
  } catch {
    // localStorage が使用できない環境 (プライベートモード等) では既定値にフォールバック
    return DEFAULT_FONT_ID;
  }
}

// 太字の英数字 (boldLatin) と日本語 (boldEastAsia) で別ファミリーを使うフォントは、
// unicode-range で英数字だけ切り出した DocPreviewBoldLatin (doc.module.css) を先頭に挟む
function boldFontStack(font: FontOption): string {
  const eastAsia = font.boldEastAsia ?? font.family;
  if (font.boldLatin && font.boldLatin !== eastAsia) {
    return `'DocPreviewBoldLatin', "${eastAsia}", sans-serif`;
  }
  return `"${eastAsia}", sans-serif`;
}

type PreviewTab = 'preview' | 'ooxml';
type MonacoEditor = Parameters<OnMount>[0];
type Deco = 'bold' | 'italic' | 'strike';

// 選択テキストの外側から対になるマーカーを剥がし、素のテキストと適用済み装飾を得る。
// ** (太字) を * (斜体) より先に判定するため、太字・斜体・取り消し線の順に剥がす。
function analyze(text: string): {core: string; decos: Set<Deco>} {
  let s = text;
  const decos = new Set<Deco>();
  for (;;) {
    if (s.length >= 4 && s.startsWith('**') && s.endsWith('**')) {
      s = s.slice(2, -2);
      decos.add('bold');
    } else if (s.length >= 2 && s.startsWith('*') && s.endsWith('*')) {
      s = s.slice(1, -1);
      decos.add('italic');
    } else if (s.length >= 4 && s.startsWith('~~') && s.endsWith('~~')) {
      s = s.slice(2, -2);
      decos.add('strike');
    } else {
      break;
    }
  }
  return {core: s, decos};
}

// 装飾セットからマーカー付きテキストを組み立てる。
// 斜体を内側、太字を外側にすることで太字+斜体が ***text*** になる。
function rebuild(core: string, decos: Set<Deco>): string {
  let out = core;
  if (decos.has('italic')) out = `*${out}*`;
  if (decos.has('bold')) out = `**${out}**`;
  if (decos.has('strike')) out = `~~${out}~~`;
  return out;
}

function BoldIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.5h6a3.25 3.25 0 010 6.5H7zM7 11h6.75a3.25 3.25 0 010 6.5H7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 4.5v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ItalicIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 5h6M8 19h6M14.5 5l-4 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StrikethroughIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16.5 7.5C15.5 6 13.9 5.3 12 5.3c-2.5 0-4.2 1.3-4.2 3.1 0 1.4 1 2.3 2.9 2.9M7.5 16.2c1 1.6 2.6 2.5 4.7 2.5 2.6 0 4.3-1.3 4.3-3.2 0-1-.4-1.8-1.2-2.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarkdownDownloadIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 15V9l3 3 3-3v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 9v4m0 0l-1.7-1.7M17 13l1.7-1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocxDownloadIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h8l4 4v14H6V3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M12 10.5v5m0 0l-2-2m2 2l2-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImportIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 15V9m0 0l-3 3m3-3l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AiChatIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h16v10H9l-4 3.5v-3.5H4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// プレビューのコードブロックに DOM 注入するコピー / 完了アイコン (innerHTML 用の SVG 文字列)
const COPY_ICON_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
const CHECK_ICON_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';

function CheckIcon(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FONT_CATEGORIES = ['serif', 'sans-serif', 'serif-sans'] as const;

// "Noto Serif JP / Noto Sans JP" のような複合ラベルは、"/" の前後をそれぞれの実フォントで描画する
function renderFontLabel(font: FontOption): ReactNode {
  const parts = font.label.split(' / ');
  if (parts.length !== 2 || !font.boldEastAsia) {
    return <span style={{fontFamily: `"${font.family}", sans-serif`}}>{font.label}</span>;
  }
  return (
    <span>
      <span style={{fontFamily: `"${font.family}", sans-serif`}}>{parts[0]}</span>
      {' / '}
      <span style={{fontFamily: `"${font.boldEastAsia}", sans-serif`}}>{parts[1]}</span>
    </span>
  );
}

// フォント名自体をそのファミリーで描画するリッチなドロップダウン (ネイティブ select の代替)
function FontDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getFontOption(value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.fontPicker} ref={rootRef}>
      <button
        type="button"
        className={styles.fontTrigger}
        onClick={() => setOpen((v) => !v)}
        title={translate({id: 'doc.font', message: 'フォント'})}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.fontTriggerLabel}>{renderFontLabel(current)}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div className={styles.fontMenu} role="listbox">
          {FONT_CATEGORIES.map((category) => (
            <div key={category} className={styles.fontGroup}>
              <div className={styles.fontGroupLabel}>{FONT_CATEGORY_LABELS[category]}</div>
              {FONT_OPTIONS.filter((f) => f.category === category).map((f) => (
                <button
                  type="button"
                  key={f.id}
                  role="option"
                  aria-selected={f.id === value}
                  className={`${styles.fontOption} ${f.id === value ? styles.fontOptionActive : ''}`}
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                >
                  {renderFontLabel(f)}
                  {f.id === value && <CheckIcon />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DocApp(): ReactNode {
  const {colorMode} = useColorMode();
  const [source, setSource] = useState(loadStoredSource);
  const [tab, setTab] = useState<PreviewTab>('preview');
  const [downloading, setDownloading] = useState(false);
  const [leftPct, setLeftPct] = useState(() => (loadChatOpen() ? 40 : 50));
  const [dragging, setDragging] = useState(false);
  const [fileDragging, setFileDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [marks, setMarks] = useState({bold: false, italic: false, strike: false});
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [chatOpen, setChatOpenState] = useState(loadChatOpen);
  const [chatPct, setChatPct] = useState(() => (loadChatOpen() ? 20 : 30));
  const [chatDragging, setChatDragging] = useState(false);
  const [fontId, setFontIdState] = useState(loadStoredFontId);
  const font = useMemo(() => getFontOption(fontId), [fontId]);
  const setFontId = (id: string) => {
    setFontIdState(id);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      // localStorage が使用できない環境では保存をあきらめる
    }
  };

  // AI チャットの開閉状態をブラウザに記録する
  const setChatOpen = (next: boolean | ((v: boolean) => boolean)) => {
    setChatOpenState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(CHAT_OPEN_STORAGE_KEY, value ? '1' : '0');
      } catch {
        // localStorage が使用できない環境では保存をあきらめる
      }
      return value;
    });
  };

  // 現在の選択範囲に適用済みの装飾と、選択の有無を判定してツールバーに反映する
  const refreshMarks = () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) {
      setMarks({bold: false, italic: false, strike: false});
      setHasSelection(false);
      setSelectedText('');
      return;
    }
    const selText = model.getValueInRange(selection);
    const {decos} = analyze(selText);
    setMarks({bold: decos.has('bold'), italic: decos.has('italic'), strike: decos.has('strike')});
    setHasSelection(true);
    setSelectedText(selText);
  };

  // 指定した装飾だけをトグルし、他の装飾は保持したまま囲み直す (組み合わせ対応)
  const applyDeco = (deco: Deco) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection) return;

    const startOffset = model.getOffsetAt(selection.getStartPosition());
    const {core, decos} = analyze(model.getValueInRange(selection));
    if (decos.has(deco)) decos.delete(deco);
    else decos.add(deco);
    const newText = rebuild(core, decos);
    editor.executeEdits('doc-format', [{range: selection, text: newText, forceMoveMarkers: true}]);

    // 記号込みの全体を次の選択範囲にすることで、続けて別の装飾も付け外しできる
    const s = model.getPositionAt(startOffset);
    const e = model.getPositionAt(startOffset + newText.length);
    editor.setSelection({
      startLineNumber: s.lineNumber,
      startColumn: s.column,
      endLineNumber: e.lineNumber,
      endColumn: e.column,
    });
    editor.focus();
  };

  // エディタのスクロール量に応じてプレビューの縦スクロールを同じ割合だけ動かす
  const syncPreviewScroll = () => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    const scrollHeight = editor.getScrollHeight() - editor.getLayoutInfo().height;
    const ratio = scrollHeight > 0 ? editor.getScrollTop() / scrollHeight : 0;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
  };

  const html = useMemo(
    () =>
      tab === 'preview'
        ? DOMPurify.sanitize(md.render(source), {USE_PROFILES: {html: true}})
        : '',
    [source, tab],
  );
  const ooxml = useMemo(
    () => (tab === 'ooxml' ? markdownToDocumentXml(source, font).xml : ''),
    [source, tab, font],
  );

  // プレビュー内の各コードブロック (<pre class="hljs">) にコピー ボタンを注入する。
  // dangerouslySetInnerHTML で innerHTML が再構築されるたびに実行し、ボタンを付け直す
  useEffect(() => {
    if (tab !== 'preview') return;
    const preview = previewRef.current;
    if (!preview) return;
    const copyLabel = translate({id: 'doc.preview.copyCode', message: 'コードをコピー'});
    const cleanups: (() => void)[] = [];
    preview.querySelectorAll<HTMLPreElement>('pre.hljs').forEach((pre) => {
      pre.classList.add('doc-code-block');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'doc-code-copy';
      btn.setAttribute('aria-label', copyLabel);
      btn.title = copyLabel;
      btn.innerHTML = COPY_ICON_SVG;
      const onClick = async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
        try {
          await navigator.clipboard.writeText(code);
        } catch {
          return;
        }
        btn.innerHTML = CHECK_ICON_SVG;
        btn.classList.add('doc-code-copy--done');
        window.setTimeout(() => {
          btn.innerHTML = COPY_ICON_SVG;
          btn.classList.remove('doc-code-copy--done');
        }, 1500);
      };
      btn.addEventListener('click', onClick);
      pre.appendChild(btn);
      cleanups.push(() => {
        btn.removeEventListener('click', onClick);
        btn.remove();
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [html, tab]);

  // 本文の変更をデバウンスしてブラウザのローカルストレージに自動保存する
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SOURCE_STORAGE_KEY, source);
      } catch {
        // localStorage が使用できない環境では保存をあきらめる
      }
    }, SOURCE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(MAX_PANE_PCT, Math.max(MIN_PANE_PCT, pct)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // AI チャットパネルの幅を右端からのドラッグで変更する
  useEffect(() => {
    if (!chatDragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((rect.right - e.clientX) / rect.width) * 100;
      setChatPct(Math.min(MAX_CHAT_PCT, Math.max(MIN_CHAT_PCT, pct)));
    };
    const onUp = () => setChatDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [chatDragging]);

  // AI 応答をエディタの現在の選択範囲に置き換える
  const applyToSelection = (text: string) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) return;
    editor.executeEdits('doc-ai', [
      {range: selection, text, forceMoveMarkers: true},
    ]);
    editor.focus();
  };

  // AI 応答で文書全体を置き換える
  const applyToDocument = (text: string) => {
    setSource(text);
  };

  const downloadMarkdown = () => {
    downloadBlob('document.md', new Blob([source], {type: 'text/markdown'}));
  };

  const downloadDocx = async () => {
    setDownloading(true);
    try {
      const {xml, orderedListStarts} = markdownToDocumentXml(source, font);
      const blob = await buildDocxBlob(xml, font, orderedListStarts);
      downloadBlob('document.docx', blob);
    } finally {
      setDownloading(false);
    }
  };

  const importFile = async (file: File) => {
    setImportError('');
    if (!/\.(md|markdown|docx)$/i.test(file.name)) {
      setImportError(
        translate({
          id: 'doc.importUnsupported',
          message: '対応していないファイル形式である (.md, .markdown, .docx のみ)',
        }),
      );
      return;
    }
    setImporting(true);
    try {
      setSource(await fileToMarkdownSource(file));
      setTab('preview');
    } catch {
      setImportError(
        translate({id: 'doc.importFailed', message: 'ファイルの読み込みに失敗した'}),
      );
    } finally {
      setImporting(false);
    }
  };

  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setFileDragging(true);
  };
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
  };
  const onDragLeave = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setFileDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setFileDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void importFile(file);
  };

  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <div
      className={styles.app}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {importError && (
        <div className={styles.importError} role="alert">
          <span>{importError}</span>
          <button
            type="button"
            className={styles.importErrorClose}
            onClick={() => setImportError('')}
            aria-label={translate({id: 'doc.dismiss', message: '閉じる'})}
          >
            ×
          </button>
        </div>
      )}
      {fileDragging && (
        <div className={styles.fileDropOverlay}>
          <div className={styles.fileDropMessage}>
            <ImportIcon />
            <Translate id="doc.dropHere">
              ファイルをドロップしてインポート (.md, .markdown, .docx)
            </Translate>
          </div>
        </div>
      )}
      <div className={styles.menubar}>
        <span className={styles.brand}>
          <Translate id="doc.editorLabel">DOC</Translate>
        </span>
        <div className={styles.menuDivider} />
        <button
          className={`${styles.iconBtn} ${marks.bold ? styles.iconBtnActive : ''}`}
          onClick={() => applyDeco('bold')}
          disabled={!hasSelection}
          title={translate({id: 'doc.bold', message: '太字'})}
          aria-label={translate({id: 'doc.bold', message: '太字'})}
        >
          <BoldIcon />
        </button>
        <button
          className={`${styles.iconBtn} ${marks.italic ? styles.iconBtnActive : ''}`}
          onClick={() => applyDeco('italic')}
          disabled={!hasSelection}
          title={translate({id: 'doc.italic', message: '斜体'})}
          aria-label={translate({id: 'doc.italic', message: '斜体'})}
        >
          <ItalicIcon />
        </button>
        <button
          className={`${styles.iconBtn} ${marks.strike ? styles.iconBtnActive : ''}`}
          onClick={() => applyDeco('strike')}
          disabled={!hasSelection}
          title={translate({id: 'doc.strikethrough', message: '取り消し線'})}
          aria-label={translate({id: 'doc.strikethrough', message: '取り消し線'})}
        >
          <StrikethroughIcon />
        </button>
        <div className={styles.menuSpacer} />
        <FontDropdown value={fontId} onChange={setFontId} />
        <div className={styles.menuDivider} />
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === 'preview' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('preview')}
          >
            <Translate id="doc.previewTab">プレビュー</Translate>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'ooxml' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('ooxml')}
          >
            <Translate id="doc.ooxmlTab">OOXML</Translate>
          </button>
        </div>
        <div className={styles.menuDivider} />
        <input
          ref={fileInputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          className={styles.hiddenFileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void importFile(file);
          }}
        />
        <button
          className={styles.iconBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title={translate({id: 'doc.import', message: 'インポート (.md, .markdown, .docx)'})}
          aria-label={translate({id: 'doc.import', message: 'インポート (.md, .markdown, .docx)'})}
        >
          <ImportIcon />
        </button>
        <div className={styles.menuDivider} />
        <button
          className={styles.iconBtn}
          onClick={downloadMarkdown}
          title={translate({id: 'doc.downloadMd', message: 'Markdown をダウンロード'})}
          aria-label={translate({id: 'doc.downloadMd', message: 'Markdown をダウンロード'})}
        >
          <MarkdownDownloadIcon />
        </button>
        <button
          className={styles.iconBtn}
          onClick={downloadDocx}
          disabled={downloading}
          title={translate({id: 'doc.downloadDocx', message: 'docx をダウンロード'})}
          aria-label={translate({id: 'doc.downloadDocx', message: 'docx をダウンロード'})}
        >
          <DocxDownloadIcon />
        </button>
        <div className={styles.menuDivider} />
        <button
          className={`${styles.iconBtn} ${chatOpen ? styles.iconBtnActive : ''}`}
          onClick={() =>
            setChatOpen((v) => {
              if (!v) {
                // 開くときはエディター・プレビュー・チャットを 2:2:1 (40% / 40% / 20%) に整える
                setLeftPct(40);
                setChatPct(20);
              } else {
                // 閉じるときはエディターとプレビューを 1:1 (50% / 50%) に戻す
                setLeftPct(50);
              }
              return !v;
            })
          }
          title={translate({id: 'doc.aiChat', message: 'AI チャット'})}
          aria-label={translate({id: 'doc.aiChat', message: 'AI チャット'})}
        >
          <AiChatIcon />
        </button>
      </div>

      <div className={styles.body} ref={bodyRef}>
        <div className={styles.editorPane} style={{width: `${leftPct}%`}}>
          <Editor
            language="markdown"
            value={source}
            theme={editorTheme}
            options={EDITOR_OPTIONS}
            onChange={(value) => setSource(value ?? '')}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.onDidChangeCursorSelection(refreshMarks);
              editor.onDidScrollChange(syncPreviewScroll);
            }}
          />
        </div>

        <div
          className={`${styles.divider} ${dragging ? styles.dividerActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          role="separator"
          aria-orientation="vertical"
        />

        <div className={styles.previewPane}>
          {tab === 'preview' ? (
            <div
              ref={previewRef}
              className={`${styles.previewScroll} markdown`}
              style={
                {
                  '--doc-preview-font': `"${font.family}", sans-serif`,
                  '--doc-preview-bold-font': boldFontStack(font),
                } as CSSProperties
              }
              dangerouslySetInnerHTML={{__html: html}}
            />
          ) : (
            <div className={styles.editorFull}>
              <Editor
                language="xml"
                value={ooxml}
                theme={editorTheme}
                options={{...EDITOR_OPTIONS, readOnly: true}}
              />
            </div>
          )}
        </div>

        {chatOpen && (
          <>
            <div
              className={`${styles.divider} ${chatDragging ? styles.dividerActive : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setChatDragging(true);
              }}
              role="separator"
              aria-orientation="vertical"
            />
            <div className={styles.chatPane} style={{width: `${chatPct}%`}}>
              <DocChatPanel
                source={source}
                selectedText={selectedText}
                hasSelection={hasSelection}
                onApplyToSelection={applyToSelection}
                onApplyToDocument={applyToDocument}
                onClose={() => {
                  // 閉じるときはエディターとプレビューを 1:1 (50% / 50%) に戻す
                  setLeftPct(50);
                  setChatOpen(false);
                }}
              />
            </div>
          </>
        )}

        {(dragging || chatDragging) && <div className={styles.dragOverlay} />}
      </div>
    </div>
  );
}

export default function DocPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'doc.title', message: 'DOC'})}
      description={translate({
        id: 'doc.description',
        message:
          'Markdown を docx (Word 文書) に変換するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
      wrapperClassName="doc-page-wrapper"
    >
      <BrowserOnly fallback={<div className={styles.loading}>Loading editor...</div>}>
        {() => <DocApp />}
      </BrowserOnly>
    </Layout>
  );
}
