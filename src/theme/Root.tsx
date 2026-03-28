import React from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';

// x-default hreflang をすべてのページに追加
// 英語ページ (/en/...) → デフォルト (日本語) URL に向ける
export default function Root({children}: {children: React.ReactNode}) {
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();

  const defaultPath = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  const xDefaultUrl = `${siteConfig.url}${defaultPath}`;

  return (
    <>
      <Head>
        <link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
      </Head>
      {children}
    </>
  );
}
