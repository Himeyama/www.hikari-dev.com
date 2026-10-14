import React, {useEffect} from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&display=swap';

// x-default hreflang をすべてのページに追加
// 英語ページ (/en/...) → デフォルト (日本語) URL に向ける
export default function Root({children}: {children: React.ReactNode}) {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();

  const defaultPath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const xDefaultUrl = `${siteConfig.url}${defaultPath}`;

  // 「一般」の選択時に、端末を問わず指定の Noto フォントを読み込む。
  useEffect(() => {
    const loadFonts = () => {
      if (document.documentElement.dataset.font !== 'article-serif') return;
      if (document.querySelector('link[data-hikari-article-fonts]')) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONTS_URL;
      link.dataset.hikariArticleFonts = '';
      document.head.appendChild(link);
    };
    loadFonts();
    const observer = new MutationObserver(loadFonts);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-font'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Head>
        <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
      </Head>
      {children}
    </>
  );
}
