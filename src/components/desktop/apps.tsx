import type {ReactNode} from 'react';
import {createUtilityIcon} from './UtilityIcon';

const ImageIcon = createUtilityIcon(0);

const NightscapeIcon = createUtilityIcon(1);

const SwapIcon = createUtilityIcon(2);

const CodeIcon = createUtilityIcon(3);

const Base64Icon = createUtilityIcon(4);

const QrIcon = createUtilityIcon(7);

const UuidIcon = createUtilityIcon(8);

const LockIcon = createUtilityIcon(9);

const ChatIcon = createUtilityIcon(0, 'windows-98-desktop.png', 26);

const HashIcon = createUtilityIcon(5);

const CertIcon = createUtilityIcon(6);

const TableIcon = createUtilityIcon(10);

const GlobeIcon = createUtilityIcon(11);

const ServerIcon = createUtilityIcon(12);

const SigmaIcon = createUtilityIcon(14);

const GpuIcon = createUtilityIcon(15);

const DocIcon = createUtilityIcon(13);

const FolderIcon = createUtilityIcon(1, 'windows-98-desktop.png', 26);

function FileIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M14 3v4h4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
      <path d="M8 12h8M8 15.5h6" stroke="#60A5FA" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const EditorIcon = createUtilityIcon(2, 'windows-98-desktop.png', 26);

function ImageFileIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M14 3v4h4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
      <rect x="8" y="11" width="8" height="7" rx="1" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="1" />
      <circle cx="10.3" cy="13.3" r="0.9" fill="#3B82F6" />
      <path d="M8.4 17l2.4-2.4a1 1 0 011.4 0L15.6 18" stroke="#3B82F6" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoFileIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M14 3v4h4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="12" cy="14.5" r="4" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1" />
      <path d="M11 12.8l2.6 1.7-2.6 1.7v-3.4z" fill="#8B5CF6" />
    </svg>
  );
}

function AudioFileIcon(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6V3z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M14 3v4h4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" strokeLinejoin="round" />
      <path d="M15 11l-4 1v4.6" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.8" cy="17" r="1.5" fill="#10B981" />
      <circle cx="13.8" cy="16" r="1.5" fill="#10B981" />
      <path d="M15 11v5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const ViewerIcon = createUtilityIcon(3, 'windows-98-desktop.png', 26);

export {FolderIcon, FileIcon, ImageFileIcon, VideoFileIcon, AudioFileIcon};

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
    href: '/nightscape-filter',
    Icon: NightscapeIcon,
    titleId: 'miniApps.nightscape.title',
    titleMessage: '夜景美化フィルター',
    descriptionId: 'miniApps.nightscape.description',
    descriptionMessage: '夜景写真の黒を引き締め、光源を美しく強調する。',
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
    href: '/qr-code',
    Icon: QrIcon,
    titleId: 'miniApps.qrCode.title',
    titleMessage: 'QR コード生成',
    descriptionId: 'miniApps.qrCode.description',
    descriptionMessage: 'テキストやファイルを QR コードに変換する。',
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
    href: '/vram-calculator',
    Icon: GpuIcon,
    titleId: 'miniApps.vramCalculator.title',
    titleMessage: 'LLM VRAM 使用量計算',
    descriptionId: 'miniApps.vramCalculator.description',
    descriptionMessage: 'パラメータ数と量子化方式から必要な VRAM 容量を概算する。',
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
// Files はデスクトップにシード表示され、Editor と Viewer は folder/file から間接起動される。
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

export const VIEWER_APP: MiniApp = {
  id: 'viewer',
  href: '/viewer',
  Icon: ViewerIcon,
  titleId: 'miniApps.viewer.title',
  titleMessage: 'ビューア',
  descriptionId: 'miniApps.viewer.description',
  descriptionMessage: '画像・動画・音声ファイルを表示する。',
};

// getAppById が解決できる全アプリ (ミニアプリ + Files/Editor/Viewer)
export const LAUNCHABLES: MiniApp[] = [...MINI_APPS, FILES_APP, EDITOR_APP, VIEWER_APP];

export function getAppById(id: string): MiniApp | undefined {
  return LAUNCHABLES.find((app) => app.id === id);
}
