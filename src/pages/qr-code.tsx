import type {ReactNode} from 'react';
import {useState, useCallback, useEffect, useRef} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import QRCode from 'qrcode';
import styles from './qr-code.module.css';

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const EC_LEVELS: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'];
const SIZES = [256, 512, 1024];

interface QrOptions {
  ec: ErrorCorrectionLevel;
  width: number;
  margin: number;
  dark: string;
  transparent: boolean;
}

interface QrResult {
  png: string;
  svg: string;
}

const DEFAULT_OPTIONS: QrOptions = {
  ec: 'M',
  width: 512,
  margin: 4,
  dark: '#000000',
  transparent: false,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function makeQr(data: string | Uint8Array, o: QrOptions): Promise<QrResult> {
  const input =
    typeof data === 'string' ? data : [{data, mode: 'byte' as const}];
  const common = {
    errorCorrectionLevel: o.ec,
    margin: o.margin,
    color: {dark: o.dark, light: o.transparent ? '#0000' : '#ffffff'},
  };
  const png = await QRCode.toDataURL(input, {...common, width: o.width});
  const svg = await QRCode.toString(input, {...common, type: 'svg'});
  return {png, svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`};
}

function download(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error('file read failed'));
    reader.readAsArrayBuffer(file);
  });
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

const tooBigMessage = () =>
  translate({
    id: 'qrCode.errorTooBig',
    message: 'データが大きすぎて QR コードに収まらない。誤り訂正レベルを下げるか、内容を短くしてください。',
  });

interface QrFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  result: QrResult | null;
  error: string | null;
}

function OptionsPanel({
  options,
  onChange,
}: {
  options: QrOptions;
  onChange: (next: QrOptions) => void;
}): ReactNode {
  return (
    <div className={styles.optionsRow}>
      <label className={styles.option}>
        <Translate id="qrCode.ecLevel">誤り訂正レベル</Translate>
        <select
          className={styles.select}
          value={options.ec}
          onChange={(e) =>
            onChange({...options, ec: e.target.value as ErrorCorrectionLevel})
          }
        >
          {EC_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.option}>
        <Translate id="qrCode.size">サイズ</Translate>
        <select
          className={styles.select}
          value={options.width}
          onChange={(e) => onChange({...options, width: Number(e.target.value)})}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size} px
            </option>
          ))}
        </select>
      </label>

      <label className={styles.option}>
        <Translate id="qrCode.margin">余白</Translate>
        <input
          className={styles.numberInput}
          type="number"
          min={0}
          max={16}
          value={options.margin}
          onChange={(e) =>
            onChange({
              ...options,
              margin: Math.min(16, Math.max(0, Number(e.target.value) || 0)),
            })
          }
        />
      </label>

      <label className={styles.option}>
        <Translate id="qrCode.color">前景色</Translate>
        <input
          className={styles.colorInput}
          type="color"
          value={options.dark}
          onChange={(e) => onChange({...options, dark: e.target.value})}
        />
      </label>

      <label className={styles.checkboxOption}>
        <input
          type="checkbox"
          checked={options.transparent}
          onChange={(e) => onChange({...options, transparent: e.target.checked})}
        />
        <Translate id="qrCode.transparent">背景を透過</Translate>
      </label>
    </div>
  );
}

export default function QrCodePage(): ReactNode {
  const [options, setOptions] = useState<QrOptions>(DEFAULT_OPTIONS);

  // ── Text section ──────────────────────────────
  const [text, setText] = useState('https://www.hikari-dev.com/');
  const [textResult, setTextResult] = useState<QrResult | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (text === '') {
      setTextResult(null);
      setTextError(null);
      return undefined;
    }
    makeQr(text, options).then(
      (result) => {
        if (cancelled) return;
        setTextResult(result);
        setTextError(null);
      },
      () => {
        if (cancelled) return;
        setTextResult(null);
        setTextError(tooBigMessage());
      },
    );
    return () => {
      cancelled = true;
    };
  }, [text, options]);

  const copyDataUri = async () => {
    if (!textResult) return;
    const success = await copyToClipboard(textResult.png);
    if (!success) {
      setTextError(
        translate({
          id: 'qrCode.errorCopy',
          message: 'コピーに失敗した。手動で選択してコピーしてください。',
        }),
      );
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ── File section ──────────────────────────────
  const [files, setFiles] = useState<QrFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);
    try {
      const loaded = await Promise.all(
        Array.from(fileList).map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          size: file.size,
          bytes: await readFileAsBytes(file),
          result: null,
          error: null,
        })),
      );
      setFiles((prev) => [...loaded, ...prev]);
    } catch {
      setFileError(
        translate({id: 'qrCode.errorFileRead', message: 'ファイルの読み込みに失敗した。'}),
      );
    }
  }, []);

  // ファイルの QR はオプション変更のたびに作り直す。
  useEffect(() => {
    let cancelled = false;
    const pending = files.filter((f) => f.result === null && f.error === null);
    if (pending.length === 0) return undefined;
    Promise.all(
      pending.map(async (f) => {
        try {
          return {id: f.id, result: await makeQr(f.bytes, options), error: null};
        } catch {
          return {id: f.id, result: null, error: tooBigMessage()};
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setFiles((prev) =>
        prev.map((f) => {
          const hit = results.find((r) => r.id === f.id);
          return hit ? {...f, result: hit.result, error: hit.error} : f;
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [files, options]);

  useEffect(() => {
    setFiles((prev) =>
      prev.length === 0
        ? prev
        : prev.map((f) => ({...f, result: null, error: null})),
    );
  }, [options]);

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const baseName = (name: string) => name.replace(/\.[^.]+$/, '');

  return (
    <Layout
      title={translate({id: 'qrCode.title', message: 'QR コード生成'})}
      description={translate({
        id: 'qrCode.description',
        message: 'テキストやファイルを QR コードに変換するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="qrCode.title">QR コード生成</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="qrCode.subtitle">
            テキストを入力するか、ファイルをドロップして QR コードを生成する。生成はすべてブラウザ内で完結し、内容はサーバーに送信されない。
          </Translate>
        </p>

        <OptionsPanel options={options} onChange={setOptions} />

        {/* ── Text ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="qrCode.textSectionTitle">テキストから生成</Translate>
        </Heading>

        <div className={styles.panes}>
          <div className={styles.pane}>
            <div className={styles.paneHeader}>
              <span className={styles.paneLabel}>
                <Translate id="qrCode.textLabel">テキスト</Translate>
              </span>
              <span className={styles.byteCount}>
                {formatBytes(new TextEncoder().encode(text).length)}
              </span>
            </div>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={translate({
                id: 'qrCode.placeholder',
                message: 'URL やテキストを入力',
              })}
            />
          </div>

          <div className={styles.pane}>
            <div className={styles.paneHeader}>
              <span className={styles.paneLabel}>
                <Translate id="qrCode.qrLabel">QR コード</Translate>
              </span>
              <button
                className={styles.copyBtn}
                onClick={copyDataUri}
                disabled={!textResult}
              >
                {copied ? (
                  <Translate id="qrCode.copied">コピーしました</Translate>
                ) : (
                  <Translate id="qrCode.copyDataUri">data: URI をコピー</Translate>
                )}
              </button>
            </div>
            <div className={styles.previewBox}>
              {textResult ? (
                <img
                  className={styles.preview}
                  src={textResult.png}
                  alt={translate({id: 'qrCode.qrLabel', message: 'QR コード'})}
                />
              ) : (
                <span className={styles.previewEmpty}>
                  <Translate id="qrCode.previewEmpty">
                    テキストを入力すると QR コードが表示される。
                  </Translate>
                </span>
              )}
            </div>
          </div>
        </div>

        {textError && <p className={styles.errorText}>{textError}</p>}

        <div className={styles.actionsRow}>
          <button
            className={styles.actionBtnGhost}
            onClick={() => textResult && download(textResult.png, 'qrcode.png')}
            disabled={!textResult}
          >
            <Translate id="qrCode.downloadPng">PNG をダウンロード</Translate>
          </button>
          <button
            className={styles.actionBtnGhost}
            onClick={() => textResult && download(textResult.svg, 'qrcode.svg')}
            disabled={!textResult}
          >
            <Translate id="qrCode.downloadSvg">SVG をダウンロード</Translate>
          </button>
        </div>

        {/* ── Files ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="qrCode.fileSectionTitle">ファイルから生成</Translate>
        </Heading>

        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
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
            <Translate id="qrCode.dropHint">
              ここにファイルをドロップ、またはクリックして選択
            </Translate>
          </p>
        </div>

        {fileError && <p className={styles.errorText}>{fileError}</p>}

        {files.length > 0 && (
          <>
            <div className={styles.actionsRow}>
              <button className={styles.actionBtnGhost} onClick={() => setFiles([])}>
                <Translate id="qrCode.clearAll">すべてクリア</Translate>
              </button>
            </div>

            <ul className={styles.fileList}>
              {files.map((f) => (
                <li key={f.id} className={styles.fileItem}>
                  <div className={styles.fileThumb}>
                    {f.result ? (
                      <img className={styles.thumbImg} src={f.result.png} alt={f.name} />
                    ) : (
                      <span className={styles.thumbEmpty}>-</span>
                    )}
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{f.name}</span>
                    <span className={styles.fileMeta}>{formatBytes(f.size)}</span>
                    {f.error && <span className={styles.fileErrorText}>{f.error}</span>}
                  </div>
                  <div className={styles.fileActions}>
                    <button
                      className={styles.actionBtnGhostSmall}
                      onClick={() =>
                        f.result && download(f.result.png, `${baseName(f.name)}-qr.png`)
                      }
                      disabled={!f.result}
                    >
                      <Translate id="qrCode.downloadPng">PNG をダウンロード</Translate>
                    </button>
                    <button
                      className={styles.actionBtnGhostSmall}
                      onClick={() =>
                        f.result && download(f.result.svg, `${baseName(f.name)}-qr.svg`)
                      }
                      disabled={!f.result}
                    >
                      <Translate id="qrCode.downloadSvg">SVG をダウンロード</Translate>
                    </button>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFile(f.id)}
                      aria-label={translate({id: 'qrCode.remove', message: '削除'})}
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
            <Translate id="qrCode.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="qrCode.note1">
                生成はブラウザ内で完結し、入力内容やファイルがサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="qrCode.note2">
                QR コードに格納できるデータ量には上限があり、バイナリの場合は最大 2,953 バイト (誤り訂正レベル L) である。
              </Translate>
            </li>
            <li>
              <Translate id="qrCode.note3">
                誤り訂正レベルは L (7%) から H (30%) まで選べる。レベルを上げるほど汚れや欠けに強くなるが、格納できるデータ量は減る。
              </Translate>
            </li>
            <li>
              <Translate id="qrCode.note4">
                ファイルは中身をそのままバイト列として埋め込む。読み取り側でファイルとして復元するにはバイナリ対応のリーダーが必要である。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
