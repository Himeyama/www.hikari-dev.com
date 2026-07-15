import type {ReactNode} from 'react';
import {useState, useCallback, useEffect} from 'react';
import {parse as parseYaml, stringify as stringifyYaml} from 'yaml';
import Editor from '@monaco-editor/react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useColorMode} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './yaml-json.module.css';

const SAMPLE_YAML = `title: サンプル記事
tags:
  - Docusaurus
  - TypeScript
draft: false
`;

const EDITOR_OPTIONS = {
  minimap: {enabled: false},
  fontSize: 13,
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  wordWrap: 'on' as const,
};

type Direction = 'yaml-to-json' | 'json-to-yaml';

function convert(input: string, direction: Direction): string {
  if (input.trim() === '') return '';
  if (direction === 'yaml-to-json') {
    const data = parseYaml(input);
    return JSON.stringify(data, null, 2);
  }
  const data = JSON.parse(input);
  return stringifyYaml(data);
}

function YamlJsonEditors(): ReactNode {
  const {colorMode} = useColorMode();
  const [direction, setDirection] = useState<Direction>('yaml-to-json');
  const [source, setSource] = useState(SAMPLE_YAML);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runConvert = useCallback((value: string, dir: Direction) => {
    try {
      setOutput(convert(value, dir));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    runConvert(source, direction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSourceChange = (value: string | undefined) => {
    const nextValue = value ?? '';
    setSource(nextValue);
    runConvert(nextValue, direction);
  };

  const swapDirection = () => {
    const nextDirection: Direction = direction === 'yaml-to-json' ? 'json-to-yaml' : 'yaml-to-json';
    const newSource = output;
    setDirection(nextDirection);
    setSource(newSource);
    runConvert(newSource, nextDirection);
  };

  const copyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sourceLanguage = direction === 'yaml-to-json' ? 'yaml' : 'json';
  const outputLanguage = direction === 'yaml-to-json' ? 'json' : 'yaml';
  const sourceLabel =
    direction === 'yaml-to-json' ? (
      <Translate id="yamlJson.yamlLabel">YAML</Translate>
    ) : (
      <Translate id="yamlJson.jsonLabel">JSON</Translate>
    );
  const outputLabel =
    direction === 'yaml-to-json' ? (
      <Translate id="yamlJson.jsonLabel">JSON</Translate>
    ) : (
      <Translate id="yamlJson.yamlLabel">YAML</Translate>
    );
  const editorTheme = colorMode === 'dark' ? 'vs-dark' : 'light';

  return (
    <>
      <div className={styles.panes}>
        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>{sourceLabel}</span>
          </div>
          <div className={styles.editorWrapper}>
            <Editor
              language={sourceLanguage}
              value={source}
              theme={editorTheme}
              options={EDITOR_OPTIONS}
              onChange={handleSourceChange}
            />
          </div>
        </div>

        <div className={styles.swapCol}>
          <button
            className={styles.swapBtn}
            onClick={swapDirection}
            aria-label={translate({id: 'yamlJson.swap', message: '変換方向を入れ替える'})}
          >
            ⇄
          </button>
        </div>

        <div className={styles.pane}>
          <div className={styles.paneHeader}>
            <span className={styles.paneLabel}>{outputLabel}</span>
            <button className={styles.copyBtn} onClick={copyOutput} disabled={!output}>
              {copied ? (
                <Translate id="yamlJson.copied">コピーしました</Translate>
              ) : (
                <Translate id="yamlJson.copy">コピー</Translate>
              )}
            </button>
          </div>
          <div className={styles.editorWrapper}>
            <Editor
              language={outputLanguage}
              value={output}
              theme={editorTheme}
              options={{...EDITOR_OPTIONS, readOnly: true}}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className={styles.errorText}>
          <Translate id="yamlJson.errorPrefix">変換エラー:</Translate> {error}
        </p>
      )}
    </>
  );
}

export default function YamlJsonPage(): ReactNode {
  return (
    <Layout
      title={translate({id: 'yamlJson.title', message: 'YAML と JSON を相互変換'})}
      description={translate({
        id: 'yamlJson.description',
        message: 'YAML と JSON を相互変換するツール。ブラウザ内で処理されるためサーバーに内容は送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="yamlJson.title">YAML と JSON を相互変換</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="yamlJson.subtitle">
            左側に入力すると右側に変換結果が表示される。変換はすべてブラウザ内で完結し、内容はサーバーに送信されない。
          </Translate>
        </p>

        <BrowserOnly fallback={<div className={styles.editorLoading}>Loading editor...</div>}>
          {() => <YamlJsonEditors />}
        </BrowserOnly>

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="yamlJson.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="yamlJson.note1">
                変換はブラウザ内で完結し、入力内容がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="yamlJson.note2">
                入れ替えボタンで YAML → JSON と JSON → YAML の変換方向を切り替えられる。
              </Translate>
            </li>
            <li>
              <Translate id="yamlJson.note3">
                構文エラーがある場合は変換結果の下にエラー内容が表示される。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
