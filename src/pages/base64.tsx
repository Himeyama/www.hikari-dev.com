import type {ReactNode} from 'react';
import {useState, useCallback, useRef} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './base64.module.css';

const COMMON_MIME_TYPES = [
  'text/plain',
  'text/html',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'application/pdf',
  'application/octet-stream',
];

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function extractBase64(input: string): {base64: string; mimeType: string | null} {
  const trimmed = input.trim();
  const match = trimmed.match(/^data:([^;,]*)(?:;[^,]*)?,(.*)$/s);
  if (match) {
    return {base64: match[2].replace(/\s+/g, ''), mimeType: match[1] || null};
  }
  return {base64: trimmed.replace(/\s+/g, ''), mimeType: null};
}

function base64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
}

type Direction = 'encode' | 'decode';

interface DroppedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  dataUrl: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}

function Base64TextEditors(): ReactNode {
  const {colorMode} = useColorMode();
  const [direction, setDirection] = useState<Direction>('encode');
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [binaryNotice, setBinaryNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'output' | 'datauri' | null>(null);
  const [mimeType, setMimeType] = useState('text/plain');

  const runConvert = useCallback((value: string, dir: Direction) => {
    if (value.trim() === '') {
      setOutput('');
      setError(null);
      setBinaryNotice(false);
      return;
    }
    if (dir === 'encode') {
      try {
        setOutput(textToBase64(value));
        setError(null);
        setBinaryNotice(false);
      } catch (e) {
        setOutput('');
        setError(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    const {base64, mimeType: detectedMime} = extractBase64(value);
    if (detectedMime) setMimeType(detectedMime);
    try {
      atob(base64);
    } catch {
      setOutput('');
      setBinaryNotice(false);
      setError(
        translate({id: 'base64.errorInvalid', message: 'Base64 として解釈できない文字列。'}),
      );
      return;
    }
    setError(null);
    try {
      setOutput(base64ToText(base64));
      setBinaryNotice(false);
    } catch {
      setOutput('');
      setBinaryNotice(true);
    }
  }, []);

  const handleSourceChange = (value: string | undefined) => {
    const nextValue = value ?? '';
    setSource(nextValue);
    runConvert(nextValue, direction);
  };

  const swapDirection = () => {
    const nextDirection: Direction = direction === 'encode' ? 'decode' : 'encode';
    const newSource = output;
    setDirection(nextDirection);
    setSource(newSource);
    runConvert(newSource, nextDirection);
  };

  const currentBase64 =
    direction === 'encode' ? output : extractBase64(source).base64;
  const dataUri = currentBase64 ? `data:${mimeType};base64,${currentBase64}` : '';

  const copyText = async (text: string, kind: 'output' | 'datauri') => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (!success) {
      setError(
        translate({id: 'base64.errorCopy', message: 'コピーに失敗した。手動で選択してコピーしてください。'}),
      );
      return;
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  };

  const sourceLabel =
    direction === 'encode' ? (
      <Translate id="base64.textLabel">テキスト</Translate>
    ) : (
      <Translate id="base64.base64Label">Base64</Translate>
    );
  const outputLabel =
    direction === 'encode' ? (
      <Translate id="base64.base64Label">Base64</Translate>
    ) : (
      <Translate id="base64.textLabel">テキスト</Translate>
    );
  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <>
      <div className={styles.panes}>
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>{sourceLabel}</span>
          </div>
          <div className={styles.editorWrapper}>
            <Editor
              language="plaintext"
              value={source}
              theme={editorTheme}
              options={EDITOR_OPTIONS}
              onChange={handleSourceChange}
            />
          </div>
        </div>

        <div className={styles.swapCol}>
          <button
            className={styles.swapBtn}
            onClick={swapDirection}
            aria-label={translate({id: 'base64.swap', message: '変換方向を入れ替える'})}
          >
            ⇄
          </button>
        </div>

        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>{outputLabel}</span>
            <button
              className={styles.copyBtn}
              onClick={() => copyText(output, 'output')}
              disabled={!output}
            >
              {copied === 'output' ? (
                <Translate id="base64.copied">コピーしました</Translate>
              ) : (
                <Translate id="base64.copy">コピー</Translate>
              )}
            </button>
          </div>
          <div className={styles.editorWrapper}>
            <Editor
              language="plaintext"
              value={output}
              theme={editorTheme}
              options={{...EDITOR_OPTIONS, readOnly: true}}
            />
          </div>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {binaryNotice && (
        <p className={styles.noticeText}>
          <Translate id="base64.binaryNotice">
            テキストとして解釈できない (バイナリ データの可能性)。data: URI やダウンロードは利用可能。
          </Translate>
        </p>
      )}

      <div className={styles.dataUriRow}>
        <label className={styles.mimeLabel}>
          <Translate id="base64.mimeType">MIME タイプ</Translate>
          <input
            className={styles.mimeInput}
            list="base64-mime-list"
            value={mimeType}
            onChange={(e) => setMimeType(e.target.value)}
          />
          <datalist id="base64-mime-list">
            {COMMON_MIME_TYPES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <button
          className={styles.actionBtnGhost}
          onClick={() => copyText(dataUri, 'datauri')}
          disabled={!currentBase64}
        >
          {copied === 'datauri' ? (
            <Translate id="base64.copied">コピーしました</Translate>
          ) : (
            <Translate id="base64.copyDataUri">data: URI をコピー</Translate>
          )}
        </button>
      </div>
    </>
  );
}

export default function Base64Page(): ReactNode {
  // ── File dropzone section ─────────────────────
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    try {
      const results = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          const comma = dataUrl.indexOf(',');
          return {
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            base64: dataUrl.slice(comma + 1),
            dataUrl,
          } satisfies DroppedFile;
        }),
      );
      setFiles((prev) => [...results, ...prev]);
    } catch {
      setFileError(
        translate({id: 'base64.errorFileRead', message: 'ファイルの読み込みに失敗した。'}),
      );
    }
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFiles = () => setFiles([]);

  const copyFileText = async (id: string, text: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (!success) {
      setFileError(
        translate({id: 'base64.errorCopy', message: 'コピーに失敗した。手動で選択してコピーしてください。'}),
      );
      return;
    }
    setCopiedFileId(id);
    setTimeout(() => setCopiedFileId(null), 1500);
  };

  return (
    <Layout
      title={translate({id: 'base64.title', message: 'Base64 変換'})}
      description={translate({
        id: 'base64.description',
        message: 'テキストやファイルを Base64 に変換するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="base64.title">Base64 変換</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="base64.subtitle">
            テキストを入力するか、ファイルをドロップして Base64 に変換する。変換はすべてブラウザ内で完結し、内容はサーバーに送信されない。
          </Translate>
        </p>

        {/* ── Text encode/decode ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="base64.textSectionTitle">テキストを変換</Translate>
        </Heading>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading editor...</div>}>
          {() => <Base64TextEditors />}
        </BrowserOnly>

        {/* ── File dropzone ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="base64.fileSectionTitle">ファイルを変換</Translate>
        </Heading>

        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className={styles.hiddenInput}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className={styles.dropzoneText}>
            <Translate id="base64.dropHint">
              ここにファイルをドロップ、またはクリックして選択
            </Translate>
          </p>
        </div>

        {fileError && <p className={styles.errorText}>{fileError}</p>}

        {files.length > 0 && (
          <>
            <div className={styles.actionsRow}>
              <button className={styles.actionBtnGhost} onClick={clearFiles}>
                <Translate id="base64.clearAll">すべてクリア</Translate>
              </button>
            </div>

            <ul className={styles.fileList}>
              {files.map((f) => (
                <li key={f.id} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{f.name}</span>
                    <span className={styles.fileMeta}>
                      {f.mimeType} ・ {formatBytes(f.size)}
                    </span>
                  </div>
                  <div className={styles.fileActions}>
                    <button
                      className={styles.actionBtnGhostSmall}
                      onClick={() => copyFileText(f.id, f.base64)}
                    >
                      {copiedFileId === f.id ? (
                        <Translate id="base64.copied">コピーしました</Translate>
                      ) : (
                        <Translate id="base64.copyBase64">Base64 をコピー</Translate>
                      )}
                    </button>
                    <button
                      className={styles.actionBtnGhostSmall}
                      onClick={() => copyFileText(f.id, f.dataUrl)}
                    >
                      <Translate id="base64.copyDataUri">data: URI をコピー</Translate>
                    </button>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFile(f.id)}
                      aria-label={translate({id: 'base64.remove', message: '削除'})}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="base64.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="base64.note1">
                変換はブラウザ内で完結し、入力内容やファイルがサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="base64.note2">
                デコード時に data: URI をそのまま貼り付けると MIME タイプが自動で読み取られる。
              </Translate>
            </li>
            <li>
              <Translate id="base64.note3">
                コピーした data: URI はブラウザのアドレスバーに貼り付けると直接表示できる。
              </Translate>
            </li>
            <li>
              <Translate id="base64.note4">
                ファイルをドロップすると、そのファイルの Base64 と data: URI をコピーできる。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
