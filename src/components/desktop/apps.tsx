import type {ReactNode} from 'react';

function ImageIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#3B82F6" />
      <rect x="6" y="7" width="12" height="10" rx="1.2" stroke="white" strokeWidth="1.4" />
      <circle cx="9.2" cy="10.2" r="1.1" fill="white" />
      <path d="M6 15l3.5-3.5a1.2 1.2 0 011.7 0L15 15" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 14l1-1a1.2 1.2 0 011.7 0L18 15.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SwapIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#6366F1" />
      <path d="M6 9h9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 6l3 3-3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 15H9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 18l-3-3 3-3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#8B5CF6" />
      <path d="M9.5 8L6 12l3.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 8L18 12l-3.5 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Base64Icon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#A855F7" />
      <rect x="5.5" y="9" width="13" height="7" rx="1.2" stroke="white" strokeWidth="1.3" />
      <path d="M8 11.5v3M8 11.5h1a1.1 1.1 0 010 2.2H8" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.2 11.5v3h1.6" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 11.5l-1.6 3M15.6 11.5l1.6 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UuidIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#F43F5E" />
      <rect x="5" y="8" width="14" height="8" rx="1.2" stroke="white" strokeWidth="1.4" />
      <path d="M8 8v8M10.5 8v8M13 8v8M15.5 8v8" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#EF4444" />
      <rect x="7" y="11.5" width="10" height="7.5" rx="1.4" fill="white" />
      <path d="M9 11.5V9a3 3 0 016 0v2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="15" r="1.2" fill="#EF4444" />
    </svg>
  );
}

function ChatIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#06B6D4" />
      <path
        d="M5.5 6.5h13v9H10l-3.5 3v-3h-1v-9z"
        fill="white"
      />
      <path d="M8 10.5h8M8 13.2h5" stroke="#06B6D4" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#D946EF" />
      <path
        d="M9.5 6.5L8 17.5M15.5 6.5L14 17.5M5.5 10h13M5 14h13"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CertIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#EC4899" />
      <path
        d="M12 5.5l5 2v3.5c0 3.5-2.2 5.8-5 6.8-2.8-1-5-3.3-5-6.8V7.5l5-2z"
        fill="white"
      />
      <path d="M9.7 11.3l1.6 1.6 3-3.2" stroke="#EC4899" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TableIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#F97316" />
      <rect x="5.5" y="6.5" width="13" height="11" rx="1.2" stroke="white" strokeWidth="1.4" />
      <path d="M5.5 10.5h13M10 6.5v11M14.5 6.5v11" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#F59E0B" />
      <circle cx="12" cy="12" r="6.5" stroke="white" strokeWidth="1.4" />
      <ellipse cx="12" cy="12" rx="2.7" ry="6.5" stroke="white" strokeWidth="1.4" />
      <path d="M5.5 12h13M6.2 8.7h11.6M6.2 15.3h11.6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ServerIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#84CC16" />
      <rect x="5.5" y="6" width="13" height="4.5" rx="1" stroke="white" strokeWidth="1.3" />
      <rect x="5.5" y="13.5" width="13" height="4.5" rx="1" stroke="white" strokeWidth="1.3" />
      <circle cx="8" cy="8.25" r="0.75" fill="white" />
      <circle cx="8" cy="15.75" r="0.75" fill="white" />
      <path d="M11 8.25h5M11 15.75h5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function SigmaIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#14B8A6" />
      <path
        d="M7.5 7h9l-4.5 5 4.5 5h-9l3.7-4.6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#22C55E" />
      <path d="M8 5.5h5.5l3 3v10H8v-13z" fill="white" />
      <path d="M13.5 5.5v3h3" fill="#16A34A" />
      <path d="M10 13h5M10 15.8h5" stroke="#22C55E" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6.5A1.5 1.5 0 014.5 5h4l2 2.5H20a1 1 0 011 1V9H3V6.5z" fill="#FDE68A" />
      <path
        d="M3 8h18v9.5A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5V8z"
        fill="#FBBF24"
        stroke="#F59E0B"
        strokeWidth="0.6"
      />
    </svg>
  );
}

function FileIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M14 3v4h4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 12h8M8 15.5h6" stroke="#60A5FA" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EditorIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#0EA5E9" />
      <path
        d="M8 16.5l-0.7 3 3-0.7 8-8-2.3-2.3-8 8z"
        fill="white"
      />
      <path d="M15.3 6.2l2.3 2.3 1.4-1.4a1.5 1.5 0 000-2.1l-0.2-0.2a1.5 1.5 0 00-2.1 0l-1.4 1.4z" fill="white" />
    </svg>
  );
}

export {FolderIcon, FileIcon};

export type MiniApp = {
  id: string;
  href: string;
  Icon: () => ReactNode;
  titleId: string;
  titleMessage: string;
  descriptionId: string;
  descriptionMessage: string;
};

const RAW_MINI_APPS: Omit<MiniApp, 'id'>[] = [
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
    href: '/doc',
    Icon: DocIcon,
    titleId: 'miniApps.doc.title',
    titleMessage: 'Markdown→docx 変換',
    descriptionId: 'miniApps.doc.description',
    descriptionMessage: 'Markdown を Word 文書 (docx) に変換する。',
  },
  {
    href: '/tex-preview',
    Icon: SigmaIcon,
    titleId: 'miniApps.texPreview.title',
    titleMessage: 'TeX 数式プレビュー',
    descriptionId: 'miniApps.texPreview.description',
    descriptionMessage: 'TeX 記法の数式をリアルタイムでプレビューする。',
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

export const MINI_APPS: MiniApp[] = RAW_MINI_APPS.map((app) => ({
  ...app,
  id: app.href.slice(1),
}));

// デスクトップから起動できるがミニアプリ一覧 (/mini-apps) には載せない特殊アプリ。
// Files はデスクトップにシード表示され、Editor は folder/file から間接起動される。
export const FILES_APP: MiniApp = {
  id: 'files',
  href: '/files',
  Icon: FolderIcon,
  titleId: 'miniApps.files.title',
  titleMessage: 'ファイル',
  descriptionId: 'miniApps.files.description',
  descriptionMessage: '仮想ファイルシステムを閲覧・操作するファイル エクスプローラー。',
};

export const EDITOR_APP: MiniApp = {
  id: 'editor',
  href: '/editor',
  Icon: EditorIcon,
  titleId: 'miniApps.editor.title',
  titleMessage: 'エディタ',
  descriptionId: 'miniApps.editor.description',
  descriptionMessage: 'テキスト ファイルを編集する。',
};

// getAppById が解決できる全アプリ (ミニアプリ + Files/Editor)
export const LAUNCHABLES: MiniApp[] = [...MINI_APPS, FILES_APP, EDITOR_APP];

export function getAppById(id: string): MiniApp | undefined {
  return LAUNCHABLES.find((app) => app.id === id);
}
