import type {ReactNode} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from './tex-preview.module.css';

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
};

const DEFAULT_TEX = String.raw`e^{i\pi} + 1 = 0

\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}

\lim_{x \to 0} \frac{\sin x}{x} = 1`;

const SOURCE_STORAGE_KEY = 'tex-preview-source';
const SOURCE_SAVE_DEBOUNCE_MS = 500;

function loadStoredSource(): string {
  try {
    const stored = localStorage.getItem(SOURCE_STORAGE_KEY);
    return stored && stored.trim() !== '' ? stored : DEFAULT_TEX;
  } catch {
    // localStorage が使用できない環境ではサンプルにフォールバック
    return DEFAULT_TEX;
  }
}

function splitBlocks(source: string): string[] {
  return source.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

function TexPreviewEditor(): ReactNode {
  const {colorMode} = useColorMode();
  const [source, setSource] = useState(loadStoredSource);
  const previewRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => splitBlocks(source), [source]);

  // 入力内容の変更をデバウンスしてブラウザのローカルストレージに自動保存する
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(SOURCE_STORAGE_KEY, source);
      } catch {
        // localStorage が使用できない環境では保存をあきらめる
      }
    }, SOURCE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    container.innerHTML = '';

    if (blocks.length === 0) {
      const empty = document.createElement('p');
      empty.className = styles.previewEmpty;
      empty.textContent = translate({
        id: 'texPreview.previewEmpty',
        message: '数式を入力するとここにプレビューが表示される。',
      });
      container.appendChild(empty);
      return;
    }

    for (const block of blocks) {
      const wrapper = document.createElement('div');
      wrapper.className = styles.previewBlock;
      try {
        katex.render(block, wrapper, {
          throwOnError: true,
          displayMode: true,
        });
      } catch (e) {
        wrapper.classList.add(styles.previewError);
        wrapper.textContent = e instanceof Error ? e.message : String(e);
      }
      container.appendChild(wrapper);
    }
  }, [blocks]);

  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <>
      <div ref={previewRef} className={styles.preview} />

      <div className={styles.editorWrapper}>
        <Editor
          language="plaintext"
          value={source}
          theme={editorTheme}
          options={EDITOR_OPTIONS}
          onChange={(value) => setSource(value ?? '')}
        />
      </div>
    </>
  );
}

export default function TexPreviewPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'texPreview.title', message: 'TeX 数式プレビュー'})}
      description={translate({
        id: 'texPreview.description',
        message: 'TeX 記法の数式をリアルタイムでプレビューするツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="texPreview.title">TeX 数式プレビュー</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="texPreview.subtitle">
            TeX 記法で数式を入力すると、リアルタイムでプレビューが表示される。空行区切りで複数の数式を入力できる。
          </Translate>
        </p>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading editor...</div>}>
          {() => <TexPreviewEditor />}
        </BrowserOnly>

        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="texPreview.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="texPreview.note1">
                数式のレンダリングには KaTeX を使用する。処理はすべてブラウザ内で完結し、入力内容がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="texPreview.note2">
                空行 (改行 2 つ以上) で区切ることで複数の数式をまとめて入力できる。
              </Translate>
            </li>
            <li>
              <Translate id="texPreview.note3">
                構文エラーがある数式はプレビュー内にエラーメッセージとして表示される。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
