import type {ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './vram-calculator.module.css';

type QuantPreset = {
  id: string;
  label: string;
  bits: number;
};

const QUANT_PRESETS: QuantPreset[] = [
  {id: 'f32', label: 'F32', bits: 32},
  {id: 'f16', label: 'F16 / BF16', bits: 16},
  {id: 'q8_0', label: 'Q8_0', bits: 8.5},
  {id: 'q6_k', label: 'Q6_K', bits: 6.56},
  {id: 'q5_k_m', label: 'Q5_K_M', bits: 5.69},
  {id: 'q5_k_s', label: 'Q5_K_S', bits: 5.54},
  {id: 'q4_k_m', label: 'Q4_K_M', bits: 4.85},
  {id: 'q4_k_s', label: 'Q4_K_S', bits: 4.58},
  {id: 'q3_k_m', label: 'Q3_K_M', bits: 3.91},
  {id: 'q3_k_s', label: 'Q3_K_S', bits: 3.5},
  {id: 'q2_k', label: 'Q2_K', bits: 3.35},
  {id: 'custom', label: '', bits: 4},
];

const GIB = 1024 ** 3;

const GENERAL_FORMULA = String.raw`V_{\text{VRAM}} = \frac{N \times b_w}{8 \times 1024^{3}} \times \left(1 + \frac{r}{100}\right) \quad \text{[GiB]}`;

function buildSubstitutedFormula(paramsB: number, bits: number, overhead: number, resultGiB: number): string {
  return String.raw`V_{\text{VRAM}} = \frac{${paramsB} \times 10^{9} \times ${bits}}{8 \times 1024^{3}} \times \left(1 + \frac{${overhead}}{100}\right) \approx ${resultGiB.toFixed(2)}\ \text{GiB}`;
}

function VramFormula({tex}: {tex: string}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(tex, el, {throwOnError: true, displayMode: true});
    } catch (e) {
      el.textContent = e instanceof Error ? e.message : String(e);
    }
  }, [tex]);

  return <div ref={ref} className={styles.formulaBlock} />;
}

