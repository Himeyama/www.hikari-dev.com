import type {ReactNode} from 'react';
import {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './password-generator.module.css';

const WORDS = [
  'apple', 'arrow', 'ash', 'autumn', 'bacon', 'badge', 'bakery', 'balloon', 'bamboo', 'banana',
  'barn', 'basket', 'beach', 'bean', 'bear', 'beetle', 'bell', 'berry', 'bicycle', 'bird',
  'biscuit', 'blanket', 'blossom', 'boat', 'bone', 'book', 'boot', 'bottle', 'bowl', 'branch',
  'bread', 'breeze', 'brick', 'bridge', 'brook', 'brush', 'bubble', 'bucket', 'bug', 'cabin',
  'cactus', 'cake', 'camera', 'candle', 'candy', 'canoe', 'canyon', 'cape', 'captain', 'cargo',
  'carpet', 'carrot', 'castle', 'cave', 'cedar', 'chair', 'chalk', 'cheese', 'cherry', 'chess',
  'chestnut', 'chicken', 'chimney', 'chocolate', 'cider', 'cinnamon', 'circle', 'cliff', 'cloak', 'cloud',
  'clover', 'coast', 'cobweb', 'cocoa', 'coconut', 'coffee', 'comet', 'compass', 'cookie', 'copper',
  'coral', 'cotton', 'cottage', 'cougar', 'cove', 'coyote', 'cracker', 'crane', 'crater', 'cream',
  'creek', 'crescent', 'cricket', 'crown', 'crystal', 'cucumber', 'cup', 'cupcake', 'current', 'cypress',
  'daisy', 'dawn', 'deer', 'delta', 'desert', 'diamond', 'dolphin', 'dragon', 'drum', 'duck',
  'dune', 'eagle', 'ember', 'emerald', 'engine', 'falcon', 'feather', 'fern', 'ferry', 'field',
  'finch', 'fireplace', 'firefly', 'fish', 'flame', 'flamingo', 'flask', 'flint', 'flower', 'fog',
  'forest', 'fountain', 'fox', 'frost', 'garden', 'gate', 'geyser', 'ginger', 'glacier', 'glade',
  'glass', 'gold', 'goose', 'granite', 'grape', 'grove', 'guitar', 'gull', 'harbor', 'hare',
  'harp', 'hawk', 'hazel', 'heather', 'hedge', 'herb', 'hill', 'holly', 'honey', 'horizon',
  'hut', 'ice', 'iris', 'island', 'ivory', 'ivy', 'jade', 'jasmine', 'jelly', 'jewel',
  'journey', 'jungle', 'kettle', 'kite', 'kitten', 'koala', 'lagoon', 'lake', 'lamp', 'lantern',
  'lark', 'laurel', 'lavender', 'leaf', 'lemon', 'lentil', 'lettuce', 'lighthouse', 'lily', 'lime',
  'lion', 'lizard', 'llama', 'lobster', 'locket', 'log', 'lotus', 'lumber', 'lynx', 'magnet',
  'magnolia', 'mango', 'manor', 'maple', 'marble', 'marsh', 'meadow', 'melody', 'melon', 'mint',
  'mirror', 'mist', 'mitten', 'mole', 'monarch', 'moon', 'moose', 'moss', 'mountain', 'mouse',
  'mug', 'mushroom', 'nectar', 'needle', 'nest', 'noodle', 'north', 'nut', 'oak', 'oasis',
  'ocean', 'olive', 'onion', 'opal', 'orange', 'orchard', 'orchid', 'osprey', 'otter', 'owl',
  'oyster', 'paddle', 'palm', 'panda', 'pansy', 'panther', 'paper', 'parrot', 'pasture', 'peach',
  'peacock', 'peak', 'pear', 'pebble', 'pecan', 'pelican', 'penguin', 'pepper', 'petal', 'pheasant',
  'pickle', 'pigeon', 'pillow', 'pine', 'pineapple', 'plum', 'pond', 'poppy', 'potato', 'prairie',
  'pretzel', 'pumpkin', 'puppy', 'quail', 'quartz', 'quilt', 'rabbit', 'raccoon', 'radish', 'rain',
  'rainbow', 'raisin', 'raven', 'reed', 'reef', 'ribbon', 'ridge', 'river', 'robin', 'rock',
  'rocket', 'rose', 'rosemary', 'saddle', 'saffron', 'sage', 'salmon', 'sand', 'sapphire', 'sardine',
  'satin', 'savanna', 'scallop', 'scarf', 'sequoia', 'shadow', 'shamrock', 'shell', 'shore', 'shrimp',
  'silver', 'skylark', 'sleet', 'sloth', 'snail', 'snow', 'sorrel', 'sparrow', 'spice', 'sponge',
  'spring', 'spruce', 'squirrel', 'starfish', 'stem', 'stone', 'storm', 'strawberry', 'stream', 'sugar',
  'summer', 'sunflower', 'sunset', 'swallow', 'swan', 'sycamore', 'tangerine', 'teapot', 'terrace', 'thicket',
  'thistle', 'thunder', 'thyme', 'tide', 'tiger', 'timber', 'toast', 'tomato', 'topaz', 'tortoise',
  'trail', 'treasure', 'trout', 'tulip', 'tundra', 'turtle', 'umbrella', 'urchin', 'valley', 'vanilla',
  'velvet', 'vine', 'violet', 'volcano', 'walnut', 'walrus', 'waterfall', 'wave', 'whale', 'wheat',
  'whisper', 'willow', 'wind', 'wolf', 'woodland', 'wren', 'yak', 'yarn', 'zebra', 'zephyr',
];

const PREFECTURES = [
  'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima', 'ibaraki', 'tochigi', 'gunma',
  'saitama', 'chiba', 'tokyo', 'kanagawa', 'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano',
  'gifu', 'shizuoka', 'aichi', 'mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
  'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi', 'tokushima', 'kagawa', 'ehime', 'kochi', 'fukuoka',
  'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa',
];

const JAPANESE_WORDS = [
  ...PREFECTURES,
  'sakura', 'fuji', 'kotori', 'tsuki', 'hoshi', 'umi', 'yama', 'kawa', 'mori', 'sora',
  'kaze', 'yuki', 'ame', 'kumo', 'taiyo', 'niji', 'shima', 'izumi', 'taki', 'mizu',
  'sushi', 'tempura', 'ramen', 'udon', 'soba', 'mochi', 'dango', 'matcha', 'sencha', 'umeboshi',
  'natto', 'miso', 'shoyu', 'tofu', 'wasabi', 'yuzu', 'momo', 'ringo', 'budo', 'nashi',
  'kaki', 'ichigo', 'mikan', 'suika', 'kuri', 'gohan', 'neko', 'inu', 'tori', 'usagi',
  'kitsune', 'tanuki', 'shika', 'kuma', 'saru', 'same', 'kujira', 'tako', 'ika', 'kani',
  'ebi', 'tsuru', 'kame', 'hebi', 'ryu', 'matsu', 'take', 'ume', 'tsubaki', 'ajisai',
  'kiku', 'ran', 'aka', 'ao', 'kiiro', 'midori', 'murasaki', 'shiro', 'kuro', 'chairo',
  'hanabi', 'matsuri', 'origami', 'kimono', 'obi', 'katana', 'tatami', 'shoji', 'furin', 'kotatsu',
  'chochin', 'yamabiko', 'shizuku', 'asa', 'yoru', 'haru', 'natsu', 'aki', 'fuyu', 'tsuyu',
  'asahi', 'yuhi', 'hotaru', 'semi', 'tombo', 'chou', 'suzume', 'tsubame', 'washi', 'wasei',
  'onsen', 'fune', 'hashi', 'niwa', 'ike', 'oka', 'tani', 'iwa', 'sango', 'shinju',
];

const SYMBOLS = '!?#%&*+=';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOL_SET = '!@#$%^&*()-_=+';

function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const arr = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(arr);
    value = arr[0];
  } while (value >= limit);
  return value % max;
}

