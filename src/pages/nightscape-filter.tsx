import type {ReactNode} from 'react';
import {useState, useCallback, useRef, useEffect} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './nightscape-filter.module.css';

interface NightscapeImage {
  id: string;
  originalName: string;
  originalSize: number;
  originalUrl: string;
  filteredUrl: string;
  filteredSize: number;
  width: number;
  height: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function filteredFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}-nightscape.jpg`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// 分離型ボックスぼかし (スライディングウィンドウ)
function boxBlur1D(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
  horizontal: boolean,
): Float32Array {
  if (radius < 1) return src.slice();
  const dst = new Float32Array(src.length);
  const size = radius * 2 + 1;
  if (horizontal) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -radius; x <= radius; x++) {
        sum += src[row + Math.min(w - 1, Math.max(0, x))];
      }
      for (let x = 0; x < w; x++) {
        dst[row + x] = sum / size;
        const outIdx = Math.min(w - 1, Math.max(0, x - radius));
        const inIdx = Math.min(w - 1, Math.max(0, x + radius + 1));
        sum += src[row + inIdx] - src[row + outIdx];
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += src[Math.min(h - 1, Math.max(0, y)) * w + x];
      }
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = sum / size;
        const outIdx = Math.min(h - 1, Math.max(0, y - radius));
        const inIdx = Math.min(h - 1, Math.max(0, y + radius + 1));
        sum += src[inIdx * w + x] - src[outIdx * w + x];
      }
    }
  }
  return dst;
}

function boxBlur2D(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  return boxBlur1D(boxBlur1D(src, w, h, radius, true), w, h, radius, false);
}

// 夜景美化フィルター本体。t は強度 (0〜1.5)。
function applyNightscapeGrading(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  noiseReduction: boolean,
): void {
  const n = w * h;

  // 1. カラーノイズ除去 (色差成分のみぼかし、輝度は保持)
  if (noiseReduction && t > 0) {
    const cb = new Float32Array(n);
    const cr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      cb[i] = -0.169 * r - 0.331 * g + 0.5 * b;
      cr[i] = 0.5 * r - 0.419 * g - 0.081 * b;
    }
    const radius = Math.max(1, Math.round(1 + 2 * t));
    const cbBlur = boxBlur2D(cb, w, h, radius);
    const crBlur = boxBlur2D(cr, w, h, radius);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const y = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      data[o] = clamp01((y + 1.402 * crBlur[i]) / 255) * 255;
      data[o + 1] = clamp01((y - 0.344 * cbBlur[i] - 0.714 * crBlur[i]) / 255) * 255;
      data[o + 2] = clamp01((y + 1.772 * cbBlur[i]) / 255) * 255;
    }
  }

  // 2. トーン・色調補正 (露出・コントラスト・ハイライト/シャドウ・黒/白レベル・色温度・自然な彩度)
  const exposureGain = 2 ** (0.3 * t);
  const contrast = 0.3 * t + 0.15 * t; // コントラスト + かすみ除去の簡易統合
  const whiteGain = 1 + 0.08 * t;
  const blackOffset = -0.05 * t;
  const rTemp = 1 - 0.04 * t;
  const bTemp = 1 + 0.04 * t;
  const gTint = 1 - 0.015 * t;
  const vibranceAmt = 0.3 * t;
  const saturationAmt = 0.08 * t;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = (data[o] / 255) * exposureGain;
    let g = (data[o + 1] / 255) * exposureGain;
    let b = (data[o + 2] / 255) * exposureGain;

    const y1 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (y1 > 0.7) {
      const hl = (y1 - 0.7) / 0.3;
      const factor = 1 - 0.4 * t * hl * 0.6;
      r *= factor;
      g *= factor;
      b *= factor;
    } else if (y1 < 0.3) {
      const sh = (0.3 - y1) / 0.3;
      const lift = 0.25 * t * sh * 0.5;
      r += lift;
      g += lift;
      b += lift;
    }

    r = (r - 0.5) * (1 + contrast) + 0.5;
    g = (g - 0.5) * (1 + contrast) + 0.5;
    b = (b - 0.5) * (1 + contrast) + 0.5;

    r = r * whiteGain + blackOffset;
    g = g * whiteGain + blackOffset;
    b = b * whiteGain + blackOffset;

    r *= rTemp;
    b *= bTemp;
    g *= gTint;

    const maxc = Math.max(r, g, b);
    const minc = Math.min(r, g, b);
    const currentSat = maxc - minc;
    const y2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const satFactor = 1 + vibranceAmt * (1 - currentSat) + saturationAmt;
    r = y2 + (r - y2) * satFactor;
    g = y2 + (g - y2) * satFactor;
    b = y2 + (b - y2) * satFactor;

    data[o] = clamp01(r) * 255;
    data[o + 1] = clamp01(g) * 255;
    data[o + 2] = clamp01(b) * 255;
  }

  // 3. 明瞭度・テクスチャ・シャープ (アンシャープマスク 2段)
  if (t > 0) {
    const lum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      lum[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    }
    const clarityBlur = boxBlur2D(lum, w, h, 4);
    const sharpenBlur = boxBlur2D(lum, w, h, 1);
    const clarityAmt = 0.3 * t; // clarity + texture 統合
    const sharpenAmt = 0.2 * t;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const delta =
        clarityAmt * (lum[i] - clarityBlur[i]) + sharpenAmt * (lum[i] - sharpenBlur[i]);
      data[o] = clamp01((data[o] + delta) / 255) * 255;
      data[o + 1] = clamp01((data[o + 1] + delta) / 255) * 255;
      data[o + 2] = clamp01((data[o + 2] + delta) / 255) * 255;
    }
  }

  // 4. 周辺減光
  if (t > 0) {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist2 = cx * cx + cy * cy;
    const strength = 0.15 * t;
    for (let y = 0; y < h; y++) {
      const dy = y - cy;
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const d2 = (dx * dx + dy * dy) / maxDist2;
        const factor = 1 - strength * d2;
        const o = (y * w + x) * 4;
        data[o] = clamp01((data[o] / 255) * factor) * 255;
        data[o + 1] = clamp01((data[o + 1] / 255) * factor) * 255;
        data[o + 2] = clamp01((data[o + 2] / 255) * factor) * 255;
      }
    }
  }
}

interface FilterResult {
  filteredUrl: string;
  filteredSize: number;
  width: number;
  height: number;
}

function processImage(
  sourceUrl: string,
  intensity: number,
  noiseReduction: boolean,
): Promise<FilterResult> {
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
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyNightscapeGrading(
        imageData.data,
        canvas.width,
        canvas.height,
        intensity / 100,
        noiseReduction,
      );
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('filter processing failed'));
            return;
          }
          resolve({
            filteredUrl: URL.createObjectURL(blob),
            filteredSize: blob.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = sourceUrl;
  });
}

async function createNightscapeImage(
  file: File,
  intensity: number,
  noiseReduction: boolean,
): Promise<NightscapeImage> {
  const originalUrl = URL.createObjectURL(file);
  const result = await processImage(originalUrl, intensity, noiseReduction);
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    originalName: file.name,
    originalSize: file.size,
    originalUrl,
    ...result,
  };
}

export default function NightscapeFilterPage(): ReactNode {
  const [intensity, setIntensity] = useState(100);
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [images, setImages] = useState<NightscapeImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        setError(
          translate({id: 'nightscape.errorNoImage', message: '画像ファイルを選択してください。'}),
        );
        return;
      }
      setError(null);
      setIsProcessing(true);
      try {
        const results = await Promise.all(
          files.map((f) => createNightscapeImage(f, intensity, noiseReduction)),
        );
        setImages((prev) => [...results, ...prev]);
      } catch {
        setError(
          translate({id: 'nightscape.errorConvert', message: '処理に失敗した画像があります。'}),
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [intensity, noiseReduction],
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
              const result = await processImage(img.originalUrl, intensity, noiseReduction);
              URL.revokeObjectURL(img.filteredUrl);
              return {...img, ...result};
            } catch {
              return img;
            }
          }),
        );
        setImages(updated);
      })();
    }, 200);
    return () => {
      if (requeryRef.current) window.clearTimeout(requeryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, noiseReduction]);

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
        URL.revokeObjectURL(target.filteredUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.originalUrl);
      URL.revokeObjectURL(img.filteredUrl);
    });
    setImages([]);
  };

  const downloadAll = () => {
    images.forEach((img) => {
      const a = document.createElement('a');
      a.href = img.filteredUrl;
      a.download = filteredFileName(img.originalName);
      a.click();
    });
  };

  return (
    <Layout
      title={translate({id: 'nightscape.title', message: '夜景美化フィルター'})}
      description={translate({
        id: 'nightscape.description',
        message: '夜景写真の黒を引き締め、光源を美しく強調するフィルター。ブラウザ内で処理されるためサーバーに画像は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="nightscape.title">夜景美化フィルター</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="nightscape.subtitle">
            夜景写真をドラッグ＆ドロップすると、黒を引き締め光源を強調した画像に加工される。すべてブラウザ内で処理され、画像はサーバーに送信されない。
          </Translate>
        </p>

        {/* Intensity slider */}
        <div className={styles.controlsRow}>
          <div className={styles.qualityRow}>
            <span className={styles.qualityLabel}>
              <Translate id="nightscape.intensity">強度</Translate>
            </span>
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className={styles.qualitySlider}
            />
            <span className={styles.qualityValue}>{intensity}%</span>
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={noiseReduction}
              onChange={(e) => setNoiseReduction(e.target.checked)}
            />
            <span>
              <Translate id="nightscape.noiseReduction">ノイズ除去</Translate>
            </span>
          </label>
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
            {isProcessing ? (
              <Translate id="nightscape.processing">処理中...</Translate>
            ) : (
              <Translate id="nightscape.dropHint">
                ここに夜景写真をドロップ、またはクリックして選択
              </Translate>
            )}
          </p>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {images.length > 0 && (
          <>
            <div className={styles.actionsRow}>
              <button className={styles.actionBtn} onClick={downloadAll}>
                <Translate id="nightscape.downloadAll">すべてダウンロード</Translate>
              </button>
              <button className={styles.actionBtnGhost} onClick={clearAll}>
                <Translate id="nightscape.clearAll">すべてクリア</Translate>
              </button>
            </div>

            <ul className={styles.imageList}>
              {images.map((img) => (
                <li key={img.id} className={styles.imageItem}>
                  <div className={styles.comparePair}>
                    <div className={styles.compareCol}>
                      <img
                        src={img.originalUrl}
                        alt={img.originalName}
                        className={styles.thumb}
                      />
                      <span className={styles.compareLabel}>
                        <Translate id="nightscape.before">加工前</Translate>
                      </span>
                    </div>
                    <div className={styles.compareCol}>
                      <img
                        src={img.filteredUrl}
                        alt={img.originalName}
                        className={styles.thumb}
                      />
                      <span className={styles.compareLabel}>
                        <Translate id="nightscape.after">加工後</Translate>
                      </span>
                    </div>
                  </div>
                  <div className={styles.imageInfo}>
                    <span className={styles.imageName}>{img.originalName}</span>
                    <span className={styles.imageMeta}>
                      {img.width} × {img.height} ・ {formatBytes(img.originalSize)} →{' '}
                      {formatBytes(img.filteredSize)}
                    </span>
                  </div>
                  <a
                    href={img.filteredUrl}
                    download={filteredFileName(img.originalName)}
                    className={styles.downloadBtn}
                  >
                    <Translate id="nightscape.download">保存</Translate>
                  </a>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeImage(img.id)}
                    aria-label={translate({id: 'nightscape.remove', message: '削除'})}
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
            <Translate id="nightscape.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="nightscape.note1">
                処理はブラウザ内で完結し、画像がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="nightscape.note2">
                黒の引き締め、光源の強調、夜空のクリア化、周辺減光などを組み合わせて夜景を美しく仕上げる。
              </Translate>
            </li>
            <li>
              <Translate id="nightscape.note3">
                強度スライダーで効果の強さを調整できる (0% で加工なし、100% が標準)。
              </Translate>
            </li>
            <li>
              <Translate id="nightscape.note4">
                ノイズ除去はスマートフォン写真などノイズの多い画像に有効。輝度は保持したまま色ノイズのみを軽減する。
              </Translate>
            </li>
            <li>
              <Translate id="nightscape.note5">
                昼間の写真や室内写真、天体写真には適さない。夜景・街灯・都市夜景での使用を想定している。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
