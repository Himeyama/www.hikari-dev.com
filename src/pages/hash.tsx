import type {ReactNode} from 'react';
import {useState, useCallback, useRef, useEffect} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './hash.module.css';

const ALGORITHMS = ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512'] as const;
type Algorithm = (typeof ALGORITHMS)[number];

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

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHashes(data: BufferSource): Promise<Record<Algorithm, string>> {
  const entries = await Promise.all(
    ALGORITHMS.map(async (algo) => {
      const digest = await crypto.subtle.digest(algo, data);
      return [algo, bufferToHex(digest)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Algorithm, string>;
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

interface DroppedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  hashes: Record<Algorithm, string>;
}

function HashList({
  hashes,
  copiedKey,
  onCopy,
  keyPrefix,
}: {
  hashes: Record<Algorithm, string> | null;
  copiedKey: string | null;
  onCopy: (algo: Algorithm, value: string) => void;
  keyPrefix: string;
}): ReactNode {
  return (
    <ul className={styles.hashList}>
      {ALGORITHMS.map((algo) => {
        const value = hashes?.[algo] ?? '';
        const key = `${keyPrefix}:${algo}`;
        return (
          <li key={algo} className={styles.hashItem}>
            <span className={styles.hashLabel}>{algo}</span>
            <code className={styles.hashValue}>{value || '—'}</code>
            <button
              className={styles.copyBtn}
              onClick={() => onCopy(algo, value)}
              disabled={!value}
            >
              {copiedKey === key ? (
                <Translate id="hash.copied">コピーしました</Translate>
              ) : (
                <Translate id="hash.copy">コピー</Translate>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function HashTextEditor(): ReactNode {
  const {colorMode} = useColorMode();
  const [text, setText] = useState('');
  const [textHashes, setTextHashes] = useState<Record<Algorithm, string> | null>(null);
  const [copiedTextKey, setCopiedTextKey] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (text === '') {
      setTextHashes(null);
      setTextError(null);
      return;
    }
    computeHashes(new TextEncoder().encode(text))
      .then((result) => {
        if (!cancelled) {
          setTextHashes(result);
          setTextError(null);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          if (typeof crypto === 'undefined' || !crypto.subtle) {
            setTextError(
              translate({
                id: 'hash.errorInsecureContext',
                message:
                  'ハッシュ計算には Web Crypto API が必要。HTTPS またはlocalhost 以外の環境では利用できない。',
              }),
            );
            return;
          }
          setTextError(
            translate({id: 'hash.errorCompute', message: 'ハッシュ値の計算に失敗した。'}),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  const copyTextHash = async (algo: Algorithm, value: string) => {
    if (!value) return;
    const success = await copyToClipboard(value);
    if (!success) {
      setTextError(
        translate({id: 'hash.errorCopy', message: 'コピーに失敗した。手動で選択してコピーしてください。'}),
      );
      return;
    }
    setCopiedTextKey(`text:${algo}`);
    setTimeout(() => setCopiedTextKey(null), 1500);
  };

  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <>
      <div className={styles.editorWrapper}>
        <Editor
          language="plaintext"
          value={text}
          theme={editorTheme}
          options={EDITOR_OPTIONS}
          onChange={(value) => setText(value ?? '')}
        />
      </div>

      {textError && <p className={styles.errorText}>{textError}</p>}

      <HashList
        hashes={textHashes}
        copiedKey={copiedTextKey}
        onCopy={copyTextHash}
        keyPrefix="text"
      />
    </>
  );
}

export default function HashPage(): ReactNode {
  // ── File hashing section ──────────────────────
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedFileKey, setCopiedFileKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    try {
      const results = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const hashes = await computeHashes(buffer);
          return {
            id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            hashes,
          } satisfies DroppedFile;
        }),
      );
      setFiles((prev) => [...results, ...prev]);
    } catch (e) {
      console.error(e);
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        setFileError(
          translate({
            id: 'hash.errorInsecureContext',
            message:
              'ハッシュ計算には Web Crypto API が必要。HTTPS またはlocalhost 以外の環境では利用できない。',
          }),
        );
        return;
      }
      setFileError(
        translate({id: 'hash.errorFileRead', message: 'ファイルの読み込みに失敗した。'}),
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

  const copyFileHash = async (fileId: string, algo: Algorithm, value: string) => {
    if (!value) return;
    const success = await copyToClipboard(value);
    if (!success) {
      setFileError(
        translate({id: 'hash.errorCopy', message: 'コピーに失敗した。手動で選択してコピーしてください。'}),
      );
      return;
    }
    setCopiedFileKey(`${fileId}:${algo}`);
    setTimeout(() => setCopiedFileKey(null), 1500);
  };

  return (
    <Layout
      title={translate({id: 'hash.title', message: 'ハッシュ値取得'})}
      description={translate({
        id: 'hash.description',
        message: 'テキストやファイルのハッシュ値 (SHA-256 など) を計算するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="hash.title">ハッシュ値取得</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="hash.subtitle">
            テキストを入力するか、ファイルをドロップしてハッシュ値を計算する。計算はすべてブラウザ内で完結し、内容はサーバーに送信されない。
          </Translate>
        </p>

        {/* ── Text hashing ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="hash.textSectionTitle">テキストのハッシュ値を計算</Translate>
        </Heading>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading editor...</div>}>
          {() => <HashTextEditor />}
        </BrowserOnly>

        {/* ── File hashing ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="hash.fileSectionTitle">ファイルのハッシュ値を計算</Translate>
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
            <Translate id="hash.dropHint">
              ここにファイルをドロップ、またはクリックして選択
            </Translate>
          </p>
        </div>

        {fileError && <p className={styles.errorText}>{fileError}</p>}

        {files.length > 0 && (
          <>
            <div className={styles.actionsRow}>
              <button className={styles.actionBtnGhost} onClick={clearFiles}>
                <Translate id="hash.clearAll">すべてクリア</Translate>
              </button>
            </div>

            <ul className={styles.fileList}>
              {files.map((f) => (
                <li key={f.id} className={styles.fileItem}>
                  <div className={styles.fileItemHeader}>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{f.name}</span>
                      <span className={styles.fileMeta}>
                        {f.mimeType} ・ {formatBytes(f.size)}
                      </span>
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFile(f.id)}
                      aria-label={translate({id: 'hash.remove', message: '削除'})}
                    >
                      ×
                    </button>
                  </div>
                  <HashList
                    hashes={f.hashes}
                    copiedKey={copiedFileKey}
                    onCopy={(algo, value) => copyFileHash(f.id, algo, value)}
                    keyPrefix={f.id}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="hash.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="hash.note1">
                計算はブラウザ内で完結し、入力内容やファイルがサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="hash.note2">
                SHA-1・SHA-256・SHA-384・SHA-512 に対応する。MD5 はブラウザ標準 API
                (Web Crypto API) が対応しないため計算できない。
              </Translate>
            </li>
            <li>
              <Translate id="hash.note3">
                ファイルの整合性を確認する場合は SHA-256 以上のアルゴリズムの使用が推奨される。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
