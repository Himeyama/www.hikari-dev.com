import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './trivia.module.css';

type TriviaResult = {
  date: string;
  fact: string;
  created_at: string;
};

function TriviaCard(): ReactNode {
  const [trivia, setTrivia] = useState<TriviaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://trivia.hikari-dev.com/trivia')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: {results: TriviaResult[]}) => {
        setTrivia(data.results?.[0] ?? null);
      })
      .catch(() => {
        setError(translate({id: 'trivia.error', message: '雑学の取得に失敗した。'}));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <p className={styles.loading}>
        <Translate id="trivia.loading">読み込み中...</Translate>
      </p>
    );
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!trivia) {
    return (
      <p className={styles.error}>
        <Translate id="trivia.notFound">本日の雑学が見つからなかった。</Translate>
      </p>
    );
  }

  const formattedDate = new Date(trivia.date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.card}>
      <p className={styles.dateLabel}>{formattedDate}</p>
      <p className={styles.fact}>{trivia.fact}</p>
    </div>
  );
}

export default function TriviaPage(): ReactNode {
  const title = translate({id: 'trivia.title', message: '本日の雑学'});
  const description = translate({
    id: 'trivia.description',
    message: '毎日更新される雑学を紹介するページ。',
  });

  return (
    <Layout title={title} description={description}>
      <div className={styles.pageWrapper}>
        <Heading as="h1" style={{textAlign: 'center', marginBottom: '2rem'}}>
          <Translate id="trivia.title">本日の雑学</Translate>
        </Heading>
        <TriviaCard />
      </div>
    </Layout>
  );
}
