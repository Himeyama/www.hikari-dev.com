/**
 * タグベースのグラデーション OGP 画像を生成する Node.js スクリプト。
 * 外部ライブラリ不要（zlib のみ使用）。
 * 実行: node scripts/generate-ogp.js
 */
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// タグ別グラデーション色 [topRGB, bottomRGB]
const TAG_COLORS = {
  Python:     [[48, 105, 152],  [255, 212, 59]],
  Linux:      [[44, 62, 80],    [127, 140, 141]],
  AWS:        [[255, 153, 0],   [232, 93, 4]],
  Docker:     [[13, 183, 237],  [56, 77, 84]],
  Ruby:       [[204, 52, 45],   [139, 0, 0]],
  JavaScript: [[247, 223, 30],  [240, 219, 79]],
  Windows:    [[0, 120, 215],   [0, 81, 158]],
  Git:        [[240, 80, 50],   [192, 57, 43]],
  Arduino:    [[0, 151, 157],   [0, 92, 95]],
  Unity:      [[34, 34, 34],    [80, 80, 80]],
  PCB:        [[34, 85, 34],    [17, 51, 17]],
  C:          [[90, 120, 200],  [50, 70, 140]],
  Rust:       [[183, 65, 14],   [130, 40, 10]],
  SSH:        [[50, 50, 80],    [100, 100, 160]],
  Hardware:   [[80, 60, 120],   [50, 30, 90]],
  default:    [[46, 134, 171],  [26, 82, 118]],
};

// CRC32 テーブル
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crcVal]);
}

/**
 * グラデーション PNG を生成して Buffer を返す。
 * 上部が [r1,g1,b1]、下部が [r2,g2,b2] の縦グラデーション。
 */
function generateGradientPNG(width, height, [r1, g1, b1], [r2, g2, b2]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 2; // RGB
  // ihdr[10-12] = 0 (compression, filter, interlace)

  // ピクセルデータ: 各行先頭にフィルタバイト(0)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const t = height > 1 ? y / (height - 1) : 0;
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: None
    const r = Math.round(r1 * (1 - t) + r2 * t);
    const g = Math.round(g1 * (1 - t) + g2 * t);
    const b = Math.round(b1 * (1 - t) + b2 * t);
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3]     = r;
      raw[row + 1 + x * 3 + 1] = g;
      raw[row + 1 + x * 3 + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw, {level: 9});

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** タグリストから使用する色を決定 */
function getColors(tags) {
  for (const tag of tags) {
    const key = Object.keys(TAG_COLORS).find(
      k => k.toLowerCase() === tag.toLowerCase()
    );
    if (key) return TAG_COLORS[key];
  }
  return TAG_COLORS.default;
}

/** ファイル名からスラグを取得 (例: 2021-03-10-pcb.md → pcb) */
function slugFromFile(filename) {
  return path.basename(filename, path.extname(filename));
}

const W = 1200, H = 630;
const ROOT = path.resolve(__dirname, '..');
const OGP_DIR = path.join(ROOT, 'static', 'img', 'ogp');
const BLOG_DIRS = [
  { dir: path.join(ROOT, 'blog'), prefix: '/img/ogp' },
  { dir: path.join(ROOT, 'i18n', 'en', 'docusaurus-plugin-content-blog'), prefix: '/img/ogp' },
];

// 処理済みスラグ（JA/EN 共通画像を共有するため）
const processed = new Set();
let added = 0;

for (const { dir, prefix } of BLOG_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;
    if (fmMatch[1].includes('image:')) continue;

    // tags 抽出
    const tagsMatch = fmMatch[1].match(/^tags:\s*\[([^\]]*)\]/m);
    const tags = tagsMatch
      ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const slug = slugFromFile(file);
    const imgPath = `${prefix}/${slug}.png`;
    const outFile = path.join(OGP_DIR, `${slug}.png`);

    // 画像がまだなければ生成（JA/EN で共有）
    if (!processed.has(slug)) {
      const colors = getColors(tags);
      const png = generateGradientPNG(W, H, colors[0], colors[1]);
      fs.writeFileSync(outFile, png);
      processed.add(slug);
    }

    // frontmatter に image: を追記
    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const newContent = content.replace(
      /^(---\r?\n[\s\S]*?\r?\n)(---)/,
      (_, body, end) => body + `image: ${imgPath}` + eol + end
    );
    fs.writeFileSync(filePath, newContent, 'utf8');
    added++;
    console.log(`ADD [${tags[0] || 'default'}] ${file} -> ${imgPath}`);
  }
}

console.log(`\nDone. Images: ${processed.size}, Frontmatter updated: ${added}`);
