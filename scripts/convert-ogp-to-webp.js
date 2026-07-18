/**
 * 既存の OGP 画像 (static/img/ogp/*.png) を WebP (品質 80) に一括変換する。
 * 変換後、blog/ および i18n/ 配下の記事フロントマターの `image:` 参照を
 * `.png` -> `.webp` に更新し、元の PNG を削除する。
 * 実行: node scripts/convert-ogp-to-webp.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OGP_DIR = path.join(ROOT, 'static', 'img', 'ogp');
const QUALITY = 80;

const CONTENT_DIRS = [
  path.join(ROOT, 'blog'),
  path.join(ROOT, 'i18n', 'en', 'docusaurus-plugin-content-blog'),
  path.join(ROOT, 'i18n', 'zh-TW', 'docusaurus-plugin-content-blog'),
];

function updateReferences(pngRelPath, webpRelPath) {
  let updated = 0;
  for (const dir of CONTENT_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(pngRelPath)) continue;
      const newContent = content.split(pngRelPath).join(webpRelPath);
      fs.writeFileSync(filePath, newContent, 'utf8');
      updated++;
    }
  }
  return updated;
}

async function main() {
  const files = fs.readdirSync(OGP_DIR).filter(f => f.endsWith('.png'));
  let converted = 0;
  let refsUpdated = 0;

  for (const file of files) {
    const slug = path.basename(file, '.png');
    const pngPath = path.join(OGP_DIR, file);
    const webpPath = path.join(OGP_DIR, `${slug}.webp`);

    await sharp(pngPath).webp({ quality: QUALITY }).toFile(webpPath);

    const pngSize = fs.statSync(pngPath).size;
    const webpSize = fs.statSync(webpPath).size;

    const refs = updateReferences(`/img/ogp/${slug}.png`, `/img/ogp/${slug}.webp`);
    refsUpdated += refs;

    fs.unlinkSync(pngPath);

    converted++;
    console.log(
      `CONVERT ${slug}.png -> ${slug}.webp ` +
      `(${(pngSize / 1024).toFixed(1)}KB -> ${(webpSize / 1024).toFixed(1)}KB, refs: ${refs})`
    );
  }

  console.log(`\nDone. Converted: ${converted}, Frontmatter refs updated: ${refsUpdated}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
