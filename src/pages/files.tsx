import type React from 'react';
import type {ReactNode} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Translate, {translate} from '@docusaurus/Translate';
import {FolderIcon, FileIcon} from '@site/src/components/desktop/apps';
import {EntryGlyph, EntryLabel} from '@site/src/components/desktop/entryView';
import {RenameInput} from '@site/src/components/desktop/RenameInput';
import {ContextMenu} from '@site/src/components/desktop/ContextMenu';
import type {ContextMenuItem} from '@site/src/components/desktop/ContextMenu';
import type {SelectModifiers} from '@site/src/components/desktop/DesktopIcon';
import * as vfs from '@site/src/lib/desktop/vfs';
import type {VfsEntry} from '@site/src/lib/desktop/vfs';
import {downloadTextFile, importDroppedFiles} from '@site/src/lib/desktop/fileTransfer';
import {VFS_ITEM_MIME, readVfsItemDrag} from '@site/src/lib/desktop/dragDrop';
import styles from './files.module.css';

// 親デスクトップへ送るメッセージの共通ソース タグ
const BRIDGE_SOURCE = 'hikari-desktop';
const MARQUEE_THRESHOLD = 4;

type MarqueeRect = {x0: number; y0: number; x1: number; y1: number};

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

type Menu = {x: number; y: number; entry: VfsEntry | null};

