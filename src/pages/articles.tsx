import type {ReactNode} from 'react';
import {useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, { translate } from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';

import indexStyles from './index.module.css';
import styles from './articles.module.css';

function ArticlesHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', indexStyles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          <Translate id="articles.title">記事一覧</Translate>
        </Heading>
      </div>
    </header>
  );
}

function ArticlesList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogData = usePluginData('recent-blog-posts-plugin') as any;
  const allPosts = (blogData?.blogPosts ?? []) as Array<{
    id: string;
    metadata: {
      permalink: string;
      title: string;
      titleEn: string;
      titleZhTw: string;
      formattedDate: string;
      tags: Array<{label: string; permalink: string}>;
    };
  }>;
  const tags = Object.values(blogData?.blogTags ?? {}) as Array<{
    label: string;
    permalink: string;
    count?: number;
  }>;

  const {i18n} = useDocusaurusContext();

  const getPostTitle = (post: {metadata: {title: string; titleEn: string; titleZhTw: string}}) => {
    switch (i18n.currentLocale) {
      case 'en':
        return post.metadata.titleEn;
      case 'zh-TW':
        return post.metadata.titleZhTw;
      default:
        return post.metadata.title;
    }
  };

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredPosts = selectedTag
    ? allPosts.filter((post) =>
        post.metadata.tags.some((t) => t.label === selectedTag),
      )
    : allPosts;

  return (
    <main className={styles.mainContent}>
      <div>
        {/* Tag Filter Section */}
        <section className={indexStyles.section}>
          <Heading as="h2" className={indexStyles.sectionTitle}>
            <Translate id="articles.filterByTag">カテゴリーで絞り込む</Translate>
          </Heading>
          <ul className={styles.tagFilterList}>
            <li>
              <button
                className={clsx(styles.tagButton, {
                  [styles.tagButtonActive]: selectedTag === null,
                })}
                onClick={() => setSelectedTag(null)}
              >
                <span>
                  <Translate id="articles.allPosts">全て</Translate>
                </span>
                <span className={styles.tagCount}>{allPosts.length}</span>
              </button>
            </li>
            {tags.map((tag) => (
              <li key={tag.permalink}>
                <button
                  className={clsx(styles.tagButton, {
                    [styles.tagButtonActive]: selectedTag === tag.label,
                  })}
                  onClick={() => setSelectedTag(tag.label)}
                >
                  <span>{tag.label}</span>
                  <span className={styles.tagCount}>{tag.count ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Articles List Section */}
        <section className={indexStyles.section}>
          <Heading as="h2" className={indexStyles.sectionTitle}>
            {selectedTag ? (
              <>
                <span>{selectedTag}</span>
                <span style={{fontSize: '0.8em', fontWeight: 'normal', marginLeft: '0.5em'}}>
                  ({filteredPosts.length}
                  <Translate id="articles.itemCount">件</Translate>)
                </span>
              </>
            ) : (
              <>
                <Translate id="articles.allArticles">記事一覧</Translate>
                <span style={{fontSize: '0.8em', fontWeight: 'normal', marginLeft: '0.5em'}}>
                  ({allPosts.length}
                  <Translate id="articles.itemCount">件</Translate>)
                </span>
              </>
            )}
          </Heading>
          {filteredPosts.length === 0 ? (
            <p style={{textAlign: 'center', color: 'var(--ifm-color-emphasis-600)'}}>
              <Translate id="articles.noResults">該当する記事がありません</Translate>
            </p>
          ) : (
            <ul className={indexStyles.postList}>
              {filteredPosts.map((post) => (
                <li key={post.id} className={indexStyles.postItem}>
                  <Link to={post.metadata.permalink} className={indexStyles.postLink}>
                    {getPostTitle(post)}
                  </Link>
                  <span className={indexStyles.postDate}>{post.metadata.formattedDate}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Articles(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  // Get title and description from i18n, with fallbacks
  const title = translate({
    id: 'articles.title',
    message: 'Articles',
  });

  const description = translate({
    id: 'articles.description',
    message: 'All articles from Hikari\'s Notebook',
  });

  return (
    <Layout title={`${title} | ${siteConfig.title}`} description={description}>
      <ArticlesHeader />
      <ArticlesList />
    </Layout>
  );
}
