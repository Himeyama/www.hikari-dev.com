import type {ReactNode} from 'react';
import {useCallback, useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Translate, {translate} from '@docusaurus/Translate';
import {getAppById, FolderIcon, FileIcon} from '@site/src/components/desktop/apps';
import * as vfs from '@site/src/lib/desktop/vfs';
import type {VfsEntry} from '@site/src/lib/desktop/vfs';
import styles from './files.module.css';

// 親デスクトップへ送るメッセージの共通ソース タグ
const BRIDGE_SOURCE = 'hikari-desktop';

/** iframe (デスクトップ) 内で動いているか */
function inDesktop(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

function initialPath(): string {
  if (typeof window === 'undefined') {
    return vfs.DESKTOP_PATH;
  }
  const p = new URLSearchParams(window.location.search).get('path');
  return p ? vfs.normalizePath(p) : vfs.DESKTOP_PATH;
}

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

/** エントリのアイコンを種別に応じて描画する */
function EntryGlyph({entry}: {entry: VfsEntry}): ReactNode {
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
  return <FileIcon />;
}

/** エントリの表示ラベル (link はアプリ名を i18n 表示) */
function EntryLabel({entry}: {entry: VfsEntry}): ReactNode {
  if (entry.node.type === 'link' && entry.node.appId) {
    const app = getAppById(entry.node.appId);
    if (app) {
      return <Translate id={app.titleId}>{app.titleMessage}</Translate>;
    }
  }
  return <>{entry.name}</>;
}

function FilesApp(): ReactNode {
  const [path, setPath] = useState<string>(initialPath);
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback((p: string) => {
    // パスが存在しなければ Desktop にフォールバック
    const target = vfs.exists(p) || p === '/' ? p : vfs.DESKTOP_PATH;
    setEntries(vfs.readDir(target));
    if (target !== p) {
      setPath(target);
    }
  }, []);

  // 初期化 + VFS 変更購読
  useEffect(() => {
    vfs.ensureSeeded();
    refresh(path);
    const unsub = vfs.subscribe(() => refresh(path));
    return unsub;
  }, [path, refresh]);

  const navigate = (p: string) => {
    setSelected(null);
    setPath(vfs.normalizePath(p));
  };

  const openEntry = (entry: VfsEntry) => {
    const {node} = entry;
    if (node.type === 'folder') {
      navigate(entry.path);
      return;
    }
    if (node.type === 'link' && node.href) {
      if (inDesktop() && node.appId) {
        window.parent.postMessage(
          {source: BRIDGE_SOURCE, type: 'open-app', appId: node.appId},
          '*',
        );
      } else {
        window.location.href = node.href;
      }
      return;
    }
    if (node.type === 'file') {
      if (inDesktop()) {
        window.parent.postMessage(
          {source: BRIDGE_SOURCE, type: 'open-editor', path: entry.path},
          '*',
        );
      } else {
        window.location.href = `/editor?path=${encodeURIComponent(entry.path)}`;
      }
    }
  };

  const onNewFolder = () => {
    const p = vfs.uniqueChildPath(
      path,
      translate({id: 'files.newFolderName', message: '新しいフォルダー'}),
    );
    vfs.mkdir(p);
    setSelected(p);
  };

  const onNewFile = () => {
    const p = vfs.uniqueChildPath(
      path,
      translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
    );
    vfs.createFile(p, '');
    setSelected(p);
  };

  const onRename = (entry: VfsEntry) => {
    const next = window.prompt(
      translate({id: 'files.renamePrompt', message: '新しい名前を入力してください。'}),
      entry.name,
    );
    if (next && next.trim() && next !== entry.name) {
      const newPath = vfs.rename(entry.path, next.trim());
      if (newPath) {
        setSelected(newPath);
      }
    }
  };

  const onDelete = (entry: VfsEntry) => {
    const ok = window.confirm(
      translate(
        {id: 'files.deleteConfirm', message: '「{name}」を削除しますか?'},
        {name: entry.name},
      ),
    );
    if (ok) {
      vfs.remove(entry.path);
      setSelected(null);
    }
  };

  // パンくず用のセグメント
  const segments: {label: string; path: string}[] = [];
  {
    const norm = vfs.normalizePath(path);
    const parts = norm === '/' ? [] : norm.slice(1).split('/');
    let acc = '';
    segments.push({label: '/', path: '/'});
    for (const part of parts) {
      acc += '/' + part;
      segments.push({label: part, path: acc});
    }
  }

  const canGoUp = vfs.normalizePath(path) !== '/';
  const selectedEntry = entries.find((e) => e.path === selected) ?? null;

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolBtn}
          disabled={!canGoUp}
          onClick={() => navigate(vfs.parentPath(path))}
          title={translate({id: 'files.up', message: '上へ'})}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V6M6 12l6-6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <nav className={styles.breadcrumb} aria-label="path">
          {segments.map((seg, i) => (
            <span key={seg.path} className={styles.crumbItem}>
              {i > 0 && <span className={styles.crumbSep}>/</span>}
              <button type="button" className={styles.crumb} onClick={() => navigate(seg.path)}>
                {seg.label === '/' ? (
                  <Translate id="files.root">ルート</Translate>
                ) : (
                  seg.label
                )}
              </button>
            </span>
          ))}
        </nav>
        <div className={styles.toolbarSpacer} />
        <button type="button" className={styles.toolBtn} onClick={onNewFolder}>
          <FolderIcon />
          <span className={styles.toolBtnLabel}>
            <Translate id="files.newFolder">新しいフォルダー</Translate>
          </span>
        </button>
        <button type="button" className={styles.toolBtn} onClick={onNewFile}>
          <FileIcon />
          <span className={styles.toolBtnLabel}>
            <Translate id="files.newFile">新しいファイル</Translate>
          </span>
        </button>
      </div>

      <div
        className={styles.body}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setSelected(null);
          }
        }}
      >
        {entries.length === 0 ? (
          <p className={styles.empty}>
            <Translate id="files.empty">このフォルダーは空です。</Translate>
          </p>
        ) : (
          <ul className={styles.grid}>
            {entries.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className={
                    entry.path === selected
                      ? `${styles.entry} ${styles.entrySelected}`
                      : styles.entry
                  }
                  onClick={() => setSelected(entry.path)}
                  onDoubleClick={() => openEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      openEntry(entry);
                    }
                  }}
                >
                  <span className={styles.entryGlyph}>
                    <EntryGlyph entry={entry} />
                  </span>
                  <span className={styles.entryLabel}>
                    <EntryLabel entry={entry} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusCount}>
          <Translate
            id="files.itemCount"
            values={{count: entries.length}}
          >
            {'{count} 個の項目'}
          </Translate>
        </span>
        <div className={styles.toolbarSpacer} />
        {selectedEntry && (
          <>
            <button
              type="button"
              className={styles.statusBtn}
              onClick={() => onRename(selectedEntry)}
            >
              <Translate id="files.rename">名前の変更</Translate>
            </button>
            <button
              type="button"
              className={`${styles.statusBtn} ${styles.statusBtnDanger}`}
              onClick={() => onDelete(selectedEntry)}
            >
              <Translate id="files.delete">削除</Translate>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function FilesPage(): ReactNode {
  return (
    <Layout
      noFooter
      title={translate({id: 'miniApps.files.title', message: 'ファイル'})}
      description={translate({
        id: 'miniApps.files.description',
        message: '仮想ファイルシステムを閲覧・操作するファイル エクスプローラー。',
      })}
    >
      <BrowserOnly>{() => <FilesApp />}</BrowserOnly>
    </Layout>
  );
}
