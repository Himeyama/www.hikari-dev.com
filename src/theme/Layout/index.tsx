import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type Props = React.ComponentProps<typeof LayoutType>;

// Fallback descriptions for pages without specific meta descriptions
// (e.g., blog list, tag pages, archive)
// Page-specific descriptions (e.g., blog article excerpts) are overridden
// by the Seo component in OriginalLayout
const DESCRIPTIONS = {
  ja: 'ひかりの技術備忘録。Linux、AWS、Python、Dockerなどインフラ・開発ツールに関する記事を発信中。',
  en: "Hikari's tech notebook — articles on Linux, AWS, Python, Docker, and infrastructure & development tools.",
  'zh-TW': '光的技術筆記本——關於 Linux、AWS、Python、Docker 和基礎設施與開發工具的文章。',
} as const;

export default function Layout(props: Props) {
  const {i18n} = useDocusaurusContext();
  const desc =
    DESCRIPTIONS[i18n.currentLocale as keyof typeof DESCRIPTIONS] ??
    DESCRIPTIONS.ja;

  return (
    <>
      <Head>
        <meta name="description" content={desc} />
        <meta property="og:description" content={desc} />
      </Head>
      <OriginalLayout {...props} />
    </>
  );
}
