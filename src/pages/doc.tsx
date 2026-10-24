import type {CSSProperties, DragEvent, ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {OnMount} from '@monaco-editor/react';
import Editor from '@site/src/components/HikariEditor';
import DOMPurify from 'dompurify';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import {md, markdownToDocumentXml} from '../lib/doc/markdown-to-ooxml';
import {markdownToLatex} from '../lib/doc/markdown-to-latex';
import {buildDocxBlob} from '../lib/doc/docx-package';
import {IMPORT_ACCEPT, fileToMarkdownSource} from '../lib/doc/import-source';
import {
  FONT_OPTIONS,
  FONT_CATEGORY_LABELS,
  DEFAULT_FONT_ID,
  getFontOption,
  type FontOption,
} from '../lib/doc/fonts';
import {SettingsWindow} from '../components/DocChat/SettingsWindow';
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

type PreviewTab = 'preview' | 'ooxml' | 'latex';
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

function DocMenu({label, children}: {label: string; children: ReactNode}): ReactNode {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <details ref={ref} className={styles.menu} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        ref.current?.removeAttribute('open');
        ref.current?.querySelector('summary')?.focus();
      }
    }}>
      <summary>{label}</summary>
      <div className={styles.menuPopup} onClick={(event) => {
        if ((event.target as HTMLElement).closest('button')?.parentElement === event.currentTarget) {
          ref.current?.removeAttribute('open');
          ref.current?.querySelector('summary')?.focus();
        }
      }}>{children}</div>
    </details>
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
  const rootRef = useRef<HTMLDetailsElement>(null);
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
    <details className={styles.fontPicker} ref={rootRef} open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className={styles.fontTrigger}
        title={translate({id: 'doc.font', message: 'フォント'})}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.fontTriggerLabel}>{renderFontLabel(current)}</span>
        <ChevronDownIcon />
      </summary>
      {open && (
        <div className={styles.fontMenu} role="menu" aria-label={translate({id: 'doc.font', message: 'フォント'})}>
          {FONT_CATEGORIES.map((category) => (
            <div key={category} className={styles.fontGroup}>
              <div className={styles.fontGroupLabel}>{FONT_CATEGORY_LABELS[category]}</div>
              {FONT_OPTIONS.filter((f) => f.category === category).map((f) => (
                <button
                  type="button"
                  key={f.id}
                  role="menuitemradio"
                  aria-checked={f.id === value}
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
    </details>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatSession, setChatSession] = useState(0);
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
  const latex = useMemo(() => (tab === 'latex' ? markdownToLatex(source) : ''), [source, tab]);

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

  const downloadLatex = () => {
    downloadBlob('document.tex', new Blob([markdownToLatex(source)], {type: 'application/x-tex'}));
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
        <DocMenu label={translate({id: 'doc.menu.file', message: 'ファイル'})}>
          <button disabled={importing} onClick={() => fileInputRef.current?.click()}><Translate id="doc.import">インポート (.md, .markdown, .docx)</Translate></button>
          <button onClick={downloadMarkdown}><Translate id="doc.downloadMd">Markdown をダウンロード</Translate></button>
          <button disabled={downloading} onClick={downloadDocx}><Translate id="doc.downloadDocx">docx をダウンロード</Translate></button>
          <button onClick={downloadLatex}><Translate id="doc.downloadTex">LaTeX (.tex) をダウンロード</Translate></button>
        </DocMenu>
        <DocMenu label={translate({id: 'doc.menu.edit', message: '編集'})}>
          <button disabled={!chatOpen} onClick={() => setChatSession(value => value + 1)}>
            <Translate id="doc.chatReset">AI チャットをリセット</Translate>
          </button>
        </DocMenu>
        <DocMenu label={translate({id: 'doc.menu.format', message: '書式'})}>
          <button disabled={!hasSelection} aria-pressed={marks.bold} onClick={() => applyDeco('bold')}><Translate id="doc.bold">太字</Translate></button>
          <button disabled={!hasSelection} aria-pressed={marks.italic} onClick={() => applyDeco('italic')}><Translate id="doc.italic">斜体</Translate></button>
          <button disabled={!hasSelection} aria-pressed={marks.strike} onClick={() => applyDeco('strike')}><Translate id="doc.strikethrough">取り消し線</Translate></button>
          <FontDropdown value={fontId} onChange={setFontId} />
        </DocMenu>
        <DocMenu label={translate({id: 'doc.menu.view', message: '表示'})}>
          <button aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}><Translate id="doc.previewTab">プレビュー</Translate></button>
          <button aria-pressed={tab === 'ooxml'} onClick={() => setTab('ooxml')}><Translate id="doc.ooxmlTab">OOXML</Translate></button>
          <button aria-pressed={tab === 'latex'} onClick={() => setTab('latex')}><Translate id="doc.latexTab">LaTeX</Translate></button>
          <button aria-pressed={chatOpen} onClick={() => {
            setLeftPct(chatOpen ? 50 : 40);
            setChatPct(20);
            setChatOpen(!chatOpen);
          }}><Translate id="doc.aiChat">AI チャット</Translate></button>
        </DocMenu>
        <DocMenu label={translate({id: 'doc.menu.settings', message: '設定'})}>
          <button onClick={() => setSettingsOpen(true)}><Translate id="doc.apiSettings">API 設定</Translate></button>
        </DocMenu>
        <input ref={fileInputRef} type="file" accept={IMPORT_ACCEPT} className={styles.hiddenFileInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void importFile(file);
          }} />
      </div>

      {settingsOpen && <SettingsWindow onClose={() => setSettingsOpen(false)} />}

      <div className={styles.body} ref={bodyRef}>
        <div className={styles.editorPane} style={{width: `${leftPct}%`}}>
          <Editor
            language="markdown"
            value={source}
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
                language={tab === 'latex' ? 'plaintext' : 'xml'}
                value={tab === 'latex' ? latex : ooxml}
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
                key={chatSession}
                onOpenSettings={() => setSettingsOpen(true)}
                source={source}
                selectedText={selectedText}
                hasSelection={hasSelection}
                onApplyToSelection={applyToSelection}
                onApplyToDocument={applyToDocument}
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
