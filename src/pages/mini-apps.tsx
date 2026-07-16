import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './mini-apps.module.css';

function ImageIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16l5.5-5.5a1.5 1.5 0 012.12 0L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14l1.5-1.5a1.5 1.5 0 012.12 0L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 4l3.5 4L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20l-3.5-4L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 7L4 12l4.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 7L20 12l-4.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 5L10.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Base64Icon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10v4M7 10h1.5a1.5 1.5 0 010 3H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 10v4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10l-2 4M15.2 10l2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UuidIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8v8M11 8v8M15 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChatIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h16v11H9.5L5 20.5v-4H4v-11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4L7 20M17 4l-2 16M4 9h16M3.5 15h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CertIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TableIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18M9 5v14M15 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="3.5" ry="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 12h17M4.5 8h15M4.5 16h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ServerIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7" cy="7" r="0.9" fill="currentColor" />
      <circle cx="7" cy="17" r="0.9" fill="currentColor" />
      <path d="M11 7h7M11 17h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type MiniApp = {
  href: string;
  Icon: () => ReactNode;
  titleId: string;
  titleMessage: string;
  descriptionId: string;
  descriptionMessage: string;
};

const MINI_APPS: MiniApp[] = [
  {
    href: '/webp-converter',
    Icon: ImageIcon,
    titleId: 'miniApps.webp.title',
    titleMessage: 'WebP 変換',
    descriptionId: 'miniApps.webp.description',
    descriptionMessage: '画像を WebP 形式に変換する。',
  },
  {
    href: '/svg-to-ico',
    Icon: SwapIcon,
    titleId: 'miniApps.svgIco.title',
    titleMessage: 'SVG2ICO',
    descriptionId: 'miniApps.svgIco.description',
    descriptionMessage: 'SVG 画像を ICO 形式に変換する。',
  },
  {
    href: '/yaml-json',
    Icon: CodeIcon,
    titleId: 'miniApps.yamlJson.title',
    titleMessage: 'YAML⇄JSON',
    descriptionId: 'miniApps.yamlJson.description',
    descriptionMessage: 'YAML と JSON を相互変換する。',
  },
  {
    href: '/base64',
    Icon: Base64Icon,
    titleId: 'miniApps.base64.title',
    titleMessage: 'Base64 変換',
    descriptionId: 'miniApps.base64.description',
    descriptionMessage: 'テキストやファイルを Base64 に相互変換する。',
  },
  {
    href: '/hash',
    Icon: HashIcon,
    titleId: 'miniApps.hash.title',
    titleMessage: 'ハッシュ値取得',
    descriptionId: 'miniApps.hash.description',
    descriptionMessage: 'テキストやファイルのハッシュ値 (SHA-256 など) を計算する。',
  },
  {
    href: '/cert-generator',
    Icon: CertIcon,
    titleId: 'miniApps.certGen.title',
    titleMessage: '証明書ジェネレーター',
    descriptionId: 'miniApps.certGen.description',
    descriptionMessage: 'ルート CA 証明書とサーバー証明書 (オレオレ証明書) を生成する。',
  },
  {
    href: '/uuid',
    Icon: UuidIcon,
    titleId: 'miniApps.uuid.title',
    titleMessage: 'UUID ジェネレーター',
    descriptionId: 'miniApps.uuid.description',
    descriptionMessage: 'UUID (v4) を生成する。',
  },
  {
    href: '/password-generator',
    Icon: LockIcon,
    titleId: 'miniApps.passwordGenerator.title',
    titleMessage: 'パスワード ジェネレーター',
    descriptionId: 'miniApps.passwordGenerator.description',
    descriptionMessage: '安全なパスフレーズやパスワードを生成する。',
  },
  {
    href: '/tsv-to-markdown',
    Icon: TableIcon,
    titleId: 'miniApps.tsvMarkdown.title',
    titleMessage: 'TSV→Markdown 表変換',
    descriptionId: 'miniApps.tsvMarkdown.description',
    descriptionMessage: 'Excel からコピーしたタブ区切りテキストを Markdown テーブルに変換する。',
  },
  {
    href: '/whois',
    Icon: GlobeIcon,
    titleId: 'miniApps.whois.title',
    titleMessage: 'WHOIS 検索',
    descriptionId: 'miniApps.whois.description',
    descriptionMessage: 'ドメイン名の WHOIS 情報 (登録者・ネームサーバーなど) を取得する。',
  },
  {
    href: '/nslookup',
    Icon: ServerIcon,
    titleId: 'miniApps.nslookup.title',
    titleMessage: 'nslookup (DNS 検索)',
    descriptionId: 'miniApps.nslookup.description',
    descriptionMessage: 'ドメイン名の DNS レコード (A・AAAA・MX・TXT・NS・CNAME) を取得する。',
  },
  {
    href: '/chat',
    Icon: ChatIcon,
    titleId: 'miniApps.chat.title',
    titleMessage: 'チャット',
    descriptionId: 'miniApps.chat.description',
    descriptionMessage: 'AI と対話できるチャット。',
  },
];

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
