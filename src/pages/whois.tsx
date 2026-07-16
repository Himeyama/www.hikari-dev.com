import type {ReactNode} from 'react';
import {useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './whois.module.css';

const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787/public/whois'
    : 'https://cms-api.hikari-dev.com/public/whois';

interface WhoisResult {
  domain: string;
  server: string;
  raw: string;
  referredServer?: string;
  referredRaw?: string;
}

interface ApiErrorBody {
  code: string;
  message: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

function ResultBlock({
  title,
  server,
  raw,
  copiedKey,
  blockKey,
  onCopy,
}: {
  title: string;
  server: string;
  raw: string;
  copiedKey: string | null;
  blockKey: string;
  onCopy: (key: string, value: string) => void;
}): ReactNode {
  return (
    <div className={styles.resultSection}>
      <div className={styles.resultHeader}>
        <div>
          <p className={styles.resultTitle}>{title}</p>
          <span className={styles.resultServer}>{server}</span>
        </div>
        <button className={styles.copyBtn} onClick={() => onCopy(blockKey, raw)}>
          {copiedKey === blockKey ? (
            <Translate id="whois.copied">コピーしました</Translate>
          ) : (
            <Translate id="whois.copy">コピー</Translate>
          )}
        </button>
      </div>
      <div className={styles.resultBox}>
        <pre className={styles.resultPre}>{raw}</pre>
      </div>
    </div>
  );
}

export default function WhoisPage(): ReactNode {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<WhoisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = domain.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}?domain=${encodeURIComponent(trimmed)}`);
      const body = await res.json();
      if (!res.ok) {
        const errBody = body as ApiErrorBody;
        setError(
          errBody.message ||
            translate({id: 'whois.errorGeneric', message: '検索に失敗した。'}),
        );
        return;
      }
      setResult((body as {data: WhoisResult}).data);
    } catch (err) {
      console.error(err);
      setError(
        translate({
          id: 'whois.errorNetwork',
          message: 'サーバーへの接続に失敗した。しばらくしてからもう一度お試しください。',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async (key: string, value: string) => {
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <Layout
      title={translate({id: 'whois.title', message: 'WHOIS 検索'})}
      description={translate({
        id: 'whois.description',
        message: 'ドメイン名の WHOIS 情報 (登録者・ネームサーバーなど) を取得するツール。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="whois.title">WHOIS 検索</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="whois.subtitle">
            ドメイン名を入力すると WHOIS 情報 (登録者・ネームサーバー・有効期限など) を取得する。
          </Translate>
        </p>

        <form className={styles.form} onSubmit={lookup}>
          <input
            className={styles.input}
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={translate({
              id: 'whois.placeholder',
              message: '例: example.com',
            })}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button className={styles.submitBtn} type="submit" disabled={loading || !domain.trim()}>
            {loading ? (
              <Translate id="whois.searching">検索中...</Translate>
            ) : (
              <Translate id="whois.search">検索</Translate>
            )}
          </button>
        </form>

        {error && <p className={styles.errorText}>{error}</p>}

        {result && (
          <>
            <ResultBlock
              title={translate({id: 'whois.resultTitle', message: 'WHOIS 情報'})}
              server={result.server}
              raw={result.raw}
              copiedKey={copiedKey}
              blockKey="primary"
              onCopy={onCopy}
            />
            {result.referredRaw && result.referredServer && (
              <ResultBlock
                title={translate({
                  id: 'whois.registrarResultTitle',
                  message: 'レジストラの WHOIS 情報',
                })}
                server={result.referredServer}
                raw={result.referredRaw}
                copiedKey={copiedKey}
                blockKey="referred"
                onCopy={onCopy}
              />
            )}
          </>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="whois.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="whois.note1">
                検索はサーバー経由で WHOIS プロトコル (ポート 43) を使用して行われる。入力したドメイン名以外の情報はサーバーに保存されない。
              </Translate>
            </li>
            <li>
              <Translate id="whois.note2">
                レジストリと登録者情報を管理するレジストラの WHOIS サーバーが異なる場合、両方の結果が表示される。
              </Translate>
            </li>
            <li>
              <Translate id="whois.note3">
                一部のドメインではプライバシー保護サービスにより登録者情報が匿名化されている。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