function VramCalculator(): ReactNode {
  const [paramsB, setParamsB] = useState(9);
  const [presetId, setPresetId] = useState('q3_k_m');
  const [bits, setBits] = useState(3.91);
  const [overhead, setOverhead] = useState(10);

  const onPresetChange = (id: string) => {
    setPresetId(id);
    const preset = QUANT_PRESETS.find((p) => p.id === id);
    if (preset && preset.id !== 'custom') {
      setBits(preset.bits);
    }
  };

  const onBitsChange = (value: number) => {
    setBits(value);
    setPresetId('custom');
  };

  const {baseGiB, totalGiB, totalGB} = useMemo(() => {
    const n = Math.max(paramsB, 0) * 1e9;
    const b = Math.max(bits, 0);
    const r = Math.max(overhead, 0);
    const bytes = (n * b) / 8;
    const base = bytes / GIB;
    const total = base * (1 + r / 100);
    return {
      baseGiB: base,
      totalGiB: total,
      totalGB: (bytes * (1 + r / 100)) / 1e9,
    };
  }, [paramsB, bits, overhead]);

  const substitutedTex = useMemo(
    () => buildSubstitutedFormula(paramsB, bits, overhead, totalGiB),
    [paramsB, bits, overhead, totalGiB],
  );

  return (
    <>
      <div className={styles.form}>
        <label className={styles.optionRow}>
          <span>
            <Translate id="vramCalculator.params">パラメータ数 (B)</Translate>
          </span>
          <input
            className={styles.numberInput}
            type="number"
            min={0.1}
            step={0.1}
            value={paramsB}
            onChange={(e) => setParamsB(Number(e.target.value))}
          />
        </label>

        <label className={styles.optionRow}>
          <span>
            <Translate id="vramCalculator.quant">量子化</Translate>
          </span>
          <select
            className={styles.select}
            value={presetId}
            onChange={(e) => onPresetChange(e.target.value)}
          >
            {QUANT_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">
              {translate({id: 'vramCalculator.quantCustom', message: 'カスタム'})}
            </option>
          </select>
        </label>

        <label className={styles.optionRow}>
          <span>
            <Translate id="vramCalculator.bits">ビット数 / 重み (bits/weight)</Translate>
          </span>
          <input
            className={styles.numberInput}
            type="number"
            min={1}
            max={32}
            step={0.01}
            value={bits}
            onChange={(e) => onBitsChange(Number(e.target.value))}
          />
        </label>

        <label className={styles.optionRow}>
          <span>
            <Translate id="vramCalculator.overhead">実行時オーバーヘッド (%)</Translate>
          </span>
          <input
            className={styles.numberInput}
            type="number"
            min={0}
            step={1}
            value={overhead}
            onChange={(e) => setOverhead(Number(e.target.value))}
          />
        </label>
      </div>

      <div className={styles.resultCard}>
        <span className={styles.resultLabel}>
          <Translate id="vramCalculator.resultLabel">推定 VRAM 使用量</Translate>
        </span>
        <span className={styles.resultValue}>{totalGiB.toFixed(2)} GiB</span>
        <span className={styles.resultSub}>
          <Translate
            id="vramCalculator.resultSub"
            values={{gb: totalGB.toFixed(2), base: baseGiB.toFixed(2)}}
          >
            {'(≈ {gb} GB、モデル重みのみ: {base} GiB)'}
          </Translate>
        </span>
      </div>

      <div className={styles.formulaSection}>
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="vramCalculator.formulaTitle">計算式</Translate>
        </Heading>
        <div className={styles.formulaCard}>
          <VramFormula tex={GENERAL_FORMULA} />
          <VramFormula tex={substitutedTex} />
        </div>
        <ul className={styles.legend}>
          <li>
            <Translate id="vramCalculator.legendN">N: パラメータ数 (例: 9B なら 9 × 10⁹)</Translate>
          </li>
          <li>
            <Translate id="vramCalculator.legendBw">
              b_w: 1 パラメータあたりのビット数 (量子化方式によって決まる、K-quant のスケール値分のオーバーヘッドを含む)
            </Translate>
          </li>
          <li>
            <Translate id="vramCalculator.legendR">
              r: 実行時オーバーヘッド率 (%) (KV キャッシュ・アクティベーション・CUDA コンテキストなど、モデル重み以外に必要な分)
            </Translate>
          </li>
        </ul>
      </div>
    </>
  );
}

export default function VramCalculatorPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'vramCalculator.title', message: 'LLM VRAM 使用量計算'})}
      description={translate({
        id: 'vramCalculator.description',
        message:
          'LLM のパラメータ数と量子化方式から必要な VRAM 容量を概算するツール。ブラウザ内で処理されるためサーバーに送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="vramCalculator.title">LLM VRAM 使用量計算</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="vramCalculator.subtitle">
            パラメータ数と量子化方式を指定すると、推論に必要な VRAM 容量の目安を計算する。
          </Translate>
        </p>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading...</div>}>
          {() => <VramCalculator />}
        </BrowserOnly>

        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="vramCalculator.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="vramCalculator.note1">
                計算結果はモデルの重み容量を基にした概算値であり、実際の VRAM 使用量とは異なる場合がある。
              </Translate>
            </li>
            <li>
              <Translate id="vramCalculator.note2">
                ビット数 / 重みは量子化方式のプリセットから選べるほか、既知の GGUF ファイルサイズなどに合わせて手動で調整できる。
              </Translate>
            </li>
            <li>
              <Translate id="vramCalculator.note3">
                長いコンテキストで推論する場合、KV キャッシュの消費が大きくなるため実行時オーバーヘッドを高めに設定する。
              </Translate>
            </li>
            <li>
              <Translate id="vramCalculator.note4">
                計算はすべてブラウザ内で完結し、入力内容がサーバーに送信されることはない。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
