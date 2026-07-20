import type {ReactNode} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import * as vfs from '@site/src/lib/desktop/vfs';
import styles from './editor.module.css';

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
};

/** 拡張子から Monaco の言語 ID を判定する */
function languageOf(path: string): string {
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

const AUTOSAVE_KEY = 'hikari.editor.autosave';

function loadAutosave(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(AUTOSAVE_KEY) === '1';
}

function EditorApp(): ReactNode {
  const {colorMode} = useColorMode();
  const [path] = useState<string | null>(initialPath);
  const [content, setContent] = useState<string>('');
  const [saved, setSaved] = useState<string>('');
  const [exists, setExists] = useState<boolean>(false);
  const [autosave, setAutosave] = useState<boolean>(loadAutosave);
  const contentRef = useRef(content);
  contentRef.current = content;

  // ファイル読み込み
  useEffect(() => {
    if (!path) {
      return;
    }
    vfs.ensureSeeded();
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

  const save = useCallback(() => {
    if (!path) {
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

  // 自動保存 (有効時、変更が止まって 800ms 後に保存)
  useEffect(() => {
    if (!autosave || !dirty) {
      return;
    }
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [autosave, dirty, content, save]);

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

  if (!path) {
    return (
      <div className={styles.app}>
        <div className={styles.notice}>
          <Translate id="editor.noPath">ファイルが指定されていません。</Translate>
        </div>
      </div>
    );
  }

  if (!exists) {
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

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <div className={styles.spacer} />
        <label className={styles.autosave}>
          <span className={styles.autosaveLabel}>
            <Translate id="editor.autosave">自動保存</Translate>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autosave}
            className={autosave ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
            onClick={toggleAutosave}
          >
            <span className={styles.toggleKnob} />
          </button>
        </label>
        <button
          type="button"
          className={styles.saveBtn}
          disabled={!dirty || autosave}
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
          options={EDITOR_OPTIONS}
        />
      </div>
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