function pick<T>(items: T[]): T {
  return items[randomInt(items.length)];
}

function randomDigits(length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += pick(DIGITS.split(''));
  return s;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Separator = '-' | ' ' | '';

function generatePassphrase(
  wordList: string[],
  wordCount: number,
  separator: Separator,
  addNumber: boolean,
  addSymbol: boolean,
): string {
  const capitalize = separator === '';
  const words = Array.from({length: wordCount}, () => pick(wordList)).map((w) =>
    capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w,
  );
  const parts = [...words];
  if (addNumber) parts.push(randomDigits(2 + randomInt(3)));
  if (addSymbol) parts.push(pick(SYMBOLS.split('')));
  return parts.join(separator);
}

function generateRandomPassword(
  length: number,
  useUpper: boolean,
  useLower: boolean,
  useDigits: boolean,
  useSymbols: boolean,
): string {
  const groups: string[] = [];
  if (useUpper) groups.push(UPPER);
  if (useLower) groups.push(LOWER);
  if (useDigits) groups.push(DIGITS);
  if (useSymbols) groups.push(SYMBOL_SET);
  if (groups.length === 0) groups.push(LOWER);

  const pool = groups.join('');
  const required = groups.map((g) => pick(g.split('')));
  const rest = Array.from({length: Math.max(length - required.length, 0)}, () =>
    pick(pool.split('')),
  );
  return shuffle([...required, ...rest]).slice(0, length).join('');
}

function entropyBits(combinations: number, count: number): number {
  return Math.round(count * Math.log2(combinations));
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

type Mode = 'passphrase' | 'random';
type WordLanguage = 'en' | 'ja';

export default function PasswordGeneratorPage(): ReactNode {
  const [mode, setMode] = useState<Mode>('passphrase');
  const [copied, setCopied] = useState(false);

  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState<Separator>('-');
  const [addNumber, setAddNumber] = useState(true);
  const [addSymbol, setAddSymbol] = useState(true);
  const [wordLanguage, setWordLanguage] = useState<WordLanguage>('en');
  const wordList = wordLanguage === 'ja' ? JAPANESE_WORDS : WORDS;

  const [length, setLength] = useState(20);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  const [password, setPassword] = useState('');

  const generate = () => {
    if (mode === 'passphrase') {
      setPassword(generatePassphrase(wordList, wordCount, separator, addNumber, addSymbol));
    } else {
      setPassword(generateRandomPassword(length, useUpper, useLower, useDigits, useSymbols));
    }
    setCopied(false);
  };

  const displayed = password || (mode === 'passphrase'
    ? generatePassphrase(wordList, wordCount, separator, addNumber, addSymbol)
    : generateRandomPassword(length, useUpper, useLower, useDigits, useSymbols));

  const bits = useMemo(() => {
    if (mode === 'passphrase') {
      let b = entropyBits(wordList.length, wordCount);
      if (addNumber) b += entropyBits(10, 3);
      if (addSymbol) b += entropyBits(SYMBOLS.length, 1);
      return b;
    }
    const poolSize =
      (useUpper ? UPPER.length : 0) +
      (useLower ? LOWER.length : 0) +
      (useDigits ? DIGITS.length : 0) +
      (useSymbols ? SYMBOL_SET.length : 0) || LOWER.length;
    return entropyBits(poolSize, length);
  }, [mode, wordList, wordCount, separator, addNumber, addSymbol, length, useUpper, useLower, useDigits, useSymbols]);

  const copy = async () => {
    const success = await copyToClipboard(displayed);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Layout
      title={translate({id: 'passwordGenerator.title', message: 'パスワード ジェネレーター'})}
      description={translate({
        id: 'passwordGenerator.description',
        message: '安全なパスフレーズやパスワードを生成するツール。ブラウザ内で処理されるためサーバーに送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="passwordGenerator.title">パスワード ジェネレーター</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="passwordGenerator.subtitle">
            安全なパスフレーズやパスワードを生成する。
          </Translate>
        </p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${mode === 'passphrase' ? styles.tabBtnActive : ''}`}
            onClick={() => setMode('passphrase')}
          >
            <Translate id="passwordGenerator.tabPassphrase">パスフレーズ (推奨)</Translate>
          </button>
          <button
            className={`${styles.tabBtn} ${mode === 'random' ? styles.tabBtnActive : ''}`}
            onClick={() => setMode('random')}
          >
            <Translate id="passwordGenerator.tabRandom">ランダム文字列</Translate>
          </button>
        </div>

        <div className={styles.card}>
          <code className={styles.passwordText}>{displayed}</code>
          <p className={styles.entropyText}>
            <Translate id="passwordGenerator.entropy">推定エントロピー</Translate>: 約 {bits} bit
          </p>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={generate}>
              <Translate id="passwordGenerator.generate">生成</Translate>
            </button>
            <button className={styles.actionBtnGhost} onClick={copy}>
              {copied ? (
                <Translate id="passwordGenerator.copied">コピーしました</Translate>
              ) : (
                <Translate id="passwordGenerator.copy">コピー</Translate>
              )}
            </button>
          </div>
        </div>

        {mode === 'passphrase' ? (
          <div className={styles.options}>
            <label className={styles.optionRow}>
              <span>
                <Translate id="passwordGenerator.wordLanguage">単語の言語</Translate>
              </span>
              <select
                className={styles.select}
                value={wordLanguage}
                onChange={(e) => setWordLanguage(e.target.value as WordLanguage)}
              >
                <option value="en">
                  {translate({id: 'passwordGenerator.wordLanguageEn', message: '英語'})}
                </option>
                <option value="ja">
                  {translate({id: 'passwordGenerator.wordLanguageJa', message: '日本語 (ローマ字)'})}
                </option>
              </select>
            </label>
            <label className={styles.optionRow}>
              <span>
                <Translate id="passwordGenerator.wordCount">単語数</Translate>: {wordCount}
              </span>
              <input
                type="range"
                min={4}
                max={8}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
              />
            </label>
            <label className={styles.optionRow}>
              <span>
                <Translate id="passwordGenerator.separator">区切り文字</Translate>
              </span>
              <select
                className={styles.select}
                value={separator}
                onChange={(e) => setSeparator(e.target.value as Separator)}
              >
                <option value="-">-</option>
                <option value=" ">
                  {translate({id: 'passwordGenerator.separatorSpace', message: '半角スペース'})}
                </option>
                <option value="">
                  {translate({id: 'passwordGenerator.separatorNone', message: 'なし (先頭大文字)'})}
                </option>
              </select>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={addNumber}
                onChange={(e) => setAddNumber(e.target.checked)}
              />
              <Translate id="passwordGenerator.addNumber">数字を追加する</Translate>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={addSymbol}
                onChange={(e) => setAddSymbol(e.target.checked)}
              />
              <Translate id="passwordGenerator.addSymbol">記号を追加する</Translate>
            </label>
          </div>
        ) : (
          <div className={styles.options}>
            <label className={styles.optionRow}>
              <span>
                <Translate id="passwordGenerator.length">文字数</Translate>: {length}
              </span>
              <input
                type="range"
                min={15}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
              />
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={useUpper}
                onChange={(e) => setUseUpper(e.target.checked)}
              />
              <Translate id="passwordGenerator.upper">大文字 (A-Z)</Translate>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={useLower}
                onChange={(e) => setUseLower(e.target.checked)}
              />
              <Translate id="passwordGenerator.lower">小文字 (a-z)</Translate>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={useDigits}
                onChange={(e) => setUseDigits(e.target.checked)}
              />
              <Translate id="passwordGenerator.digits">数字 (0-9)</Translate>
            </label>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={useSymbols}
                onChange={(e) => setUseSymbols(e.target.checked)}
              />
              <Translate id="passwordGenerator.symbols">記号 (!@#$ など)</Translate>
            </label>
          </div>
        )}

        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="passwordGenerator.tipsTitle">パスワードのポイント</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="passwordGenerator.tip1">
                15 文字以上を目安にする。20 文字以上ならさらに安心。
              </Translate>
            </li>
            <li>
              <Translate id="passwordGenerator.tip2">
                短くて複雑なパスワードより、長いパスフレーズのほうが強力。
              </Translate>
            </li>
            <li>
              <Translate id="passwordGenerator.tip3">
                サービスごとに完全に別のパスワードを使う。1 つ漏えいすると、使い回している他のサービスまで突破される可能性がある。
              </Translate>
            </li>
            <li>
              <Translate id="passwordGenerator.tip4">
                無関係な単語をいくつか組み合わせると、覚えやすく長いパスフレーズにできる。
              </Translate>
            </li>
            <li>
              <Translate id="passwordGenerator.tip5">
                生成した文字列はブラウザ内でのみ処理され、サーバーには送信されない。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
