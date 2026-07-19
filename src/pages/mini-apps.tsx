import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import {MINI_APPS} from '@site/src/components/desktop/apps';
import styles from './mini-apps.module.css';

export default function MiniAppsPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'miniApps.pageTitle', message: 'ミニアプリ'})}
      description={translate({
        id: 'miniApps.pageDescription',
        message: 'ブラウザ内で完結する小さなツール集。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="miniApps.pageTitle">ミニアプリ</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="miniApps.subtitle">
            ブラウザ内で完結する小さなツール集。いずれもサーバーに内容を送信しない。
          </Translate>
        </p>

        <div className={styles.grid}>
          {MINI_APPS.map((app) => (
            <Link key={app.href} to={app.href} className={styles.card}>
              <span className={styles.cardIcon}>
                <app.Icon />
              </span>
              <Heading as="h2" className={styles.cardTitle}>
                <Translate id={app.titleId}>{app.titleMessage}</Translate>
              </Heading>
              <p className={styles.cardDescription}>
                <Translate id={app.descriptionId}>{app.descriptionMessage}</Translate>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
