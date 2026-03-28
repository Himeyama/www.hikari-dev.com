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

  // モバイルのみフォントを読み込む（デスクトップでは不要なため）
  // <link media="..."> は PageSpeed が静的 HTML を評価する際にダウンロードされてしまうため
  // useEffect で実行時に matchMedia で判定してから動的注入する
  useEffect(() => {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    document.head.appendChild(link);
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
