import React from 'react';
import OriginalBlogPostItem from '@theme-original/BlogPostItem';
import type BlogPostItemType from '@theme/BlogPostItem';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import CommentSection from '@site/src/components/CommentSection';

type Props = React.ComponentProps<typeof BlogPostItemType>;

export default function BlogPostItem(props: Props) {
  const { isBlogPostPage } = useBlogPost();
  return (
    <>
      <OriginalBlogPostItem {...props} />
      {isBlogPostPage && <CommentSection />}
    </>
  );
}
