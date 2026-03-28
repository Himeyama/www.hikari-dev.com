import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type Props = React.ComponentProps<typeof LayoutType>;

// ページ固有の description が設定されていない場合のロケール別フォールバック
// (ブログ記事一覧・タグページ・アーカイブ等はページ固有 description を持たない)
// ページ固有 description (ブログ記事の excerpt など) は OriginalLayout 内の Seo
// コンポーネントが後から上書きするため、こちらはあくまでフォールバック。
const DESCRIPTIONS = {
  ja: 'ひかりの技術備忘録。Linux、AWS、Python、Dockerなどインフラ・開発ツールに関する記事を発信中。',
  en: "Hikari's tech notebook — articles on Linux, AWS, Python, Docker, and infrastructure & development tools.",
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
