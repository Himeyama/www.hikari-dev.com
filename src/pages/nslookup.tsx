import type {ReactNode} from 'react';
import {useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './nslookup.module.css';

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';
const RECORD_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'] as const;
type RecordType = (typeof RECORD_TYPES)[number];

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

type RecordResult =
  | {status: 'ok'; answers: DohAnswer[]}
  | {status: 'nxdomain'}
  | {status: 'error'; message: string};

async function queryRecord(domain: string, type: RecordType): Promise<RecordResult> {
  try {
    const res = await fetch(
      `${DOH_ENDPOINT}?name=${encodeURIComponent(domain)}&type=${type}`,
      {headers: {Accept: 'application/dns-json'}},
    );
    if (!res.ok) {
      return {status: 'error', message: `HTTP ${res.status}`};
    }
    const body = (await res.json()) as DohResponse;
    if (body.Status === 3) {
      return {status: 'nxdomain'};
    }
    if (body.Status !== 0) {
      return {status: 'error', message: `DNS Status ${body.Status}`};
    }
    return {status: 'ok', answers: body.Answer ?? []};
  } catch (e) {
    console.error(e);
    return {
      status: 'error',
      message: translate({id: 'nslookup.errorNetwork', message: 'サーバーへの接続に失敗した。'}),
    };
  }
}

function RecordSection({type, result}: {type: RecordType; result: RecordResult | null}): ReactNode {
  return (
    <div className={styles.recordSection}>
      <div className={styles.recordHeader}>
        <span className={styles.recordType}>{type}</span>
        {result === null && (
          <span className={styles.recordCount}>
            <Translate id="nslookup.loading">検索中...</Translate>
          </span>
        )}
        {result?.status === 'ok' && (
          <span className={styles.recordCount}>
            {result.answers.length > 0 ? (
              `${result.answers.length} 件`
            ) : (
              <Translate id="nslookup.noRecords">レコードなし</Translate>
            )}
          </span>
        )}
        {result?.status === 'nxdomain' && (
          <span className={styles.recordEmpty}>
            <Translate id="nslookup.nxdomain">ドメインが見つからない</Translate>
          </span>
        )}
        {result?.status === 'error' && (
          <span className={styles.recordEmpty}>{result.message}</span>
        )}
      </div>
      {result?.status === 'ok' && result.answers.length > 0 && (
        <ul className={styles.recordList}>
          {result.answers.map((answer, i) => (
            <li key={`${answer.name}-${i}`} className={styles.recordRow}>
              <code className={styles.recordData}>{answer.data}</code>
              <span className={styles.recordTtl}>TTL {answer.TTL}s</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NslookupPage(): ReactNode {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<Record<RecordType, RecordResult | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = domain.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResults(Object.fromEntries(RECORD_TYPES.map((t) => [t, null])) as Record<RecordType, RecordResult | null>);

    try {
      const entries = await Promise.all(
        RECORD_TYPES.map(async (type) => [type, await queryRecord(trimmed, type)] as const),
      );
      setResults(Object.fromEntries(entries) as Record<RecordType, RecordResult | null>);
    } catch (e) {
      console.error(e);
      setError(translate({id: 'nslookup.errorGeneric', message: '検索に失敗した。'}));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title={translate({id: 'nslookup.title', message: 'nslookup (DNS 検索)'})}
      description={translate({
        id: 'nslookup.description',
        message: 'ドメイン名の DNS レコード (A・AAAA・MX・TXT・NS・CNAME) を取得するツール。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="nslookup.title">nslookup (DNS 検索)</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="nslookup.subtitle">
            ドメイン名を入力すると DNS レコード (A・AAAA・MX・TXT・NS・CNAME) を取得する。
          </Translate>
        </p>

        <form className={styles.form} onSubmit={lookup}>
          <input
            className={styles.input}
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={translate({id: 'nslookup.placeholder', message: '例: example.com'})}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button className={styles.submitBtn} type="submit" disabled={loading || !domain.trim()}>
            {loading ? (
              <Translate id="nslookup.searching">検索中...</Translate>
            ) : (
              <Translate id="nslookup.search">検索</Translate>
            )}
          </button>
        </form>

        {error && <p className={styles.errorText}>{error}</p>}

        {results &&
          RECORD_TYPES.map((type) => (
            <RecordSection key={type} type={type} result={results[type]} />
          ))}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="nslookup.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="nslookup.note1">
                検索は DNS over HTTPS (Cloudflare の 1.1.1.1) を使用してブラウザから直接行われ、サーバーには送信されない。
              </Translate>
            </li>
            <li>
              <Translate id="nslookup.note2">
                A・AAAA・MX・TXT・NS・CNAME の 6 種類のレコードに対応する。
              </Translate>
            </li>
            <li>
              <Translate id="nslookup.note3">
                DNS の変更は反映までに時間がかかる場合があり (TTL によるキャッシュ)、必ずしも最新の設定を反映しない。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
