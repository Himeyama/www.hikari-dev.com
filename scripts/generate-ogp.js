/**
 * タグ・タイトル付き OGP 画像を生成する Node.js スクリプト。
 * satori (SVG生成) + @resvg/resvg-js (PNG変換) を使用。
 * フォント: NotoSansJP を初回実行時に jsDelivr CDN からダウンロードしてキャッシュ。
 * 実行: node scripts/generate-ogp.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { Resvg } = require('@resvg/resvg-js');

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

const W = 1200, H = 630;
const ROOT = path.resolve(__dirname, '..');
const OGP_DIR = path.join(ROOT, 'static', 'img', 'ogp');
const FONTS_DIR = path.join(__dirname, 'fonts');
const BLOG_DIRS = [
  { dir: path.join(ROOT, 'blog'), prefix: '/img/ogp' },
  { dir: path.join(ROOT, 'i18n', 'en', 'docusaurus-plugin-content-blog'), prefix: '/img/ogp' },
];

// satori の opentype.js は woff2 非対応のため woff (@fontsource v4) を使用
// フォント名を分けて CSS font stack で fallback させる
const FONT_FILES = [
  {
    name: 'NotoSansJP-ja',
    file: 'noto-sans-jp-japanese-700-normal.woff',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@4/files/noto-sans-jp-japanese-700-normal.woff',
  },
  {
    name: 'NotoSansJP-latin',
    file: 'noto-sans-jp-latin-700-normal.woff',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@4/files/noto-sans-jp-latin-700-normal.woff',
  },
];

function hexColor([r, g, b]) {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function getColors(tags) {
  for (const tag of tags) {
    const key = Object.keys(TAG_COLORS).find(k => k.toLowerCase() === tag.toLowerCase());
    if (key) return TAG_COLORS[key];
  }
  return TAG_COLORS.default;
}

function slugFromFile(filename) {
  return path.basename(filename, path.extname(filename));
}

async function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function loadFonts() {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  const fonts = [];
  for (const { name, file, url } of FONT_FILES) {
    const fontPath = path.join(FONTS_DIR, file);
    let data;
    if (fs.existsSync(fontPath)) {
      data = fs.readFileSync(fontPath);
    } else {
      console.log(`Downloading ${file}...`);
      data = await fetchBuffer(url);
      fs.writeFileSync(fontPath, data);
      console.log(`  Saved (${(data.length / 1024).toFixed(0)} KB)`);
    }
    fonts.push({ name, data, weight: 700, style: 'normal' });
  }
  return fonts;
}

function makeOGPElement(title, tags) {
  const [top, bottom] = getColors(tags);
  const fontSize = title.length > 40 ? 48 : title.length > 25 ? 56 : 64;

  const tagBadges = tags.slice(0, 4).map(tag => ({
    type: 'div',
    props: {
      style: {
        background: 'rgba(255,255,255,0.22)',
        borderRadius: 100,
        padding: '6px 20px',
        color: 'rgba(255,255,255,0.9)',
        fontSize: 24,
        fontWeight: 700,
      },
      children: tag,
    },
  }));

  return {
    type: 'div',
    props: {
      style: {
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px 80px',
        background: `linear-gradient(150deg, ${hexColor(top)} 0%, ${hexColor(bottom)} 100%)`,
        fontFamily: "'NotoSansJP-ja', 'NotoSansJP-latin'",
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.5,
              marginBottom: tags.length ? 28 : 0,
            },
            children: title,
          },
        },
        ...(tags.length > 0
          ? [{
              type: 'div',
              props: {
                style: { display: 'flex', gap: 12, flexWrap: 'wrap' },
                children: tagBadges,
              },
            }]
          : []),
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 48,
              right: 80,
              color: 'rgba(255,255,255,0.55)',
              fontSize: 22,
              fontWeight: 700,
            },
            children: 'hikari.dev',
          },
        },
      ],
    },
  };
}

async function main() {
  const { default: satori } = await import('satori');
  fs.mkdirSync(OGP_DIR, { recursive: true });
  const fonts = await loadFonts();

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

      const slug = slugFromFile(file);
      const autoImgPath = `${prefix}/${slug}.png`;
      const fm = fmMatch[1];

      // カスタム画像が設定されている場合はスキップ
      if (fm.includes('image:') && !fm.includes(`image: ${autoImgPath}`)) continue;

      const titleMatch = fm.match(/^title:\s*(.+)$/m);
      const title = titleMatch
        ? titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
        : slug;

      const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
      const tags = tagsMatch
        ? tagsMatch[1].split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
        : [];

      if (!processed.has(slug)) {
        const el = makeOGPElement(title, tags);
        const svg = await satori(el, { width: W, height: H, fonts });
        const resvg = new Resvg(svg);
        const png = Buffer.from(resvg.render().asPng());
        fs.writeFileSync(path.join(OGP_DIR, `${slug}.png`), png);
        processed.add(slug);
        console.log(`GEN [${tags[0] || 'default'}] ${slug}.png`);
      }

      if (!fm.includes('image:')) {
        const eol = content.includes('\r\n') ? '\r\n' : '\n';
        const newContent = content.replace(
          /^(---\r?\n[\s\S]*?\r?\n)(---)/,
          (_, body, end) => body + `image: ${autoImgPath}` + eol + end
        );
        fs.writeFileSync(filePath, newContent, 'utf8');
        added++;
        console.log(`ADD frontmatter: ${file}`);
      }
    }
  }

  console.log(`\nDone. Images: ${processed.size}, Frontmatter updated: ${added}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
