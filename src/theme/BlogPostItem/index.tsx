import React from 'react';
import OriginalBlogPostItem from '@theme-original/BlogPostItem';
import type BlogPostItemType from '@theme/BlogPostItem';
import Head from '@docusaurus/Head';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import CommentSection from '@site/src/components/CommentSection';

type Props = React.ComponentProps<typeof BlogPostItemType>;

export default function BlogPostItem(props: Props) {
  const {isBlogPostPage, metadata} = useBlogPost();

  const jsonLd = isBlogPostPage
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: metadata.title,
        description: metadata.description,
        datePublished: metadata.date,
        ...(metadata.lastUpdatedAt && {
          dateModified: new Date(metadata.lastUpdatedAt * 1000).toISOString(),
        }),
        author: metadata.authors.map((author) => ({
          '@type': 'Person',
          name: author.name,
          ...(author.url && {url: author.url}),
          ...(author.imageURL && {image: author.imageURL}),
        })),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://www.hikari-dev.com${metadata.permalink}`,
        },
      })
    : null;

  return (
    <>
      {jsonLd && (
        <Head>
          <script type="application/ld+json">{jsonLd}</script>
        </Head>
      )}
      <OriginalBlogPostItem {...props} />
      {isBlogPostPage && <CommentSection />}
    </>
  );
}
