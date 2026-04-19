import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Hikari's Notebook",
  tagline: 'Hikari\'s Everyday Life and IT Technology Blog',
  favicon: 'img/favicon.ico',

  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'dns-prefetch', href: 'https://github.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&family=BIZ+UDPMincho&display=swap',
      },
    },
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'ひかりの備忘録',
        url: 'https://www.hikari-dev.com/',
        description: 'ひかりの技術備忘録。Linux、AWS、Python、Dockerなどインフラ・開発ツールに関する記事を発信中。',
      }),
    },
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `
        (function() {
          try {
            const font = localStorage.getItem('theme-font');
            if (font && font !== 'default') {
              document.documentElement.setAttribute('data-font', font);
            }
          } catch (e) {}
        })();
      `,
    },
  ],

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'ignore', // または 'throw' / 'ignore'
    },
    mermaid: true,
  },

  // Set the production url of your site here
  url: 'https://www.hikari-dev.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'himeyama', // Usually your GitHub org/user name.
  projectName: 'www.hikari-dev.com', // Usually your repo name.
  onBrokenAnchors: 'ignore',
  onBrokenLinks: 'throw',

  future: {
    v4: true,
    faster: {
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: true,
      rspackBundler: true,
      mdxCrossCompilerCache: true,
    },
  },

  themes: [
    '@docusaurus/theme-mermaid',
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-TW'],
    localeConfigs: {
      ja: {
        label: '日本語',
        direction: 'ltr',
      },
      en: {
        label: 'English',
        direction: 'ltr',
      },
      'zh-TW': {
        label: '繁體中文',
        direction: 'ltr',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          createSitemapItems: async (params) => {
            const {defaultCreateSitemapItems} = params;
            const items = await defaultCreateSitemapItems(params);
            return items.map((item) => {
              let result = item;

              // priority 設定
              if (
                item.url === 'https://www.hikari-dev.com/' ||
                item.url === 'https://www.hikari-dev.com/en/'
              ) {
                result = {...result, priority: 1.0};
              } else if (
                /\/blog\/[0-9]/.test(item.url) ||
                /\/sukisuki\/[0-9]/.test(item.url)
              ) {
                result = {...result, priority: 0.8};
              }

              // ブログ記事 URL から日付を抽出して lastmod に設定
              // 例: /blog/2026/03/18/storage → lastmod: "2026-03-18"
              const dateMatch = item.url.match(
                /\/(?:blog|sukisuki)\/(\d{4})\/(\d{2})\/(\d{2})\//,
              );
              if (dateMatch) {
                result = {
                  ...result,
                  lastmod: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
                };
              }

              return result;
            });
          },
        },
        blog: {
          blogSidebarCount: 'ALL',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore'
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  clientModules: ['./src/clientModules/gtag.js'],

  plugins: [
    './plugins/recent-blog-posts.js',
    './plugins/ga-ranking.js',
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'sukisuki-club',
        routeBasePath: 'sukisuki',
        path: './sukisuki',
        blogSidebarCount: 'ALL',
        showReadingTime: true,
        onUntruncatedBlogPosts: 'ignore',
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
      },
    ],
    () => ({
      name: 'suppress-warnings-plugin',
      configureWebpack(config, isServer) {
        if (isServer) {
          return {
            externals: [
              {
                'vscode-languageserver-types': 'commonjs vscode-languageserver-types',
              },
            ],
          };
        }
        return {};
      },
    }),
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.png',
    metadata: [
      {property: 'og:type', content: 'website'},
      {property: 'og:locale', content: 'ja_JP'},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:site', content: '@ptrqr'},
    ],
    navbar: {
      title: 'Hikari\'s Notebook',
      logo: {
        alt: 'My Site Logo',
        src: 'img/logo.svg',
        width: 32,
        height: 32,
      },
      items: [
        // {
        //   type: 'docSidebar',
        //   sidebarId: 'tutorialSidebar',
        //   position: 'left',
        //   label: 'Tutorial',
        // },
        {to: '/', label: 'Blog', position: 'left'},
        {to: '/sukisuki', label: 'Like', position: 'left'},
        {to: '/hanoi', label: 'ハノイの塔', position: 'left'},
        {to: '/chat', label: 'Chat', position: 'right'},
        {
          href: 'https://github.com/himeyama',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'custom-fontSwitcher',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        // {
        //   title: 'Docs',
        //   items: [
        //     {
        //       label: 'Tutorial',
        //       to: '/docs/intro',
        //     },
        //   ],
        // },
        {
          title: 'Community',
          items: [
            {
              label: 'X',
              href: 'https://x.com/ptrqr',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/himeyama',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ひかりの備忘録 (Hikari's Notebook). Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'csharp', 'ruby', 'latex', 'rust', 'powershell'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
