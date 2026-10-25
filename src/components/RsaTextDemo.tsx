import {useEffect, useRef, useState} from 'react';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Translate, {translate} from '@docusaurus/Translate';
import {encryptText, generateTextKeys, OAEP_MAX_BYTES, type TextKeys} from '@site/src/lib/rsa-oaep';
import type {ReactNode} from 'react';
import styles from '@site/src/pages/rsa.module.css';

type FormulaComponent = (props: {tex: string}) => ReactNode;

export default function RsaTextDemo({Formula}: {Formula: FormulaComponent}): ReactNode {
  const [keys, setKeys] = useState<TextKeys | null>(null);
  const [text, setText] = useState(() => translate({id: 'rsa.textExample', message: 'こんにちは、RSA!'}));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof encryptText>> | null>(null);
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const byteLength = new TextEncoder().encode(text).length;
  const tooLong = byteLength > OAEP_MAX_BYTES;
  const current = result?.keys === keys && result.text === text ? result : null;

  async function generate() {
    setError('');
    setKeys(null);
    setResult(null);
    if (!globalThis.crypto?.subtle) {
      setError(translate({id: 'rsa.secureContext', message: 'RSA-OAEP には HTTPS または localhost と Web Crypto API に対応したブラウザが必要である。'}));
      return;
    }
    setGenerating(true);
    try {
      const next = await generateTextKeys();
      if (mounted.current) setKeys(next);
    } catch {
      if (mounted.current) setError(translate({id: 'rsa.keyError', message: '鍵の生成に失敗した。もう一度試すこと。'}));
    } finally {
      if (mounted.current) setGenerating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError('');
    if (!keys || tooLong) return;
    const timer = setTimeout(() => {
      encryptText(keys, text).then((next) => {if (!cancelled) setResult(next);}).catch(() => {
        if (!cancelled) setError(translate({id: 'rsa.textError', message: '暗号化または復号に失敗した。鍵を生成してもう一度試すこと。'}));
      });
    }, 250);
    return () => {cancelled = true; clearTimeout(timer);};
  }, [keys, text, tooLong, revision]);

  return <>
    <section className={styles.section}>
      <Heading as="h2"><Translate id="rsa.textStep1">1. テキスト用の鍵の生成</Translate></Heading>
      <p><Translate id="rsa.textKeyHelp">OAEP (SHA-256、MGF1-SHA-256、空のラベル) を使うため、2048 ビットの RSA 鍵を生成する。手計算用の小さい鍵では、OAEP に必要な領域が足りない。鍵と平文はブラウザ内だけで扱う。</Translate></p>
      <button className="button button--primary" disabled={generating} onClick={generate}>{generating ? <Translate id="rsa.generatingKeys">鍵の生成中...</Translate> : <Translate id="rsa.generateTextKeys">2048 ビット鍵の生成</Translate>}</button>
      {keys && <>
        <Formula tex={String.raw`|n| = 2048\ \mathrm{bits}, \quad e = 65537`} />
        <details><summary><Translate id="rsa.actualKeys">実際の p・q・n・e・d</Translate></summary>
          {(['p', 'q', 'n', 'e', 'd'] as const).map((name) => <Formula key={name} tex={`${name} = ${keys.numbers[name].toString(10)}`} />)}
        </details>
      </>}
      {!keys && !generating && <p><Translate id="rsa.needKeys">鍵を生成すると、入力したテキストの暗号化・復号が自動で行われる。</Translate></p>}
    </section>
    <section className={styles.section}>
      <Heading as="h2"><Translate id="rsa.step2">2. 公開鍵による暗号化</Translate></Heading>
      <label className={styles.textLabel} htmlFor="rsa-text"><Translate id="rsa.textMessage">平文テキスト M</Translate></label>
      <textarea id="rsa-text" className={styles.textarea} rows={3} value={text} onChange={(event) => setText(event.target.value)} aria-invalid={tooLong} aria-describedby="rsa-byte-count" />
      <p id="rsa-byte-count">UTF-8: {byteLength} / {OAEP_MAX_BYTES} <Translate id="rsa.bytes">バイト</Translate></p>
      {tooLong && <p className={styles.error} role="alert"><Translate id="rsa.textTooLong">UTF-8 で 190 バイト以内のテキストを入力すること。日本語や絵文字は 1 文字で複数バイトを使う。</Translate></p>}
      <p><Translate id="rsa.oaepHelp">テキストを UTF-8 のバイト列 M に変換し、OAEP で 256 バイトの符号化データ EM にする。OAEP は単なるゼロ埋めではなく、ハッシュと 32 バイトの乱数を使う。EM を整数 m として RSA で暗号化する。同じテキストでも、暗号文は毎回変わる。</Translate></p>
      <Formula tex={String.raw`M = \operatorname{UTF8}(\mathrm{text}),\quad m = \operatorname{OS2IP}(\operatorname{OAEP}(M))`} />
      <Formula tex={`|M| = ${byteLength},\\quad |PS| = 256 - ${byteLength} - 2 \\times 32 - 2 = ${tooLong ? String.raw`\text{---}` : 190 - byteLength}`} />
      <p><Translate id="rsa.paddingHelp">PS は OAEP 内部のゼロ列である。空ラベルのハッシュ (32 バイト)、区切り (1 バイト)、M と合わせたデータを、乱数から作る MGF1 のマスクで処理する。先頭の 1 バイト、マスク済みの乱数 (32 バイト)、マスク済みのデータ (223 バイト) で EM が構成される。</Translate></p>
      <Formula tex={String.raw`DB = \operatorname{SHA256}(\varepsilon)\,\|\,PS\,\|\,\mathtt{01}\,\|\,M`} />
      <Formula tex={String.raw`EM = \mathtt{00}\,\|\,maskedSeed\,\|\,maskedDB,\quad c = m^{65537}\bmod n`} />
      <button className="button button--secondary" disabled={!keys || tooLong || !current} onClick={() => {setResult(null); setRevision((v: number) => v + 1);}}><Translate id="rsa.encryptAgain">新しい乱数で暗号化</Translate></button>
      {keys && !tooLong && !current && !error && <p role="status"><Translate id="rsa.processingText">暗号化・復号の計算中...</Translate></p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {current && <>
        <Heading as="h3"><Translate id="rsa.cipherBase64">暗号文 c (Base64、256 バイト)</Translate></Heading>
        <CodeBlock language="text">{current.base64}</CodeBlock>
        <details><summary><Translate id="rsa.actualEncryption">数値を代入した暗号化の式とバイト列</Translate></summary>
          <Heading as="h3"><Translate id="rsa.utf8Hex">UTF-8 の平文 (16 進数)</Translate></Heading><CodeBlock language="text">{current.plainHex || '∅'}</CodeBlock>
          <Heading as="h3"><Translate id="rsa.oaepHex">OAEP の符号化データ EM (16 進数)</Translate></Heading><CodeBlock language="text">{current.encodedHex}</CodeBlock>
          <Formula tex={`m = ${current.m}`} />
          <Formula tex={`c = ${current.m}^{65537} \\bmod ${keys!.numbers.n.toString(10)} = ${current.c}`} />
        </details>
      </>}
    </section>
    <section className={styles.section}>
      <Heading as="h2"><Translate id="rsa.step3">3. 秘密鍵による復号</Translate></Heading>
      <p><Translate id="rsa.textDecryptHelp">暗号文 c に秘密指数 d と n を使って整数 m を復元する。256 バイトの EM に戻した後、OAEP を検証して取り除き、UTF-8 として元のテキストに戻す。公開指数 e は復号の計算には不要である。</Translate></p>
      <Formula tex={String.raw`m = c^d \bmod n,\quad M = \operatorname{OAEPDecode}(\operatorname{I2OSP}(m,256))`} />
      {current && <>
        <label className={styles.textLabel} htmlFor="rsa-recovered"><Translate id="rsa.recoveredText">復号したテキスト</Translate></label>
        <textarea id="rsa-recovered" className={styles.textarea} rows={3} readOnly value={current.recovered} />
        <p className={styles.result} role="status"><Translate id="rsa.textMatch">復号したテキストは元の平文と一致する。</Translate></p>
        <details><summary><Translate id="rsa.actualDecryption">数値を代入した復号の式</Translate></summary><Formula tex={`m = ${current.c}^{${keys!.numbers.d.toString(10)}} \\bmod ${keys!.numbers.n.toString(10)} = ${current.m}`} /></details>
      </>}
    </section>
    {keys && <section className={styles.section}>
      <Heading as="h2"><Translate id="rsa.textPem">テキスト用の鍵の PEM 形式</Translate></Heading>
      <p><Translate id="rsa.textPemHelp">このテキストの暗号化・復号に使った公開鍵 (SPKI) と秘密鍵 (暗号化していない PKCS#8) である。鍵を生成し直すと内容が変わる。学習用に秘密鍵を表示するため、実際の秘密情報の保護には使わないこと。</Translate></p>
      <CodeBlock language="text">{keys.publicPem}</CodeBlock>
      <CodeBlock language="text">{keys.privatePem}</CodeBlock>
    </section>}
  </>;
}
