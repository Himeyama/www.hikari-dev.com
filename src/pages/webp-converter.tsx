import type {ReactNode} from 'react';
import {useState, useCallback, useRef, useEffect} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './webp-converter.module.css';

interface ConvertedImage {
  id: string;
  originalName: string;
  originalSize: number;
  originalUrl: string;
  webpUrl: string;
  webpSize: number;
  width: number;
  height: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function webpFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.webp`;
}

interface EncodeResult {
  webpUrl: string;
  webpSize: number;
  width: number;
  height: number;
}

function encodeWebp(sourceUrl: string, quality: number): Promise<EncodeResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('webp encoding failed'));
            return;
          }
          resolve({
            webpUrl: URL.createObjectURL(blob),
            webpSize: blob.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        },
        'image/webp',
        quality,
      );
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = sourceUrl;
  });
}

async function convertToWebp(file: File, quality: number): Promise<ConvertedImage> {
  const originalUrl = URL.createObjectURL(file);
  const encoded = await encodeWebp(originalUrl, quality);
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    originalName: file.name,
    originalSize: file.size,
    originalUrl,
    ...encoded,
  };
}

export default function WebpConverterPage(): ReactNode {
  const [quality, setQuality] = useState(0.8);
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        setError(
          translate({id: 'webp.errorNoImage', message: '画像ファイルを選択してください。'}),
        );
        return;
      }
      setError(null);
      setIsConverting(true);
      try {
        const results = await Promise.all(files.map((f) => convertToWebp(f, quality)));
        setImages((prev) => [...results, ...prev]);
      } catch {
        setError(
          translate({id: 'webp.errorConvert', message: '変換に失敗した画像があります。'}),
        );
      } finally {
        setIsConverting(false);
      }
    },
    [quality],
  );

  const requeryRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length === 0) return;
    if (requeryRef.current) window.clearTimeout(requeryRef.current);
    requeryRef.current = window.setTimeout(() => {
      (async () => {
        const updated = await Promise.all(
          images.map(async (img) => {
            try {
              const encoded = await encodeWebp(img.originalUrl, quality);
              URL.revokeObjectURL(img.webpUrl);
              return {...img, ...encoded};
            } catch {
              return img;
            }
          }),
        );
        setImages(updated);
      })();
    }, 150);
    return () => {
      if (requeryRef.current) window.clearTimeout(requeryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

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
        URL.revokeObjectURL(target.webpUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.originalUrl);
      URL.revokeObjectURL(img.webpUrl);
    });
    setImages([]);
  };

  const downloadAll = () => {
    images.forEach((img) => {
      const a = document.createElement('a');
      a.href = img.webpUrl;
      a.download = webpFileName(img.originalName);
      a.click();
    });
  };

  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalWebp = images.reduce((sum, img) => sum + img.webpSize, 0);
  const totalSaved =
    totalOriginal > 0 ? Math.round((1 - totalWebp / totalOriginal) * 100) : 0;

  return (
    <Layout
      title={translate({id: 'webp.title', message: '画像を WebP に変換'})}
      description={translate({
        id: 'webp.description',
        message: '画像を WebP 形式に変換するツール。ブラウザ内で処理されるためサーバーに画像は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="webp.title">画像を WebP に変換</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="webp.subtitle">
            画像をドラッグ＆ドロップすると WebP 形式に変換される。すべてブラウザ内で処理され、画像はサーバーに送信されない。
          </Translate>
        </p>

        {/* Quality slider */}
        <div className={styles.qualityRow}>
          <span className={styles.qualityLabel}>
            <Translate id="webp.quality">画質</Translate>
          </span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className={styles.qualitySlider}
          />
          <span className={styles.qualityValue}>{Math.round(quality * 100)}%</span>
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
            accept="image/*"
            multiple
            className={styles.hiddenInput}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className={styles.dropzoneText}>
            {isConverting ? (
              <Translate id="webp.converting">変換中...</Translate>
            ) : (
              <Translate id="webp.dropHint">
                ここに画像をドロップ、またはクリックして選択
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
                  <Translate id="webp.fileCount">枚数</Translate>
                </span>
                <span className={styles.statValue}>{images.length}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="webp.original">変換前</Translate>
                </span>
                <span className={styles.statValue}>{formatBytes(totalOriginal)}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="webp.converted">変換後</Translate>
                </span>
                <span className={styles.statValue}>{formatBytes(totalWebp)}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>
                  <Translate id="webp.saved">削減率</Translate>
                </span>
                <span className={`${styles.statValue} ${styles.savedValue}`}>
                  {totalSaved}%
                </span>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button className={styles.actionBtn} onClick={downloadAll}>
                <Translate id="webp.downloadAll">すべてダウンロード</Translate>
              </button>
              <button className={styles.actionBtnGhost} onClick={clearAll}>
                <Translate id="webp.clearAll">すべてクリア</Translate>
              </button>
            </div>

            {/* Image list */}
            <ul className={styles.imageList}>
              {images.map((img) => {
                const saved = Math.round((1 - img.webpSize / img.originalSize) * 100);
                return (
                  <li key={img.id} className={styles.imageItem}>
                    <img
                      src={img.webpUrl}
                      alt={img.originalName}
                      className={styles.thumb}
                      width={64}
                      height={64}
                    />
                    <div className={styles.imageInfo}>
                      <span className={styles.imageName}>{img.originalName}</span>
                      <span className={styles.imageMeta}>
                        {img.width} × {img.height} ・ {formatBytes(img.originalSize)} →{' '}
                        {formatBytes(img.webpSize)}{' '}
                        <span
                          className={saved >= 0 ? styles.savedValue : styles.growValue}
                        >
                          ({saved >= 0 ? '-' : '+'}
                          {Math.abs(saved)}%)
                        </span>
                      </span>
                    </div>
                    <a
                      href={img.webpUrl}
                      download={webpFileName(img.originalName)}
                      className={styles.downloadBtn}
                    >
                      <Translate id="webp.download">保存</Translate>
                    </a>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeImage(img.id)}
                      aria-label={translate({id: 'webp.remove', message: '削除'})}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="webp.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="webp.note1">
                変換はブラウザ内で完結し、画像がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="webp.note2">
                画質スライダーで圧縮率を調整できる (値が低いほどファイルサイズが小さくなる)。
              </Translate>
            </li>
            <li>
              <Translate id="webp.note3">複数の画像をまとめて変換できる。</Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
