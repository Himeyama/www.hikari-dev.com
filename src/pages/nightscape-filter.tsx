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

interface NightscapeCoeffs {
  exposure: number;
  contrast: number;
  whiteGain: number;
  blackOffset: number;
  rTemp: number;
  bTemp: number;
  gTint: number;
  vibrance: number;
  saturation: number;
  clarity: number;
  sharpen: number;
  vignette: number;
  highlightRolloff: number;
  shadowLift: number;
}

interface NightscapePreset {
  id: string;
  gradient: string;
  coeffs: NightscapeCoeffs;
  defaultNoiseReduction: boolean;
}

const STANDARD_COEFFS: NightscapeCoeffs = {
  exposure: 0.3,
  contrast: 0.45,
  whiteGain: 0.08,
  blackOffset: -0.05,
  rTemp: -0.04,
  bTemp: 0.04,
  gTint: -0.015,
  vibrance: 0.3,
  saturation: 0.08,
  clarity: 0.3,
  sharpen: 0.2,
  vignette: 0.15,
  highlightRolloff: 0.4,
  shadowLift: 0.25,
};

const NIGHTSCAPE_PRESETS: NightscapePreset[] = [
  {
    id: 'standard',
    gradient: 'linear-gradient(135deg, #3a3f52, #1c1e2a)',
    coeffs: STANDARD_COEFFS,
    defaultNoiseReduction: true,
  },
  {
    id: 'warmStreet',
    gradient: 'linear-gradient(135deg, #f6a541, #7a3b12)',
    coeffs: {
      ...STANDARD_COEFFS,
      rTemp: -0.09,
      bTemp: 0.02,
      gTint: -0.02,
      contrast: 0.5,
      whiteGain: 0.1,
      vibrance: 0.32,
      saturation: 0.12,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'coolBlue',
    gradient: 'linear-gradient(135deg, #4d8dff, #0b1c3d)',
    coeffs: {
      ...STANDARD_COEFFS,
      rTemp: -0.02,
      bTemp: 0.09,
      gTint: -0.01,
      contrast: 0.4,
      blackOffset: -0.07,
      vibrance: 0.26,
      saturation: 0.06,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'neon',
    gradient: 'linear-gradient(135deg, #ff2fd6, #29e0ff)',
    coeffs: {
      ...STANDARD_COEFFS,
      contrast: 0.5,
      vibrance: 0.55,
      saturation: 0.3,
      clarity: 0.4,
      sharpen: 0.28,
      whiteGain: 0.1,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'cinematic',
    gradient: 'linear-gradient(135deg, #d98a3d, #14313a)',
    coeffs: {
      ...STANDARD_COEFFS,
      contrast: 0.6,
      rTemp: -0.05,
      bTemp: 0.02,
      gTint: -0.02,
      vibrance: 0.18,
      saturation: 0.02,
      vignette: 0.22,
      shadowLift: 0.2,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'noir',
    gradient: 'linear-gradient(135deg, #8a8f9c, #0a0a0d)',
    coeffs: {
      ...STANDARD_COEFFS,
      contrast: 0.75,
      vibrance: 0.02,
      saturation: -0.2,
      whiteGain: 0.1,
      blackOffset: -0.09,
      vignette: 0.32,
      clarity: 0.35,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'softGlow',
    gradient: 'linear-gradient(135deg, #ffd9c2, #6f5a7d)',
    coeffs: {
      ...STANDARD_COEFFS,
      contrast: 0.22,
      clarity: 0.1,
      sharpen: 0.06,
      shadowLift: 0.4,
      highlightRolloff: 0.55,
      vibrance: 0.2,
      saturation: 0.05,
      vignette: 0.08,
    },
    defaultNoiseReduction: true,
  },
  {
    id: 'highContrast',
    gradient: 'linear-gradient(135deg, #ffe14d, #1a0e2e)',
    coeffs: {
      ...STANDARD_COEFFS,
      contrast: 0.8,
      whiteGain: 0.14,
      blackOffset: -0.1,
      vibrance: 0.45,
      saturation: 0.2,
      clarity: 0.42,
      sharpen: 0.3,
      vignette: 0.18,
    },
    defaultNoiseReduction: true,
  },
];

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
  coeffs: NightscapeCoeffs,
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
  const exposureGain = 2 ** (coeffs.exposure * t);
  const contrast = coeffs.contrast * t;
  const whiteGain = 1 + coeffs.whiteGain * t;
  const blackOffset = coeffs.blackOffset * t;
  const rTemp = 1 + coeffs.rTemp * t;
  const bTemp = 1 + coeffs.bTemp * t;
  const gTint = 1 + coeffs.gTint * t;
  const vibranceAmt = coeffs.vibrance * t;
  const saturationAmt = coeffs.saturation * t;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = (data[o] / 255) * exposureGain;
    let g = (data[o + 1] / 255) * exposureGain;
    let b = (data[o + 2] / 255) * exposureGain;

    const y1 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (y1 > 0.7) {
      const hl = (y1 - 0.7) / 0.3;
      const factor = 1 - coeffs.highlightRolloff * t * hl * 0.6;
      r *= factor;
      g *= factor;
      b *= factor;
    } else if (y1 < 0.3) {
      const sh = (0.3 - y1) / 0.3;
      const lift = coeffs.shadowLift * t * sh * 0.5;
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
    const clarityAmt = coeffs.clarity * t; // clarity + texture 統合
    const sharpenAmt = coeffs.sharpen * t;
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
    const strength = coeffs.vignette * t;
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

const RESIZE_MAX_WIDTH = 1080;
const RESIZE_MAX_HEIGHT = 1350;

function processImage(
  sourceUrl: string,
  intensity: number,
  noiseReduction: boolean,
  coeffs: NightscapeCoeffs,
  resize: boolean,
): Promise<FilterResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = resize
        ? Math.min(1, RESIZE_MAX_WIDTH / img.naturalWidth, RESIZE_MAX_HEIGHT / img.naturalHeight)
        : 1;
      const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
      const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyNightscapeGrading(
        imageData.data,
        canvas.width,
        canvas.height,
        intensity / 100,
        noiseReduction,
        coeffs,
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
            width: canvas.width,
            height: canvas.height,
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
  coeffs: NightscapeCoeffs,
  resize: boolean,
): Promise<NightscapeImage> {
  const originalUrl = URL.createObjectURL(file);
  const result = await processImage(originalUrl, intensity, noiseReduction, coeffs, resize);
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    originalName: file.name,
    originalSize: file.size,
    originalUrl,
    ...result,
  };
}

function makeThumbnailSource(sourceUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = sourceUrl;
  });
}

interface NightscapeParamDef {
  key: keyof NightscapeCoeffs;
  label: ReactNode;
  min: number;
  max: number;
  step: number;
}

const NIGHTSCAPE_PARAM_DEFS: NightscapeParamDef[] = [
  {
    key: 'exposure',
    label: <Translate id="nightscape.param.exposure">露出</Translate>,
    min: -0.3,
    max: 0.8,
    step: 0.01,
  },
  {
    key: 'contrast',
    label: <Translate id="nightscape.param.contrast">コントラスト</Translate>,
    min: -0.3,
    max: 1,
    step: 0.01,
  },
  {
    key: 'whiteGain',
    label: <Translate id="nightscape.param.whiteGain">白レベル</Translate>,
    min: -0.2,
    max: 0.3,
    step: 0.01,
  },
  {
    key: 'blackOffset',
    label: <Translate id="nightscape.param.blackOffset">黒レベル</Translate>,
    min: -0.3,
    max: 0.2,
    step: 0.01,
  },
  {
    key: 'rTemp',
    label: <Translate id="nightscape.param.rTemp">赤チャンネル</Translate>,
    min: -0.2,
    max: 0.2,
    step: 0.005,
  },
  {
    key: 'bTemp',
    label: <Translate id="nightscape.param.bTemp">青チャンネル</Translate>,
    min: -0.2,
    max: 0.2,
    step: 0.005,
  },
  {
    key: 'gTint',
    label: <Translate id="nightscape.param.gTint">緑かぶり</Translate>,
    min: -0.15,
    max: 0.15,
    step: 0.005,
  },
  {
    key: 'vibrance',
    label: <Translate id="nightscape.param.vibrance">鮮やかさ</Translate>,
    min: -0.3,
    max: 0.8,
    step: 0.01,
  },
  {
    key: 'saturation',
    label: <Translate id="nightscape.param.saturation">彩度</Translate>,
    min: -0.4,
    max: 0.5,
    step: 0.01,
  },
  {
    key: 'clarity',
    label: <Translate id="nightscape.param.clarity">明瞭度</Translate>,
    min: -0.2,
    max: 0.6,
    step: 0.01,
  },
  {
    key: 'sharpen',
    label: <Translate id="nightscape.param.sharpen">シャープ</Translate>,
    min: -0.2,
    max: 0.4,
    step: 0.01,
  },
  {
    key: 'vignette',
    label: <Translate id="nightscape.param.vignette">周辺減光</Translate>,
    min: -0.3,
    max: 0.6,
    step: 0.01,
  },
  {
    key: 'highlightRolloff',
    label: <Translate id="nightscape.param.highlightRolloff">ハイライト圧縮</Translate>,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'shadowLift',
    label: <Translate id="nightscape.param.shadowLift">シャドウ持ち上げ</Translate>,
    min: 0,
    max: 0.8,
    step: 0.01,
  },
];

export default function NightscapeFilterPage(): ReactNode {
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [customCoeffs, setCustomCoeffs] = useState<NightscapeCoeffs>({...STANDARD_COEFFS});
  const [intensity, setIntensity] = useState(100);
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [resizeToPortrait, setResizeToPortrait] = useState(false);
  const [images, setImages] = useState<NightscapeImage[]>([]);
  const [presetPreviews, setPresetPreviews] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = NIGHTSCAPE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setNoiseReduction(preset.defaultNoiseReduction);
      setCustomCoeffs({...preset.coeffs});
    }
  };

  const updateParam = (key: keyof NightscapeCoeffs, value: number) => {
    setCustomCoeffs((prev) => ({...prev, [key]: value}));
  };

  const resetParams = () => {
    const preset = NIGHTSCAPE_PRESETS.find((p) => p.id === selectedPreset);
    setCustomCoeffs({...(preset?.coeffs ?? STANDARD_COEFFS)});
  };

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
          files.map((f) =>
            createNightscapeImage(f, intensity, noiseReduction, customCoeffs, resizeToPortrait),
          ),
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
    [intensity, noiseReduction, customCoeffs, resizeToPortrait],
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
              const result = await processImage(
                img.originalUrl,
                intensity,
                noiseReduction,
                customCoeffs,
                resizeToPortrait,
              );
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
  }, [intensity, noiseReduction, customCoeffs, resizeToPortrait]);

  const previewRequeryRef = useRef<number | null>(null);

  useEffect(() => {
    const firstUrl = images[0]?.originalUrl;
    if (!firstUrl) {
      setPresetPreviews((prev) => {
        Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }
    if (previewRequeryRef.current) window.clearTimeout(previewRequeryRef.current);
    previewRequeryRef.current = window.setTimeout(() => {
      (async () => {
        try {
          const thumbSource = await makeThumbnailSource(firstUrl, 200);
          const entries = await Promise.all(
            NIGHTSCAPE_PRESETS.map(async (preset) => {
              const result = await processImage(
                thumbSource,
                intensity,
                noiseReduction,
                preset.coeffs,
                false,
              );
              return [preset.id, result.filteredUrl] as const;
            }),
          );
          setPresetPreviews((prev) => {
            Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
            return Object.fromEntries(entries);
          });
        } catch {
          // プレビュー生成に失敗してもプレースホルダー表示にフォールバックする
        }
      })();
    }, 200);
    return () => {
      if (previewRequeryRef.current) window.clearTimeout(previewRequeryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images[0]?.originalUrl, intensity, noiseReduction]);

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

        {/* Big preview */}
        <div className={styles.bigPreviewSection}>
          {images[0] ? (
            <div className={styles.bigPreviewPair}>
              <div className={styles.bigPreviewCol}>
                <img
                  src={images[0].originalUrl}
                  alt={images[0].originalName}
                  className={styles.bigPreviewImg}
                />
                <span className={styles.compareLabel}>
                  <Translate id="nightscape.before">加工前</Translate>
                </span>
              </div>
              <div className={styles.bigPreviewCol}>
                <img
                  src={images[0].filteredUrl}
                  alt={images[0].originalName}
                  className={styles.bigPreviewImg}
                />
                <span className={styles.compareLabel}>
                  <Translate id="nightscape.after">加工後</Translate>
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.bigPreviewPlaceholder}>
              <Translate id="nightscape.bigPreviewPlaceholder">
                画像をアップロードすると、ここに大きいプレビューが表示される。
              </Translate>
            </div>
          )}
        </div>

        {/* Preset selector */}
        <div className={styles.presetSection}>
          <span className={styles.presetSectionLabel}>
            <Translate id="nightscape.presetLabel">プリセット</Translate>
          </span>
          <div className={styles.presetGrid}>
            {NIGHTSCAPE_PRESETS.map((preset) => {
              const previewUrl = presetPreviews[preset.id];
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.presetItem} ${
                    selectedPreset === preset.id ? styles.presetItemActive : ''
                  }`}
                  onClick={() => selectPreset(preset.id)}
                >
                  <span
                    className={styles.presetThumb}
                    style={
                      previewUrl
                        ? {backgroundImage: `url(${previewUrl})`}
                        : {backgroundImage: preset.gradient}
                    }
                  />
                  <span className={styles.presetLabel}>
                    {preset.id === 'standard' && (
                      <Translate id="nightscape.preset.standard">スタンダード</Translate>
                    )}
                    {preset.id === 'warmStreet' && (
                      <Translate id="nightscape.preset.warmStreet">ウォームストリート</Translate>
                    )}
                    {preset.id === 'coolBlue' && (
                      <Translate id="nightscape.preset.coolBlue">クールブルー</Translate>
                    )}
                    {preset.id === 'neon' && (
                      <Translate id="nightscape.preset.neon">ネオン</Translate>
                    )}
                    {preset.id === 'cinematic' && (
                      <Translate id="nightscape.preset.cinematic">シネマティック</Translate>
                    )}
                    {preset.id === 'noir' && (
                      <Translate id="nightscape.preset.noir">ノワール</Translate>
                    )}
                    {preset.id === 'softGlow' && (
                      <Translate id="nightscape.preset.softGlow">ソフトグロー</Translate>
                    )}
                    {preset.id === 'highContrast' && (
                      <Translate id="nightscape.preset.highContrast">ハイコントラスト</Translate>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={resizeToPortrait}
              onChange={(e) => setResizeToPortrait(e.target.checked)}
            />
            <span>
              <Translate id="nightscape.resizeToPortrait">1080 x 1350 に縮小</Translate>
            </span>
          </label>
        </div>

        {/* Manual parameter adjustment */}
        <details className={styles.details}>
          <summary className={styles.detailsSummary}>
            <Translate id="nightscape.paramSummary">詳細設定 (手動調整)</Translate>
          </summary>
          <div className={styles.paramPanel}>
            <button type="button" className={styles.actionBtnGhost} onClick={resetParams}>
              <Translate id="nightscape.paramReset">プリセットの値に戻す</Translate>
            </button>
            <div className={styles.paramGrid}>
              {NIGHTSCAPE_PARAM_DEFS.map((def) => (
                <div key={def.key} className={styles.qualityRow}>
                  <span className={styles.qualityLabel}>{def.label}</span>
                  <input
                    type="range"
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={customCoeffs[def.key]}
                    onChange={(e) => updateParam(def.key, Number(e.target.value))}
                    className={styles.qualitySlider}
                  />
                  <span className={styles.qualityValue}>{customCoeffs[def.key].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </details>

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
