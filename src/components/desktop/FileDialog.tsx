import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import {FolderIcon, FileIcon} from './apps';
import * as vfs from '../../lib/desktop/vfs';
import type {VfsEntry} from '../../lib/desktop/vfs';
import styles from './FileDialog.module.css';

export type FileDialogMode = 'open' | 'save';

type Props = {
  mode: FileDialogMode;
  initialDir: string;
  suggestedName?: string;
  onConfirm: (path: string) => void;
  onCancel: () => void;
};

/**
 * ファイルを開く/名前を付けて保存するためのモーダル ダイアログ。
 * VFS 上のフォルダーを readDir でたどり、ファイルを選択 (open) するか
 * 保存先フォルダー + ファイル名を指定 (save) して確定する。
 */
export function FileDialog({mode, initialDir, suggestedName, onConfirm, onCancel}: Props): ReactNode {
  const [dir, setDir] = useState<string>(() => {
    const node = vfs.stat(initialDir);
    return node && node.type === 'folder' ? vfs.normalizePath(initialDir) : vfs.DESKTOP_PATH;
  });
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [name, setName] = useState<string>(suggestedName ?? '');
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = (d: string) => setEntries(vfs.readDir(d));

  useEffect(() => {
    refresh(dir);
    const unsub = vfs.subscribe(() => refresh(dir));
    return unsub;
  }, [dir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const navigate = (d: string) => {
    setDir(vfs.normalizePath(d));
    setSelected(null);
  };

  const chooseFile = (entry: VfsEntry) => {
    setSelected(entry.path);
    if (mode === 'save') {
      setName(entry.name);
    }
  };

  const confirm = () => {
    if (mode === 'open') {
      if (selected) {
        onConfirm(selected);
      }
      return;
    }
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(vfs.joinPath(dir, trimmed));
    }
  };

  const newFolder = () => {
    const p = vfs.uniqueChildPath(
      dir,
      translate({id: 'files.newFolderName', message: '新しいフォルダー'}),
    );
    vfs.mkdir(p);
    refresh(dir);
  };

  const canGoUp = vfs.normalizePath(dir) !== '/';
  const canConfirm = mode === 'open' ? selected !== null : name.trim().length > 0;
  const listEntries = entries.filter((e) => e.node.type !== 'link');

  return (
    <div className={styles.backdrop} onPointerDown={onCancel}>
      <div
        className={styles.panel}
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          {mode === 'open' ? (
            <Translate id="editor.dialog.openTitle">ファイルを開く</Translate>
          ) : (
            <Translate id="editor.dialog.saveTitle">名前を付けて保存</Translate>
          )}
        </div>

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.toolBtn}
            disabled={!canGoUp}
            onClick={() => navigate(vfs.parentPath(dir))}
            title={translate({id: 'files.up', message: '上へ'})}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 19V6M6 12l6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className={styles.path}>{dir}</span>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={newFolder}
            title={translate({id: 'files.newFolder', message: '新しいフォルダー'})}
          >
            <FolderIcon />
          </button>
        </div>

        <div className={styles.list}>
          {listEntries.length === 0 ? (
            <p className={styles.empty}>
              <Translate id="files.empty">このフォルダーは空です。</Translate>
            </p>
          ) : (
            <ul className={styles.grid}>
              {listEntries.map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    className={
                      selected === entry.path ? `${styles.entry} ${styles.entrySelected}` : styles.entry
                    }
                    onClick={() =>
                      entry.node.type === 'folder' ? navigate(entry.path) : chooseFile(entry)
                    }
                    onDoubleClick={() =>
                      entry.node.type === 'folder' ? navigate(entry.path) : onConfirm(entry.path)
                    }
                  >
                    <span className={styles.entryGlyph}>
                      {entry.node.type === 'folder' ? <FolderIcon /> : <FileIcon />}
                    </span>
                    <span className={styles.entryLabel}>{entry.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {mode === 'save' && (
          <div className={styles.nameRow}>
            <label className={styles.nameLabel} htmlFor="file-dialog-name">
              <Translate id="editor.dialog.fileName">ファイル名:</Translate>
            </label>
            <input
              id="file-dialog-name"
              className={styles.nameInput}
              value={name}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirm();
                }
              }}
            />
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            <Translate id="editor.dialog.cancel">キャンセル</Translate>
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            disabled={!canConfirm}
            onClick={confirm}
          >
            {mode === 'open' ? (
              <Translate id="editor.dialog.confirmOpen">開く</Translate>
            ) : (
              <Translate id="editor.dialog.confirmSave">保存</Translate>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
