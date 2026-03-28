import React from 'react';
import Head from '@docusaurus/Head';
import {
  useBlogPostStructuredData,
  useBlogPost,
} from '@docusaurus/plugin-content-blog/client';

export default function BlogPostStructuredData(): React.ReactNode {
  const structuredData = useBlogPostStructuredData();
  const {metadata} = useBlogPost();

  // frontMatter.keywords があればそれを優先し、なければ tags を使用
  const keywords =
    (metadata.frontMatter as {keywords?: string[]}).keywords?.length
      ? (metadata.frontMatter as {keywords?: string[]}).keywords
      : metadata.tags.map((tag) => tag.label);

  const enrichedData = {
    ...structuredData,
    ...(keywords && keywords.length > 0 ? {keywords} : {}),
  };

  return (
    <Head>
      <script type="application/ld+json">{JSON.stringify(enrichedData)}</script>
    </Head>
  );
}
