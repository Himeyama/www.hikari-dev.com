import type React from 'react';
import type {ReactNode} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import * as vfs from '@site/src/lib/desktop/vfs';
import {ContextMenu} from '@site/src/components/desktop/ContextMenu';
import type {ContextMenuItem} from '@site/src/components/desktop/ContextMenu';
import {FileDialog} from '@site/src/components/desktop/FileDialog';
import type {FileDialogMode} from '@site/src/components/desktop/FileDialog';
import {downloadTextFile} from '@site/src/lib/desktop/fileTransfer';
import styles from './editor.module.css';

const BRIDGE_SOURCE = 'hikari-desktop';

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
};

/** 拡張子から Monaco の言語 ID を判定する (パス未確定の新規ドキュメントはプレーンテキスト) */
function languageOf(path: string | null): string {
  if (!path) {
    return 'plaintext';
  }
  const name = vfs.basename(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1) : '';
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'json':
      return 'json';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
    case 'jsx':
      return 'typescript';
    case 'css':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
      return 'xml';
    case 'sh':
    case 'bash':
      return 'shell';
    default:
      return 'plaintext';
  }
}

function initialPath(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const p = new URLSearchParams(window.location.search).get('path');
  return p ? vfs.normalizePath(p) : null;
}

/** iframe (デスクトップ) 内で動いているか */
function inDesktop(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

/** デスクトップ内では親ウィンドウにパス切替を依頼し、単独ページでは直接遷移する */
function gotoPath(target: string): void {
  const norm = vfs.normalizePath(target);
  if (inDesktop()) {
    window.parent.postMessage({source: BRIDGE_SOURCE, type: 'open-editor', path: norm}, '*');
  } else {
    window.location.href = `/editor?path=${encodeURIComponent(norm)}`;
  }
}

const AUTOSAVE_KEY = 'hikari.editor.autosave';
const WORDWRAP_KEY = 'hikari.editor.wordwrap';

function loadAutosave(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(AUTOSAVE_KEY) === '1';
}

function loadWordWrap(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const v = window.localStorage.getItem(WORDWRAP_KEY);
  return v === null ? true : v === '1';
}

type DialogState = {mode: FileDialogMode; initialDir: string; suggestedName?: string};
type MenuState = {kind: 'file' | 'settings'; x: number; y: number};

function EditorApp(): ReactNode {
  const {colorMode} = useColorMode();
  const [path] = useState<string | null>(initialPath);
  const [content, setContent] = useState<string>('');
  const [saved, setSaved] = useState<string>('');
  const [exists, setExists] = useState<boolean>(false);
  const [autosave, setAutosave] = useState<boolean>(loadAutosave);
  const [wordWrap, setWordWrap] = useState<boolean>(loadWordWrap);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // ファイル読み込み (path が無い場合は空の新規ドキュメントとして開始する)
  useEffect(() => {
    vfs.ensureSeeded();
    if (!path) {
      setContent('');
      setSaved('');
      setExists(true);
      return;
    }
    const node = vfs.stat(path);
    if (node && node.type === 'file') {
      const text = node.content ?? '';
      setContent(text);
      setSaved(text);
      setExists(true);
    } else {
      setExists(false);
    }
  }, [path]);

  const dirty = content !== saved;

  // path 未確定 (新規ドキュメント) の場合は名前を付けて保存ダイアログを開く
  const save = useCallback(() => {
    if (!path) {
      setDialog({
        mode: 'save',
        initialDir: vfs.DESKTOP_PATH,
        suggestedName: translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
      });
      return;
    }
    vfs.writeFile(path, contentRef.current);
    setSaved(contentRef.current);
    setExists(true);
  }, [path]);

  // Ctrl+S / Cmd+S で保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // 自動保存 (有効時、変更が止まって 800ms 後に保存。path 未確定の新規ドキュメントでは無効)
  useEffect(() => {
    if (!autosave || !dirty || !path) {
      return;
    }
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [autosave, dirty, path, content, save]);

  const toggleAutosave = () => {
    setAutosave((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(AUTOSAVE_KEY, next ? '1' : '0');
      } catch {
        /* quota 等は無視 */
      }
      if (next && contentRef.current !== saved) {
        save();
      }
      return next;
    });
  };

  const toggleWordWrap = () => {
    setWordWrap((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(WORDWRAP_KEY, next ? '1' : '0');
      } catch {
        /* quota 等は無視 */
      }
      return next;
    });
  };

  // path が指定されているのに実体が無い (削除済み等) 場合のみ案内を表示する。
  // path が未指定の場合は新規ドキュメントとして exists=true になっているのでここには来ない。
  if (!exists && path) {
    return (
      <div className={styles.app}>
        <div className={styles.notice}>
          <Translate id="editor.notFound" values={{name: vfs.basename(path)}}>
            {'「{name}」が見つかりません。'}
          </Translate>
        </div>
      </div>
    );
  }

  // ---- ファイル メニュー操作 (path が無い場合は Desktop フォルダーを既定の起点にする) ----
  const doNew = () => {
    const folder = path ? vfs.parentPath(path) : vfs.DESKTOP_PATH;
    const p = vfs.uniqueChildPath(
      folder,
      translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
    );
    vfs.createFile(p, '');
    gotoPath(p);
  };

  const doOpen = () => {
    setDialog({mode: 'open', initialDir: path ? vfs.parentPath(path) : vfs.DESKTOP_PATH});
  };

  const doSaveAs = () => {
    setDialog({
      mode: 'save',
      initialDir: path ? vfs.parentPath(path) : vfs.DESKTOP_PATH,
      suggestedName: path
        ? vfs.basename(path)
        : translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
    });
  };

  const doDownload = () => {
    const name = path ? vfs.basename(path) : translate({id: 'files.newFileName', message: '新しいファイル.txt'});
    downloadTextFile(name, contentRef.current);
  };

  const handleDialogConfirm = (target: string) => {
    if (!dialog) {
      return;
    }
    if (dialog.mode === 'save') {
      vfs.writeFile(target, contentRef.current);
    }
    setDialog(null);
    gotoPath(target);
  };

  const fileMenuItems: ContextMenuItem[] = [
    {type: 'item', label: <Translate id="editor.new">新規</Translate>, onClick: doNew},
    {type: 'item', label: <Translate id="editor.open">開く...</Translate>, onClick: doOpen},
    {type: 'separator'},
    {
      type: 'item',
      label: <Translate id="editor.save">保存</Translate>,
      disabled: !dirty,
      onClick: save,
    },
    {
      type: 'item',
      label: <Translate id="editor.saveAs">名前を付けて保存...</Translate>,
      onClick: doSaveAs,
    },
    {type: 'separator'},
    {
      type: 'item',
      label: <Translate id="editor.download">ダウンロード</Translate>,
      onClick: doDownload,
    },
  ];

  const settingsMenuItems: ContextMenuItem[] = [
    {
      type: 'item',
      label: (
        <>
          {autosave ? '✓ ' : ''}
          <Translate id="editor.autosave">自動保存</Translate>
        </>
      ),
      onClick: toggleAutosave,
    },
    {
      type: 'item',
      label: (
        <>
          {wordWrap ? '✓ ' : ''}
          <Translate id="editor.wordWrap">ワードラップ</Translate>
        </>
      ),
      onClick: toggleWordWrap,
    },
  ];

  const openMenu = (kind: MenuState['kind'], e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({kind, x: rect.left, y: rect.bottom});
  };

  return (
    <div className={styles.app}>
      <div className={styles.menuBar}>
        <button type="button" className={styles.menuBtn} onClick={(e) => openMenu('file', e)}>
          <Translate id="editor.menu.file">ファイル</Translate>
        </button>
        <button type="button" className={styles.menuBtn} onClick={(e) => openMenu('settings', e)}>
          <Translate id="editor.menu.settings">設定</Translate>
        </button>
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.saveBtn}
          disabled={!dirty || (autosave && !!path)}
          onClick={save}
        >
          {dirty && <span className={styles.dirtyDot} aria-hidden="true">●</span>}
          <Translate id="editor.save">保存</Translate>
        </button>
      </div>
      <div className={styles.editorWrap}>
        <Editor
          height="100%"
          language={languageOf(path)}
          theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
          value={content}
          onChange={(v) => setContent(v ?? '')}
          options={{...EDITOR_OPTIONS, wordWrap: wordWrap ? 'on' : 'off'}}
        />
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.kind === 'file' ? fileMenuItems : settingsMenuItems}
          onClose={() => setMenu(null)}
        />
      )}

      {dialog && (
        <FileDialog
          mode={dialog.mode}
          initialDir={dialog.initialDir}
          suggestedName={dialog.suggestedName}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export default function EditorPage(): ReactNode {
  return (
    <Layout
      noFooter
      title={translate({id: 'miniApps.editor.title', message: 'エディタ'})}
      description={translate({
        id: 'miniApps.editor.description',
        message: 'テキスト ファイルを編集する。',
      })}
    >
      <BrowserOnly fallback={<div className={styles.loading}>Loading editor...</div>}>
        {() => <EditorApp />}
      </BrowserOnly>
    </Layout>
  );
}
