import type {ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import Editor, {type OnMount} from '@monaco-editor/react';
import DOMPurify from 'dompurify';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import {md, markdownToDocumentXml} from '../lib/doc/markdown-to-ooxml';
import {buildDocxBlob} from '../lib/doc/docx-package';
import styles from './doc.module.css';

const SAMPLE_MARKDOWN = `# サンプル文書

これは **太字** と *斜体* と \`インラインコード\` を含む段落である。
XML の特殊文字 (& < >) もエスケープされる。

## リスト

- 箇条書き 1
- 箇条書き 2
  - ネストした項目

1. 番号リスト 1
2. 番号リスト 2

## コードブロック

\`\`\`bash
echo "Hello, docx!"
\`\`\`

> 引用ブロックはこのように変換される。
`;

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
  const [source, setSource] = useState(SAMPLE_MARKDOWN);
  const [tab, setTab] = useState<PreviewTab>('preview');
  const [downloading, setDownloading] = useState(false);
  const [leftPct, setLeftPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditor | null>(null);
  const [marks, setMarks] = useState({bold: false, italic: false, strike: false});
  const [hasSelection, setHasSelection] = useState(false);

  // 現在の選択範囲に適用済みの装飾と、選択の有無を判定してツールバーに反映する
  const refreshMarks = () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) {
      setMarks({bold: false, italic: false, strike: false});
      setHasSelection(false);
      return;
    }
    const {decos} = analyze(model.getValueInRange(selection));
    setMarks({bold: decos.has('bold'), italic: decos.has('italic'), strike: decos.has('strike')});
    setHasSelection(true);
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

  const html = useMemo(
    () =>
      tab === 'preview'
        ? DOMPurify.sanitize(md.render(source), {USE_PROFILES: {html: true}})
        : '',
    [source, tab],
  );
  const ooxml = useMemo(
    () => (tab === 'ooxml' ? markdownToDocumentXml(source) : ''),
    [source, tab],
  );

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

  const downloadMarkdown = () => {
    downloadBlob('document.md', new Blob([source], {type: 'text/markdown'}));
  };

  const downloadDocx = async () => {
    setDownloading(true);
    try {
      const blob = await buildDocxBlob(markdownToDocumentXml(source));
      downloadBlob('document.docx', blob);
    } finally {
      setDownloading(false);
    }
  };

  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className={styles.app}>
      <div className={styles.menubar}>
        <span className={styles.brand}>
          <Translate id="doc.editorLabel">Markdown</Translate>
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
              className={`${styles.previewScroll} markdown`}
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

        {dragging && <div className={styles.dragOverlay} />}
      </div>
    </div>
  );
}

export default function DocPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'doc.title', message: 'Markdown を Word 文書に変換'})}
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
