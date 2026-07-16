import type {ReactNode} from 'react';
import {useState, useCallback, useEffect} from 'react';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './tsv-to-markdown.module.css';

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
};

const SAMPLE_TSV = `名前\t年齢\t所属
田中\t28\t開発部
鈴木\t34\t営業部
`;

function escapeCell(cell: string): string {
  return cell.replace(/\|/g, '\\|').trim();
}

function convert(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').split('\n').filter((line) => line !== '');
  if (lines.length === 0) return '';

  const rows = lines.map((line) => line.split('\t').map(escapeCell));
  const columnCount = Math.max(...rows.map((row) => row.length));
  const paddedRows = rows.map((row) => {
    const padded = [...row];
    while (padded.length < columnCount) padded.push('');
    return padded;
  });

  const [header, ...body] = paddedRows;
  const headerLine = `| ${header.join(' | ')} |`;
  const separatorLine = `| ${header.map(() => '---').join(' | ')} |`;
  const bodyLines = body.map((row) => `| ${row.join(' | ')} |`);

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function TsvToMarkdownEditors(): ReactNode {
  const {colorMode} = useColorMode();
  const [source, setSource] = useState(SAMPLE_TSV);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const runConvert = useCallback((value: string) => {
    setOutput(convert(value));
  }, []);

  useEffect(() => {
    runConvert(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSourceChange = (value: string | undefined) => {
    const nextValue = value ?? '';
    setSource(nextValue);
    runConvert(nextValue);
  };

  const copyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className={styles.panes}>
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <span className={styles.paneLabel}>
            <Translate id="tsvMarkdown.sourceLabel">Excel / TSV</Translate>
          </span>
        </div>
        <div className={styles.editorWrapper}>
          <Editor
            language="plaintext"
            value={source}
            theme={editorTheme}
            options={EDITOR_OPTIONS}
            onChange={handleSourceChange}
          />
        </div>
      </div>

      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <span className={styles.paneLabel}>
            <Translate id="tsvMarkdown.outputLabel">Markdown</Translate>
          </span>
          <button className={styles.copyBtn} onClick={copyOutput} disabled={!output}>
            {copied ? (
              <Translate id="tsvMarkdown.copied">コピーしました</Translate>
            ) : (
              <Translate id="tsvMarkdown.copy">コピー</Translate>
            )}
          </button>
        </div>
        <div className={styles.editorWrapper}>
          <Editor
            language="markdown"
            value={output}
            theme={editorTheme}
            options={{...EDITOR_OPTIONS, readOnly: true}}
          />
        </div>
      </div>
    </div>
  );
}

export default function TsvToMarkdownPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'tsvMarkdown.title', message: 'TSV→Markdown 表変換'})}
      description={translate({
        id: 'tsvMarkdown.description',
        message: 'Excel からコピーしたタブ区切りテキストを Markdown テーブルに変換するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="tsvMarkdown.title">TSV→Markdown 表変換</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="tsvMarkdown.subtitle">
            Excel からコピーしたセル範囲を左側に貼り付けると、右側に Markdown テーブルが表示される。変換はすべてブラウザ内で完結し、内容はサーバーに送信されない。
          </Translate>
        </p>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading...</div>}>
          {() => <TsvToMarkdownEditors />}
        </BrowserOnly>

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="tsvMarkdown.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="tsvMarkdown.note1">
                Excel やスプレッドシートで選択したセル範囲をコピーし、そのまま貼り付けられる (タブ区切りテキストとして扱われる)。
              </Translate>
            </li>
            <li>
              <Translate id="tsvMarkdown.note2">
                1 行目が見出し行として扱われる。
              </Translate>
            </li>
            <li>
              <Translate id="tsvMarkdown.note3">
                セル内に `|` が含まれる場合は自動的にエスケープされる。
              </Translate>
            </li>
            <li>
              <Translate id="tsvMarkdown.note4">
                変換はブラウザ内で完結し、入力内容がサーバーに送信されることはない。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
