// @ts-check
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function recentBlogPostsPlugin(context) {
  return {
    name: 'recent-blog-posts-plugin',

    async loadContent() {
      const blogDir = path.join(context.siteDir, 'blog');
      const enBlogDir = path.join(context.siteDir, 'i18n', 'en', 'docusaurus-plugin-content-blog');

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

      const files = fs
        .readdirSync(blogDir)
        .filter(
          (f) =>
            (f.endsWith('.md') || f.endsWith('.mdx')) &&
            /^\d{4}-\d{2}-\d{2}-/.test(f),
        )
        .sort()
        .reverse();

      /** @type {Record<string, {label: string; permalink: string; count: number}>} */
      const tagsMap = {};

      const posts = files
        .map((filename) => {
          const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.(mdx?)$/);
          if (!match) return null;
          const [, year, month, day, slug] = match;
          const fileKey = `${year}-${month}-${day}-${slug}`;

          const filePath = path.join(blogDir, filename);
          const content = fs.readFileSync(filePath, 'utf-8');

          // Parse title
          const titleMatch = content.match(/^title:\s*(.+)$/m);
          const rawTitle = titleMatch ? titleMatch[1].trim() : slug;
          const title = rawTitle.replace(/^['"]|['"]$/g, '');

          // Parse tags (supports inline: [a, b] and block: \n  - a\n  - b)
          const tags = [];
          const inlineTagsMatch = content.match(/^tags:\s*\[(.+)\]/m);
          if (inlineTagsMatch) {
            inlineTagsMatch[1].split(',').forEach((t) => {
              const label = t.trim().replace(/^['"]|['"]$/g, '');
              if (label) tags.push(label);
            });
          } else {
            const blockTagsMatch = content.match(/^tags:\s*\n((?:\s+-\s*.+\n?)+)/m);
            if (blockTagsMatch) {
              blockTagsMatch[1]
                .split('\n')
                .forEach((line) => {
                  const label = line.replace(/^\s+-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
                  if (label) tags.push(label);
                });
            }
          }

          // Aggregate tags
          tags.forEach((label) => {
            const tagPermalink = `/blog/tags/${_.kebabCase(label)}`;
            if (!tagsMap[label]) {
              tagsMap[label] = {label, permalink: tagPermalink, count: 0};
            }
            tagsMap[label].count++;
          });

          return {
            id: filename,
            metadata: {
              title,
              titleEn: enTitleMap[fileKey] ?? title,
              permalink: `/blog/${year}/${month}/${day}/${slug}`,
              date: `${year}-${month}-${day}`,
              formattedDate: `${year}/${month}/${day}`,
              tags: tags.map((label) => ({
                label,
                permalink: `/blog/tags/${_.kebabCase(label)}`,
              })),
            },
          };
        })
        .filter(Boolean);

      return {blogPosts: posts, blogTags: tagsMap};
    },

    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
};
