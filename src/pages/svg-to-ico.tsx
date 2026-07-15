import type {ReactNode} from 'react';
import {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './svg-to-ico.module.css';

const AVAILABLE_SIZES = [16, 24, 32, 48, 64, 128, 256];
const DEFAULT_SIZES = [16, 32, 48, 256];

interface ConvertedIco {
  id: string;
  originalName: string;
  originalSize: number;
  originalUrl: string;
  icoUrl: string;
  icoSize: number;
  previewUrl: string;
  sizes: number[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function icoFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.ico`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function renderPng(img: HTMLImageElement, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('canvas context unavailable'));
      return;
    }
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('png encoding failed'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function buildIco(pngs: Array<{size: number; bytes: Uint8Array}>): Blob {
  const count = pngs.length;
  const headerSize = 6 + count * 16;
  const header = new Uint8Array(headerSize);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let entryOffset = 6;
  let dataOffset = headerSize;
  const dataParts: Uint8Array[] = [];

  for (const {size, bytes} of pngs) {
    const dim = size >= 256 ? 0 : size;
    header[entryOffset] = dim;
    header[entryOffset + 1] = dim;
    header[entryOffset + 2] = 0;
    header[entryOffset + 3] = 0;
    view.setUint16(entryOffset + 4, 1, true);
    view.setUint16(entryOffset + 6, 32, true);
    view.setUint32(entryOffset + 8, bytes.length, true);
    view.setUint32(entryOffset + 12, dataOffset, true);
    entryOffset += 16;
    dataParts.push(bytes);
    dataOffset += bytes.length;
  }

  return new Blob([header, ...dataParts] as BlobPart[], {type: 'image/x-icon'});
}

async function convertSvgToIco(
  originalUrl: string,
  sizes: number[],
): Promise<{icoBlob: Blob; previewBlob: Blob}> {
  const img = await loadImage(originalUrl);
  const sortedSizes = [...sizes].sort((a, b) => a - b);
  const pngs = await Promise.all(
    sortedSizes.map(async (size) => ({size, blob: await renderPng(img, size)})),
  );
  const pngBytes = await Promise.all(
    pngs.map(async (p) => ({size: p.size, bytes: new Uint8Array(await p.blob.arrayBuffer())})),
  );
  const icoBlob = buildIco(pngBytes);
  const previewBlob = pngs[pngs.length - 1].blob;
  return {icoBlob, previewBlob};
}

export default function SvgToIcoPage(): ReactNode {
  const [sizes, setSizes] = useState<Set<number>>(new Set(DEFAULT_SIZES));
  const [images, setImages] = useState<ConvertedIco[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedSizes = useMemo(() => Array.from(sizes).sort((a, b) => a - b), [sizes]);
  const sizesKey = sortedSizes.join(',');

  const toggleSize = (size: number) => {
    setSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) {
        if (next.size > 1) next.delete(size);
      } else {
        next.add(size);
      }
      return next;
    });
  };

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList).filter(
        (f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'),
      );
      if (files.length === 0) {
        setError(translate({id: 'svgIco.errorNoImage', message: 'SVG ファイルを選択してください。'}));
        return;
      }
      setError(null);
      setIsConverting(true);
      try {
        const results = await Promise.all(
          files.map(async (file) => {
            const originalUrl = URL.createObjectURL(file);
            const {icoBlob, previewBlob} = await convertSvgToIco(originalUrl, sortedSizes);
            const result: ConvertedIco = {
              id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
              originalName: file.name,
              originalSize: file.size,
              originalUrl,
              icoUrl: URL.createObjectURL(icoBlob),
              icoSize: icoBlob.size,
              previewUrl: URL.createObjectURL(previewBlob),
              sizes: sortedSizes,
            };
            return result;
          }),
        );
        setImages((prev) => [...results, ...prev]);
      } catch {
        setError(translate({id: 'svgIco.errorConvert', message: '変換に失敗した画像があります。'}));
      } finally {
        setIsConverting(false);
      }
    },
    [sortedSizes],
  );

  const resizeRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length === 0) return;
    if (resizeRef.current) window.clearTimeout(resizeRef.current);
    resizeRef.current = window.setTimeout(() => {
      (async () => {
        const updated = await Promise.all(
          images.map(async (img) => {
            try {
              const {icoBlob, previewBlob} = await convertSvgToIco(img.originalUrl, sortedSizes);
              URL.revokeObjectURL(img.icoUrl);
              URL.revokeObjectURL(img.previewUrl);
              return {
                ...img,
                icoUrl: URL.createObjectURL(icoBlob),
                icoSize: icoBlob.size,
                previewUrl: URL.createObjectURL(previewBlob),
                sizes: sortedSizes,
              };
            } catch {
              return img;
            }
          }),
        );
        setImages(updated);
      })();
    }, 150);
    return () => {
      if (resizeRef.current) window.clearTimeout(resizeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizesKey]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        URL.revokeObjectURL(target.icoUrl);
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.originalUrl);
      URL.revokeObjectURL(img.icoUrl);
      URL.revokeObjectURL(img.previewUrl);
    });
    setImages([]);
  };

  const downloadAll = () => {
    images.forEach((img) => {
      const a = document.createElement('a');
      a.href = img.icoUrl;
      a.download = icoFileName(img.originalName);
      a.click();
    });
  };

  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalIco = images.reduce((sum, img) => sum + img.icoSize, 0);

  return (
    <Layout
      title={translate({id: 'svgIco.title', message: 'SVG を ICO に変換'})}
      description={translate({
        id: 'svgIco.description',
        message: 'SVG 画像を ICO 形式に変換するツール。ブラウザ内で処理されるためサーバーに画像は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="svgIco.title">SVG を ICO に変換</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="svgIco.subtitle">
            SVG 画像をドラッグ&ドロップすると ICO 形式に変換される。複数のサイズを選択すると 1
            つの ICO ファイルにまとめて格納される。
          </Translate>
        </p>

        {/* Size selector */}
        <div className={styles.sizesRow}>
          <span className={styles.sizesLabel}>
            <Translate id="svgIco.sizesLabel">サイズ</Translate>
          </span>
          <div className={styles.sizeBtnGroup}>
            {AVAILABLE_SIZES.map((size) => (
              <button
                key={size}
                className={`${styles.sizeBtn} ${sizes.has(size) ? styles.sizeBtnActive : ''}`}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone */}
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
            accept="image/svg+xml,.svg"
            multiple
            className={styles.hiddenInput}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className={styles.dropzoneText}>
            {isConverting ? (
              <Translate id="svgIco.converting">変換中...</Translate>
            ) : (
              <Translate id="svgIco.dropHint">
                ここに SVG 画像をドロップ、またはクリックして選択
              </Translate>
            )}
          </p>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {images.length > 0 && (
          <>
            {/* Summary */}
            <div className={styles.statsBar}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="svgIco.fileCount">枚数</Translate>
                </span>
                <span className={styles.statValue}>{images.length}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="svgIco.original">変換前</Translate>
                </span>
                <span className={styles.statValue}>{formatBytes(totalOriginal)}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="svgIco.converted">変換後</Translate>
                </span>
                <span className={styles.statValue}>{formatBytes(totalIco)}</span>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button className={styles.actionBtn} onClick={downloadAll}>
                <Translate id="svgIco.downloadAll">すべてダウンロード</Translate>
              </button>
              <button className={styles.actionBtnGhost} onClick={clearAll}>
                <Translate id="svgIco.clearAll">すべてクリア</Translate>
              </button>
            </div>

            {/* Image list */}
            <ul className={styles.imageList}>
              {images.map((img) => (
                <li key={img.id} className={styles.imageItem}>
                  <img
                    src={img.previewUrl}
                    alt={img.originalName}
                    className={styles.thumb}
                    width={64}
                    height={64}
                  />
                  <div className={styles.imageInfo}>
                    <span className={styles.imageName}>{img.originalName}</span>
                    <span className={styles.imageMeta}>
                      {img.sizes.join(', ')} px ・ {formatBytes(img.originalSize)} →{' '}
                      {formatBytes(img.icoSize)}
                    </span>
                  </div>
                  <a
                    href={img.icoUrl}
                    download={icoFileName(img.originalName)}
                    className={styles.downloadBtn}
                  >
                    <Translate id="svgIco.download">保存</Translate>
                  </a>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeImage(img.id)}
                    aria-label={translate({id: 'svgIco.remove', message: '削除'})}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="svgIco.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="svgIco.note1">
                変換はブラウザ内で完結し、画像がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="svgIco.note2">
                サイズを複数選択すると、1 つの ICO ファイルに複数の解像度が格納される
                (Windows のアイコン表示サイズに応じて自動的に選択される)。
              </Translate>
            </li>
            <li>
              <Translate id="svgIco.note3">複数の画像をまとめて変換できる。</Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
