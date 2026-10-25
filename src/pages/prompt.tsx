import {useEffect, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import {PromptShell, type ShellMessages} from '../lib/desktop/promptShell';
import '@xterm/xterm/css/xterm.css';
import styles from './prompt.module.css';
import PromptWorkspace from '../components/desktop/PromptWorkspace';
import type {IMarker} from '@xterm/xterm';

function PromptApp(): ReactNode {
  const container = useRef<HTMLDivElement>(null);
  const scrollRail = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    async function start() {
      const [{Terminal}, {FitAddon}] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]);
      if (disposed || !container.current) return;
      const messages: ShellMessages = {
        missing: translate({id: 'prompt.error.missing', message: 'ファイルまたはディレクトリが存在しない'}),
        directory: translate({id: 'prompt.error.directory', message: 'ディレクトリの種類または再帰オプションを確認すること'}),
        file: translate({id: 'prompt.error.file', message: 'テキスト ファイルが必要である'}),
        exists: translate({id: 'prompt.error.exists', message: '同名のファイルまたはディレクトリが存在する'}),
        arguments: translate({id: 'prompt.error.arguments', message: '引数が不足しているか、形式が正しくない'}),
        syntax: translate({id: 'prompt.error.syntax', message: '引用符または演算子の構文が正しくない'}),
        unknown: translate({id: 'prompt.error.unknown', message: 'コマンドが見つからない。help で一覧を確認できる'}),
        unsupported: translate({id: 'prompt.error.unsupported', message: 'この操作には対応していない'}),
        protected: translate({id: 'prompt.error.protected', message: 'ルート、現在のディレクトリ、自分自身の配下への操作はできない'}),
        empty: translate({id: 'prompt.error.empty', message: 'ディレクトリが空ではない'}),
      };
      const help = translate({id: 'prompt.help', message: 'ブラウザ内の Unix 風シェル。ファイルとエディタで使う仮想ファイルを共有する。\nファイル操作: ls [-al], cd, mkdir [-p], touch, cat, cp [-r], mv, rm [-rf], rmdir, tree, find [path] [-name pattern] [-type f|d]\nテキスト処理: grep [-ivnc], head/tail [-n count], wc [-lwc], sort [-nru], uniq [-cd], cut -d delimiter -f 1,2, tr [-d] set1 [set2]\nパイプ: |、リダイレクト: > / >> / <、連続実行: ;、引用符: 単一 / 二重、ワイルドカード: * / ?\n↑↓: 履歴、Tab: 補完、←→ / Home / End: 編集、Ctrl+C: 入力の中止、Ctrl+L: 画面の消去\n例: echo "hello world" > hello.txt; cat hello.txt | tr a-z A-Z\n実際の OS のコマンド、ネットワーク接続、パッケージのインストールには対応していない。cp はテキスト ファイルとフォルダーに対応する。'});
      const optionsHelp = translate({id: 'prompt.optionsHelp', message: 'アプリ起動: ./base64、./chat など (Tab で補完)\n表示: ls -alh --color=auto、ls -ltr、ls -R、cat -n/-b/-s/-A\n出力: echo -e "hello\\nworld"、echo -ne "hello\\tworld"、echo -E\n検索: grep -E/-F/-w/-x/-o、集計: wc -l/-w/-c/-m/-L\n先頭・末尾: head/tail -n 5、-n5、--lines=5、-c 10\n並べ替え: sort -n/-r/-u/-f/-b。-- 以降はファイル名として扱う。'});
      const shell = new PromptShell(messages, help + '\n\n' + optionsHelp, appId => {
        window.parent.postMessage({source: 'hikari-desktop', type: 'open-app', appId}, window.location.origin);
      });
      const term = new Terminal({
        fontFamily: '"MS Gothic", "ＭＳ ゴシック", monospace', fontSize: 16,
        cursorBlink: true, cursorStyle: 'block', scrollback: 3000, convertEol: true,
        theme: {background: '#0c0c0c', foreground: '#cccccc', cursor: '#cccccc', selectionBackground: '#ffffff55'},
        screenReaderMode: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container.current);
      // Disable the site's textarea styling inside xterm's hidden input.
      const textarea = container.current.querySelector('textarea');
      textarea?.setAttribute('aria-label', translate({id: 'prompt.input', message: 'コマンド入力'}));
      let input: string[] = [], cursor = 0, historyIndex = 0, draft = '';
      let anchor = 0;
      let promptMarker: IMarker | undefined;
      const safe = (text: string) => text.replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
      const safeOutput = (text: string) => text.replace(/\x1b\[[0-9;]*m|[\x00-\x07\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, match => /^\x1b\[/.test(match) ? match : '');
      const prompt = () => {
        term.write('', () => {
          promptMarker?.dispose();
          promptMarker = term.registerMarker(0);
          anchor = term.buffer.active.baseY + term.buffer.active.cursorY;
          term.write(safe(shell.prompt));
        });
        input = []; cursor = 0; historyIndex = shell.history.length;
      };
      // Redraw relative to the actual buffer position, including wrapped lines and wide characters.
      const redraw = () => {
        term.write('', () => {
          if (disposed) return;
          if (promptMarker && !promptMarker.isDisposed) anchor = promptMarker.line;
          const row = term.buffer.active.baseY + term.buffer.active.cursorY;
          term.write(`\r${row > anchor ? `\x1b[${row - anchor}A` : ''}\x1b[J${safe(shell.prompt)}${input.join('')}`);
          const suffix = input.slice(cursor).join('');
          if (suffix) {
            // Move by terminal cell widths instead of UTF-16 code units.
            term.write('', () => {
              const end = term.buffer.active;
              const width = [...suffix].reduce((n, c) => n + (/\p{Mark}/u.test(c) ? 0 : /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6]|\p{Extended_Pictographic}/u.test(c) ? 2 : 1), 0);
              const position = (end.baseY + end.cursorY - anchor) * term.cols + end.cursorX - width;
              const targetRow = anchor + Math.floor(position / term.cols);
              const up = end.baseY + end.cursorY - targetRow;
              term.write(`\r${up ? `\x1b[${up}A` : ''}${position % term.cols ? `\x1b[${position % term.cols}C` : ''}`);
            });
          }
        });
      };
      prompt();
      const subscription = term.onData(data => {
        // Queue processing after pending terminal writes so prompt anchors remain accurate.
        term.write('', () => {
          if (disposed) return;
          if (data === '\r') {
            term.write('\r\n');
            const result = shell.run(input.join(''));
            if (result.clear) term.clear();
            term.write(safeOutput(result.output) + '\x1b[0m');
            if (result.output && !result.output.endsWith('\n')) term.write('\r\n');
            prompt(); return;
          }
          if (data === '\x03') {term.write('^C\r\n'); prompt(); return;}
          if (data === '\x0c') {term.clear(); anchor = term.buffer.active.baseY + term.buffer.active.cursorY; redraw(); return;}
          if (data === '\x1b[A' || data === '\x1b[B') {
            if (historyIndex === shell.history.length) draft = input.join('');
            historyIndex = Math.max(0, Math.min(shell.history.length, historyIndex + (data.endsWith('A') ? -1 : 1)));
            input = [...(shell.history[historyIndex] ?? draft)]; cursor = input.length;
          } else if (data === '\t') {
            if (cursor !== input.length) return;
            const line = input.join(''), matches = shell.complete(line);
            if (matches.length === 1) {
              const word = line.match(/[^\s]*$/)?.[0] ?? '';
              input = [...(line.slice(0, line.length - word.length) + matches[0].replace(/([\s'"|;<>\\])/g, '\\$1') + (matches[0].endsWith('/') ? '' : ' '))]; cursor = input.length;
            } else if (matches.length > 1) {term.write('\r\n' + safe(matches.join('  ')) + '\r\n'); const saved = input; prompt(); input = saved; cursor = input.length;}
          } else if (data === '\x1b[D') cursor = Math.max(0, cursor - 1);
          else if (data === '\x1b[C') cursor = Math.min(input.length, cursor + 1);
          else if (['\x01', '\x1b[H', '\x1b[1~'].includes(data)) cursor = 0;
          else if (['\x05', '\x1b[F', '\x1b[4~'].includes(data)) cursor = input.length;
          else if (data === '\x7f' || data === '\b') {if (cursor) input.splice(--cursor, 1);}
          else if (data === '\x1b[3~') input.splice(cursor, 1);
          else if (data === '\x15') {input.splice(0, cursor); cursor = 0;}
          else if (!data.startsWith('\x1b')) {
            // Multiline paste is inserted as text; it never runs commands automatically.
            const text = safe(data.replace(/[\r\n\t]+/g, ' '));
            const chars = [...text].slice(0, Math.max(0, 4096 - input.length));
            input.splice(cursor, 0, ...chars); cursor += chars.length;
          } else return;
          redraw();
        });
      });
      const resize = new ResizeObserver(() => {if (container.current?.clientWidth && container.current?.clientHeight) fit.fit();});
      resize.observe(container.current);
      fit.fit(); term.focus();
      const syncScroll = () => {
        const rail = scrollRail.current, content = scrollContent.current;
        if (!rail || !content || !rail.clientHeight) return;
        const unit = rail.clientHeight / term.rows;
        content.style.height = `${term.buffer.active.length * unit}px`;
        rail.scrollTop = term.buffer.active.viewportY * unit;
      };
      const onScroll = () => {
        const rail = scrollRail.current;
        if (rail?.clientHeight) term.scrollToLine(Math.round(rail.scrollTop / (rail.clientHeight / term.rows)));
      };
      scrollRail.current?.addEventListener('scroll', onScroll);
      const scrolled = term.onScroll(syncScroll), rendered = term.onRender(syncScroll);
      syncScroll();
      cleanup = () => {scrollRail.current?.removeEventListener('scroll', onScroll); scrolled.dispose(); rendered.dispose(); resize.disconnect(); subscription.dispose(); term.dispose();};
    }
    void start().catch(() => {if (!disposed) setError(true);});
    return () => {disposed = true; cleanup();};
  }, []);
  return <div className={styles.app}>
    {error && <p role="alert"><Translate id="prompt.loadError">ターミナルを読み込めない。ページを再読み込みすること。</Translate></p>}
    <div className={styles.terminal}>
      <div ref={container} className={styles.terminalHost} />
      <div ref={scrollRail} className={styles.scrollRail} aria-label={translate({id: 'prompt.scrollback', message: 'ターミナルのスクロール'})} tabIndex={0}><div ref={scrollContent} /></div>
    </div>
  </div>;
}

export default function PromptPage(): ReactNode {
  return <Layout noFooter title={translate({id: 'prompt.title', message: 'プロンプト'})} description={translate({id: 'prompt.description', message: 'MS Gothic のターミナルで Unix 風コマンドを使用する。'})}>
    <BrowserOnly>{() => new URLSearchParams(window.location.search).get('embed') === '1' ? <div className="mini-app-98"><PromptApp /></div> : <PromptWorkspace />}</BrowserOnly>
  </Layout>;
}
