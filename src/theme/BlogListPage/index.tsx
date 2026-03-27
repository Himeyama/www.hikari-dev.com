import React from 'react';
import {Redirect} from '@docusaurus/router';
import {useLocation} from '@docusaurus/router';
import Head from '@docusaurus/Head';
import OriginalBlogListPage from '@theme-original/BlogListPage';
import type BlogListPageType from '@theme/BlogListPage';

type Props = React.ComponentProps<typeof BlogListPageType>;

export default function BlogListPageWrapper(props: Props): React.ReactNode {
  const location = useLocation();

  if (location.pathname === '/blog' || location.pathname === '/blog/') {
    return (
      <>
        <Head>
          <meta httpEquiv="refresh" content="0; url=/" />
        </Head>
        <Redirect to="/" />
      </>
    );
  }

  if (location.pathname === '/en/blog' || location.pathname === '/en/blog/') {
    return (
      <>
        <Head>
          <meta httpEquiv="refresh" content="0; url=/en" />
        </Head>
        <Redirect to="/en" />
      </>
    );
  }

  return <OriginalBlogListPage {...props} />;
}
