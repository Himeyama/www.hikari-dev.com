import type {ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import {
  getAppById,
  FolderIcon,
  FileIcon,
  ImageFileIcon,
  VideoFileIcon,
  AudioFileIcon,
} from './apps';
import type {VfsEntry} from '../../lib/desktop/vfs';
import {mediaKindOf} from '../../lib/desktop/mediaTypes';

function LinkGlyph(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 14a3.5 3.5 0 004.9 0l3-3a3.5 3.5 0 00-4.9-4.9l-1.2 1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 10a3.5 3.5 0 00-4.9 0l-3 3a3.5 3.5 0 004.9 4.9l1.2-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** リンク ノードがシード直後 (未リネーム) かどうか */
function isPristineLink(entry: VfsEntry): boolean {
  return (
    entry.node.type === 'link' &&
    !!entry.node.appId &&
    entry.name === entry.node.appId
  );
}

/** エントリのアイコンを種別に応じて描画する */
export function EntryGlyph({entry}: {entry: VfsEntry}): ReactNode {
  if (entry.node.type === 'folder') {
    return <FolderIcon />;
  }
  if (entry.node.type === 'link') {
    const app = entry.node.appId ? getAppById(entry.node.appId) : undefined;
    if (app) {
      return <app.Icon />;
    }
    return <LinkGlyph />;
  }
  switch (mediaKindOf(entry.name)) {
    case 'image':
      return <ImageFileIcon />;
    case 'video':
      return <VideoFileIcon />;
    case 'audio':
      return <AudioFileIcon />;
    default:
      return <FileIcon />;
  }
}

/**
 * エントリの表示ラベル。シード直後のリンクはアプリ名を i18n 表示し、
 * リネーム後 (segment !== appId) はパス末尾セグメントをそのまま表示する。
 */
export function EntryLabel({entry}: {entry: VfsEntry}): ReactNode {
  if (isPristineLink(entry) && entry.node.appId) {
    const app = getAppById(entry.node.appId);
    if (app) {
      return <Translate id={app.titleId}>{app.titleMessage}</Translate>;
    }
  }
  return <>{entry.name}</>;
}
