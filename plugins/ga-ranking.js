// @ts-check
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

/**
 * JWT を生成してアクセストークンを取得する
 * @param {{client_email: string, private_key: string}} credentials
 * @returns {Promise<string>}
 */
async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(credentials.private_key, 'base64url');
  const jwt = `${signingInput}.${signature}`;

  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.access_token) resolve(json.access_token);
            else reject(new Error(`Token error: ${data}`));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * GA Data API でページビューランキングを取得する
 * @param {string} accessToken
 * @param {string} propertyId
 * @returns {Promise<Array<{pagePath: string, pageviews: number}>>}
 */
async function fetchPageRanking(accessToken, propertyId) {
  const requestBody = JSON.stringify({
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'analyticsdata.googleapis.com',
        path: `/v1beta/properties/${propertyId}:runReport`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const rows = (json.rows || []).map((row) => ({
              pagePath: row.dimensionValues[0].value,
              pageviews: parseInt(row.metricValues[0].value, 10),
            }));
            resolve(rows);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

/** @type {{ranking: Array<{title: string; titleEn: string; titleZhTw: string; permalink: string; pageviews: number}>} | null} */
let cachedContent = null;

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function gaRankingPlugin(context) {
  return {
    name: 'ga-ranking-plugin',

    async loadContent() {
      if (cachedContent) {
        return cachedContent;
      }

      const credentialsJson = process.env.GA_CREDENTIALS;
      if (!credentialsJson) {
        console.warn('[ga-ranking-plugin] GA_CREDENTIALS not set, skipping.');
        cachedContent = { ranking: [] };
        return cachedContent;
      }

      let credentials;
      try {
        credentials = JSON.parse(credentialsJson);
      } catch {
        console.warn('[ga-ranking-plugin] Failed to parse GA_CREDENTIALS.');
        cachedContent = { ranking: [] };
        return cachedContent;
      }

      const accessToken = await getAccessToken(credentials);
      const rows = await fetchPageRanking(accessToken, '320051022');

      const blogDir = path.join(context.siteDir, 'blog');
      const enBlogDir = path.join(context.siteDir, 'i18n', 'en', 'docusaurus-plugin-content-blog');
      const zhTwBlogDir = path.join(context.siteDir, 'i18n', 'zh-TW', 'docusaurus-plugin-content-blog');

      // Build English title map from i18n files
      /** @type {Record<string, string>} */
      const enTitleMap = {};
      if (fs.existsSync(enBlogDir)) {
        fs.readdirSync(enBlogDir)
          .filter((f) => (f.endsWith('.md') || f.endsWith('.mdx')) && /^\d{4}-\d{2}-\d{2}-/.test(f))
          .forEach((filename) => {
            const content = fs.readFileSync(path.join(enBlogDir, filename), 'utf-8');
            const titleMatch = content.match(/^title:\s*(.+)$/m);
            if (titleMatch) {
              const key = filename.replace(/\.(mdx?)$/, '');
              enTitleMap[key] = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
            }
          });
      }

      // Build Traditional Chinese title map from i18n files
      /** @type {Record<string, string>} */
      const zhTwTitleMap = {};
      if (fs.existsSync(zhTwBlogDir)) {
        fs.readdirSync(zhTwBlogDir)
          .filter((f) => (f.endsWith('.md') || f.endsWith('.mdx')) && /^\d{4}-\d{2}-\d{2}-/.test(f))
          .forEach((filename) => {
            const content = fs.readFileSync(path.join(zhTwBlogDir, filename), 'utf-8');
            const titleMatch = content.match(/^title:\s*(.+)$/m);
            if (titleMatch) {
              const key = filename.replace(/\.(mdx?)$/, '');
              zhTwTitleMap[key] = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
            }
          });
      }

      const ranking = [];

      for (const { pagePath, pageviews } of rows) {
        const match = pagePath.match(/^\/blog\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+?)\/?$/);
        if (!match) continue;
        const [, year, month, day, slug] = match;

        const fileBase = `${year}-${month}-${day}-${slug}`;
        const mdPath = path.join(blogDir, `${fileBase}.md`);
        const mdxPath = path.join(blogDir, `${fileBase}.mdx`);
        const filePath = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;
        if (!filePath) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const rawTitle = titleMatch ? titleMatch[1].trim() : slug;
        const title = rawTitle.replace(/^['"]|['"]$/g, '');

        const imageMatch = content.match(/^image:\s*(.+)$/m);
        const image = imageMatch ? imageMatch[1].trim().replace(/^['"]|['"]$/g, '') : '/img/docusaurus-social-card.png';

        ranking.push({
          title,
          titleEn: enTitleMap[fileBase] ?? title,
          titleZhTw: zhTwTitleMap[fileBase] ?? title,
          permalink: pagePath,
          pageviews,
          image,
        });
        if (ranking.length >= 10) break;
      }

      cachedContent = { ranking };
      return cachedContent;
    },

    async contentLoaded({ content, actions }) {
      actions.setGlobalData(content);
    },
  };
};