function FilesApp(): ReactNode {
  const [path, setPath] = useState<string>(initialPath);
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [anchorPath, setAnchorPath] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const entryRefs = useRef(new Map<string, HTMLButtonElement>());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [address, setAddress] = useState<string>(initialPath);
  const [osDragOver, setOsDragOver] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback((p: string) => {
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
    setAddress(path);
    const unsub = vfs.subscribe(() => refresh(pathRef.current));
    return unsub;
  }, [path, refresh]);

  // ドロップ先の要素 (フォルダー項目など) が stopPropagation しても、
  // ドラッグ中のハイライトは必ず解除されるよう capture フェーズで監視する
  useEffect(() => {
    const onDropOrEnd = () => setOsDragOver(false);
    window.addEventListener('drop', onDropOrEnd, true);
    window.addEventListener('dragend', onDropOrEnd, true);
    return () => {
      window.removeEventListener('drop', onDropOrEnd, true);
      window.removeEventListener('dragend', onDropOrEnd, true);
    };
  }, []);

  const navigate = (p: string) => {
    setSelectedPaths(new Set());
    setAnchorPath(null);
    setRenaming(null);
    setMenu(null);
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

  // ---- パス入力バー ----
  const submitAddress = () => {
    const target = vfs.normalizePath(address);
    const node = vfs.stat(target);
    if (target === '/' || (node && node.type === 'folder')) {
      navigate(target);
    } else if (node && node.type === 'file') {
      openEntry({path: target, name: vfs.basename(target), node});
      setAddress(path);
    } else {
      // 存在しないパスは元に戻す
      setAddress(path);
    }
  };

  // ---- 作成 / リネーム / 削除 ----
  const newFolder = () => {
    const p = vfs.uniqueChildPath(
      path,
      translate({id: 'files.newFolderName', message: '新しいフォルダー'}),
    );
    vfs.mkdir(p);
    setSelectedPaths(new Set([p]));
    setAnchorPath(p);
    setRenaming(p);
  };

  const newFile = () => {
    const p = vfs.uniqueChildPath(
      path,
      translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
    );
    vfs.createFile(p, '');
    setSelectedPaths(new Set([p]));
    setAnchorPath(p);
    setRenaming(p);
  };

  const commitRename = (entry: VfsEntry, name: string) => {
    const newPath = vfs.rename(entry.path, name);
    setRenaming(null);
    if (newPath) {
      setSelectedPaths(new Set([newPath]));
      setAnchorPath(newPath);
    }
  };

  const doDelete = (paths: string[]) => {
    paths.forEach((p) => vfs.remove(p));
    setSelectedPaths(new Set());
    setAnchorPath(null);
    setRenaming(null);
  };

  const downloadFile = (entry: VfsEntry) => {
    const content = vfs.readFile(entry.path);
    if (content !== null) {
      downloadTextFile(entry.name, content);
    }
  };

  // ---- ドラッグ&ドロップでの移動 (デスクトップ/他の Files ウィンドウとの間も含む) ----
  const moveItemInto = (sourcePath: string, targetDir: string) => {
    if (sourcePath === targetDir) {
      return;
    }
    vfs.move(sourcePath, targetDir);
  };

  // ---- 選択 (Ctrl 複数選択 / Shift 範囲選択) ----
  const selectWith = (path: string, mods: SelectModifiers) => {
    if (mods.shiftKey && anchorPath) {
      const order = entries.map((entry) => entry.path);
      const ai = order.indexOf(anchorPath);
      const pi = order.indexOf(path);
      if (ai !== -1 && pi !== -1) {
        const [lo, hi] = ai < pi ? [ai, pi] : [pi, ai];
        setSelectedPaths(new Set(order.slice(lo, hi + 1)));
        return;
      }
    }
    if (mods.ctrlKey || mods.metaKey) {
      setSelectedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
      setAnchorPath(path);
      return;
    }
    setSelectedPaths(new Set([path]));
    setAnchorPath(path);
  };

  // ---- 矩形 (ラバーバンド) 選択 ----
  const onBodyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) {
      return;
    }
    const additive = e.ctrlKey || e.metaKey;
    const baseSelection = additive ? new Set(selectedPaths) : new Set<string>();
    const startX = e.clientX;
    const startY = e.clientY;
    const el = e.currentTarget;
    let moved = false;
    el.setPointerCapture(e.pointerId);
    if (!additive) {
      setSelectedPaths(new Set());
      setAnchorPath(null);
    }

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= MARQUEE_THRESHOLD) {
        return;
      }
      moved = true;
      const rect: MarqueeRect = {
        x0: Math.min(startX, ev.clientX),
        y0: Math.min(startY, ev.clientY),
        x1: Math.max(startX, ev.clientX),
        y1: Math.max(startY, ev.clientY),
      };
      setMarquee(rect);
      const hit = new Set(baseSelection);
      entryRefs.current.forEach((entryEl, p) => {
        const r = entryEl.getBoundingClientRect();
        if (r.left < rect.x1 && r.right > rect.x0 && r.top < rect.y1 && r.bottom > rect.y0) {
          hit.add(p);
        }
      });
      setSelectedPaths(hit);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      setMarquee(null);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end, {once: true});
    el.addEventListener('pointercancel', end, {once: true});
  };

  // ---- コンテキスト メニュー ----
  const openMenu = (e: React.MouseEvent, entry: VfsEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (entry && !selectedPaths.has(entry.path)) {
      setSelectedPaths(new Set([entry.path]));
      setAnchorPath(entry.path);
    }
    setMenu({x: e.clientX, y: e.clientY, entry});
  };

  const menuItems = (m: Menu): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        type: 'item',
        label: <Translate id="files.newFolder">新しいフォルダー</Translate>,
        onClick: newFolder,
      },
      {
        type: 'item',
        label: <Translate id="files.newFile">新しいファイル</Translate>,
        onClick: newFile,
      },
    ];
    if (m.entry) {
      const entry = m.entry;
      const targets =
        selectedPaths.size > 1 && selectedPaths.has(entry.path)
          ? entries.filter((e) => selectedPaths.has(e.path))
          : [entry];
      items.push({type: 'separator'});
      if (targets.length === 1) {
        items.push(
          {
            type: 'item',
            label: <Translate id="files.open">開く</Translate>,
            onClick: () => openEntry(targets[0]),
          },
          {
            type: 'item',
            label: <Translate id="files.rename">名前の変更</Translate>,
            onClick: () => setRenaming(targets[0].path),
          },
        );
        if (targets[0].node.type === 'file') {
          items.push({
            type: 'item',
            label: <Translate id="files.download">ダウンロード</Translate>,
            onClick: () => downloadFile(targets[0]),
          });
        }
      }
      items.push({
        type: 'item',
        danger: true,
        label: <Translate id="files.delete">削除</Translate>,
        onClick: () => doDelete(targets.map((t) => t.path)),
      });
    }
    return items;
  };

  const canGoUp = vfs.normalizePath(path) !== '/';

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
        <input
          className={styles.addressBar}
          value={address}
          spellCheck={false}
          autoComplete="off"
          aria-label={translate({id: 'files.pathLabel', message: 'パス'})}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitAddress();
            } else if (e.key === 'Escape') {
              setAddress(path);
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={() => setAddress(path)}
        />
        <button type="button" className={styles.toolBtn} onClick={newFolder}>
          <FolderIcon />
          <span className={styles.toolBtnLabel}>
            <Translate id="files.newFolder">新しいフォルダー</Translate>
          </span>
        </button>
        <button type="button" className={styles.toolBtn} onClick={newFile}>
          <FileIcon />
          <span className={styles.toolBtnLabel}>
            <Translate id="files.newFile">新しいファイル</Translate>
          </span>
        </button>
      </div>

      <div
        className={osDragOver ? `${styles.body} ${styles.bodyDropActive}` : styles.body}
        onPointerDown={onBodyPointerDown}
        onContextMenu={(e) => openMenu(e, null)}
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes('Files') ||
            e.dataTransfer.types.includes(VFS_ITEM_MIME)
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.dataTransfer.types.includes(VFS_ITEM_MIME)
              ? 'move'
              : 'copy';
            setOsDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.target === e.currentTarget) {
            setOsDragOver(false);
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes(VFS_ITEM_MIME)) {
            e.preventDefault();
            const dragged = readVfsItemDrag(e.dataTransfer);
            if (dragged) {
              moveItemInto(dragged.path, path);
            }
          } else if (e.dataTransfer.files.length > 0) {
            e.preventDefault();
            void importDroppedFiles(e.dataTransfer.files, path);
          }
          setOsDragOver(false);
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
                  ref={(el) => {
                    if (el) {
                      entryRefs.current.set(entry.path, el);
                    } else {
                      entryRefs.current.delete(entry.path);
                    }
                  }}
                  className={
                    selectedPaths.has(entry.path)
                      ? `${styles.entry} ${styles.entrySelected}`
                      : styles.entry
                  }
                  draggable={renaming !== entry.path}
                  onDragStart={(e) => {
                    if (renaming === entry.path) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData(
                      VFS_ITEM_MIME,
                      JSON.stringify({path: entry.path, offsetX: 0, offsetY: 0}),
                    );
                  }}
                  onDragOver={(e) => {
                    if (
                      entry.node.type === 'folder' &&
                      e.dataTransfer.types.includes(VFS_ITEM_MIME)
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(e) => {
                    if (
                      entry.node.type !== 'folder' ||
                      !e.dataTransfer.types.includes(VFS_ITEM_MIME)
                    ) {
                      return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    const dragged = readVfsItemDrag(e.dataTransfer);
                    if (dragged) {
                      moveItemInto(dragged.path, entry.path);
                    }
                  }}
                  onClick={(e) =>
                    selectWith(entry.path, {
                      ctrlKey: e.ctrlKey,
                      metaKey: e.metaKey,
                      shiftKey: e.shiftKey,
                    })
                  }
                  onDoubleClick={() => openEntry(entry)}
                  onContextMenu={(e) => openMenu(e, entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renaming !== entry.path) {
                      openEntry(entry);
                    }
                  }}
                >
                  <span className={styles.entryGlyph}>
                    <EntryGlyph entry={entry} />
                  </span>
                  {renaming === entry.path ? (
                    <RenameInput
                      className={styles.renameInput}
                      initial={entry.name}
                      onCommit={(name) => commitRename(entry, name)}
                      onCancel={() => setRenaming(null)}
                    />
                  ) : (
                    <span className={styles.entryLabel}>
                      <EntryLabel entry={entry} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {marquee && (
          <div
            className={styles.marquee}
            style={{
              left: marquee.x0,
              top: marquee.y0,
              width: marquee.x1 - marquee.x0,
              height: marquee.y1 - marquee.y0,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusCount}>
          <Translate id="files.itemCount" values={{count: entries.length}}>
            {'{count} 個の項目'}
          </Translate>
        </span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu)}
          onClose={() => setMenu(null)}
        />
      )}
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
