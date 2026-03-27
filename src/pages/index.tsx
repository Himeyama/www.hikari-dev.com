import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          <Translate id="blog.title">{siteConfig.title}</Translate>
        </Heading>
        {/* <p className="hero__subtitle">
          <Translate id="blog.subTitle">{siteConfig.tagline}</Translate>
        </p> */}
      </div>
    </header>
  );
}

function LatestPosts() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogData = usePluginData('recent-blog-posts-plugin') as any;
  const recentPosts = (blogData?.blogPosts ?? []).slice(0, 8);
  const {i18n} = useDocusaurusContext();
  const isEn = i18n.currentLocale === 'en';

  return (
    <section className={styles.section}>
      <Heading as="h2" className={styles.sectionTitle}>
        <Translate id="homepage.latestPosts">最新記事</Translate>
      </Heading>
      <ul className={styles.postList}>
        {recentPosts.map((post: {id: string; metadata: {permalink: string; title: string; titleEn: string; formattedDate: string}}) => (
          <li key={post.id} className={styles.postItem}>
            <Link to={post.metadata.permalink} className={styles.postLink}>
              {isEn ? post.metadata.titleEn : post.metadata.title}
            </Link>
            <span className={styles.postDate}>{post.metadata.formattedDate}</span>
          </li>
        ))}
      </ul>
      <Link to="/blog" className={styles.viewAllLink}>
        <Translate id="homepage.viewAllPosts">全記事を見る →</Translate>
      </Link>
    </section>
  );
}

function CategoriesList() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogData = usePluginData('recent-blog-posts-plugin') as any;
  const tags = Object.values(blogData?.blogTags ?? {}) as Array<{
    label: string;
    permalink: string;
    count?: number;
    items?: string[];
  }>;

  if (tags.length === 0) return null;

  return (
    <section className={styles.section}>
      <Heading as="h2" className={styles.sectionTitle}>
        <Translate id="homepage.categories">カテゴリー</Translate>
      </Heading>
      <ul className={styles.categoryList}>
        {tags.map((tag) => (
          <li key={tag.permalink} className={styles.categoryItem}>
            <Link to={tag.permalink}>
              <span>{tag.label}</span>
              <span className={styles.categoryCount}>
                {tag.count ?? tag.items?.length ?? 0}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AccessRanking() {
  const data = usePluginData('ga-ranking-plugin') as {ranking: Array<{title: string; permalink: string; pageviews: number}>};
  const ranking = data?.ranking ?? [];

  return (
    <section className={styles.section}>
      <Heading as="h2" className={styles.sectionTitle}>
        <Translate id="homepage.accessRanking">アクセスランキング</Translate>
      </Heading>
      {ranking.length === 0 ? (
        <p className={styles.comingSoon}>
          <Translate id="homepage.comingSoon">準備中</Translate>
        </p>
      ) : (
        <ol className={styles.rankingList}>
          {ranking.map((post, i) => (
            <li key={post.permalink} className={styles.rankingItem}>
              <span className={styles.rankingNumber}>{i + 1}</span>
              <Link to={post.permalink} className={styles.postLink}>
                {post.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AuthorProfile() {
  return (
    <section className={styles.section}>
      <Heading as="h2" className={styles.sectionTitle}>
        <Translate id="homepage.authorProfile">著者プロフィール</Translate>
      </Heading>
      <div className={styles.authorCard}>
        <img
          src="https://github.com/himeyama.png"
          alt="ひかり"
          className={styles.authorAvatar}
        />
        <div className={styles.authorInfo}>
          <p className={styles.authorName}>ひかり</p>
          <p className={styles.authorBio}>
            <Translate id="homepage.authorBio">
              日常生活と IT 技術のブログを書いています。
            </Translate>
          </p>
          <div className={styles.authorLinks}>
            <Link href="https://github.com/himeyama">GitHub</Link>
            <Link href="https://x.com/ptrqr">X</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      <main className={styles.mainContent}>
        <div className={styles.mainColumn}>
          <LatestPosts />
          <CategoriesList />
          <AccessRanking />
        </div>
        <aside className={styles.sidebar}>
          <AuthorProfile />
        </aside>
      </main>
    </Layout>
  );
}
