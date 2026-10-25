import {useMemo, useState, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Translate, {translate} from '@docusaurus/Translate';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {PRIMES, gcd, inverse, powerSteps, learningPem} from '@site/src/lib/rsa-learning';
import styles from './rsa.module.css';

function Formula({tex}: {tex: string}): ReactNode {
  return <div className={styles.formula} dangerouslySetInnerHTML={{__html: katex.renderToString(tex, {displayMode: true, throwOnError: false, trust: false})}} />;
}

function Working({base, exponent, modulus}: {base: number; exponent: number; modulus: number}): ReactNode {
  const {result, squares} = powerSteps(base, exponent, modulus);
  const selected = squares.filter((step) => step.selected);
  return <details>
    <summary><Translate id="rsa.working">繰り返し二乗法の途中計算</Translate></summary>
    <p><Translate id="rsa.workingHelp">指数を 2 の累乗の和に分け、二乗するたびに余りを取る。選んだ余りを掛け合わせ、最後にもう一度余りを取る。</Translate></p>
    <Formula tex={`${exponent} = ${selected.map((s) => s.power).join(' + ')}`} />
    {squares.map((s, i) => <Formula key={s.power} tex={i === 0
      ? `${base}^{1} \\bmod ${modulus} = ${s.value}`
      : `${base}^{${s.power}} \\bmod ${modulus} = ${squares[i - 1].value}^{2} \\bmod ${modulus} = ${s.value}`} />)}
    <Formula tex={`${base}^{${exponent}} \\bmod ${modulus} = (${selected.map((s) => s.value).join(' \\times ')}) \\bmod ${modulus} = ${result}`} />
  </details>;
}

export default function RsaPage(): ReactNode {
  const [primes, setPrimes] = useState<[number, number]>([5, 11]);
  const [exponent, setExponent] = useState<number | null>(null);
  const [message, setMessage] = useState('7');
  const [cipherInput, setCipherInput] = useState<string | null>(null);
  const [p, q] = primes;
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  const exponents = Array.from({length: phi - 2}, (_, i) => i + 2).filter((v) => gcd(v, phi) === 1);
  const e = exponent ?? exponents[0];
  const d = inverse(e, phi);
  const m = Number(message);
  const validMessage = /^\d+$/.test(message) && Number.isSafeInteger(m) && m < n;
  const cipher = validMessage ? powerSteps(m, e, n).result : null;
  const cipherText = cipherInput ?? (cipher === null ? '' : String(cipher));
  const c = Number(cipherText);
  const validCipher = /^\d+$/.test(cipherText) && Number.isSafeInteger(c) && c < n;
  const recovered = validCipher ? powerSteps(c, d, n).result : null;
  const pem = useMemo(() => learningPem(p, q, e, d), [p, q, e, d]);

  function generate() {
    const pairs = PRIMES.flatMap((a, i) => PRIMES.slice(i + 1).map((b) => [a, b] as [number, number]))
      .filter(([a, b]) => a !== p || b !== q);
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    setPrimes(pair);
    setExponent(null);
    setCipherInput(null);
  }

  return <Layout title={translate({id: 'rsa.title', message: 'RSA 暗号のしくみ'})} description={translate({id: 'rsa.description', message: '小さい素数とリアルタイムの数式で、RSA の鍵生成・暗号化・復号を学ぶ。'})}>
    <main className={styles.page}>
      <Heading as="h1"><Translate id="rsa.title">RSA 暗号のしくみ</Translate></Heading>
      <p className={styles.intro}><Translate id="rsa.intro">RSA は公開鍵暗号の 1 つである。公開鍵で暗号化し、対応する秘密鍵で復号する。2 つの素数の積は簡単に求められるが、大きな積から元の素数を求めることは難しい。この性質が安全性の基礎である。</Translate></p>
      <p className={styles.note}><Translate id="rsa.toyNote">ここでは手計算用の小さい鍵と、パディングのない RSA を使用する。学習専用であり、実際の秘密情報の保護には使用できない。すべての計算はブラウザ内で行う。</Translate></p>

      <section className={styles.section}>
        <Heading as="h2"><Translate id="rsa.step1">1. 素数と鍵の生成</Translate></Heading>
        <p><Translate id="rsa.primeHelp">3 から 19 の異なる素数 p、q をランダムに選ぶ。n は 2 つの素数の積、φ(n) は (p − 1)(q − 1) である。mod は割り算の余りを表す。</Translate></p>
        <button className="button button--primary" onClick={generate}><Translate id="rsa.generate">素数を生成</Translate></button>
        <Formula tex={`p = ${p}, \\quad q = ${q}`} />
        <Formula tex={`n = pq = ${p} \\times ${q} = ${n}`} />
        <Formula tex={`\\varphi(n) = (p-1)(q-1) = ${p - 1} \\times ${q - 1} = ${phi}`} />
        <p><Translate id="rsa.exponentHelp">1 &lt; e &lt; φ(n) を満たし、φ(n) と互いに素である整数 e を選ぶ。d は ed を φ(n) で割った余りが 1 となる整数である。</Translate></p>
        <div className={styles.controls}><label><Translate id="rsa.exponent">公開指数 e</Translate><select value={e} onChange={(event) => {setExponent(Number(event.target.value)); setCipherInput(null);}}>{exponents.map((v) => <option key={v}>{v}</option>)}</select></label></div>
        <Formula tex={`\\gcd(e, \\varphi(n)) = \\gcd(${e}, ${phi}) = 1`} />
        <Formula tex={`d = e^{-1} \\bmod \\varphi(n) = ${d}`} />
        <Formula tex={`${e} \\times ${d} = ${e * d} = ${Math.floor(e * d / phi)} \\times ${phi} + 1`} />
        <div className={styles.keys}>
          <div><Translate id="rsa.publicKey">公開鍵 (共有する値)</Translate><Formula tex={`(n,e) = (${n},${e})`} /></div>
          <div><Translate id="rsa.privateKey">秘密鍵 (秘密にする値)</Translate><Formula tex={`(n,d) = (${n},${d})`} /></div>
        </div>
        <p><Translate id="rsa.privateHelp">p、q、φ(n) も秘密にする。実際の秘密鍵ファイルには、計算を高速化するため p、q なども含まれる。</Translate></p>
      </section>

      <section className={styles.section}>
        <Heading as="h2"><Translate id="rsa.step2">2. 公開鍵による暗号化</Translate></Heading>
        <p><Translate id="rsa.messageHelp">平文を 0 以上 n 未満の整数 m として入力する。ここでは文字の変換を省き、整数を直接暗号化する。入力や鍵の変更に合わせて式が更新される。</Translate></p>
        <div className={styles.controls}><label><Translate id="rsa.message">平文 m</Translate><input type="number" min="0" max={n - 1} step="1" value={message} aria-invalid={!validMessage} aria-describedby="rsa-message-range" onChange={(event) => {setMessage(event.target.value); setCipherInput(null);}} /></label><span id="rsa-message-range">0 ≤ m &lt; {n}</span></div>
        <Formula tex={String.raw`c = m^e \bmod n`} />
        {validMessage ? <><Formula tex={`c = ${m}^{${e}} \\bmod ${n} = ${cipher}`} /><Working base={m} exponent={e} modulus={n} /></> : <p role="alert" className={styles.error}><Translate id="rsa.invalidMessage">平文は表示範囲内の整数で入力すること。</Translate></p>}
      </section>

      <section className={styles.section}>
        <Heading as="h2"><Translate id="rsa.step3">3. 秘密鍵による復号</Translate></Heading>
        <p><Translate id="rsa.decryptHelp">暗号文 c と秘密指数 d、公開鍵と共通の n を使う。公開指数 e は復号の計算には不要である。暗号文を変更して、復号結果の変化も確認できる。</Translate></p>
        <div className={styles.controls}><label><Translate id="rsa.cipher">暗号文 c</Translate><input type="number" min="0" max={n - 1} step="1" value={cipherText} aria-invalid={!validCipher} aria-describedby="rsa-cipher-range" onChange={(event) => setCipherInput(event.target.value)} /></label><span id="rsa-cipher-range">0 ≤ c &lt; {n}</span><button className="button button--secondary" disabled={cipher === null} onClick={() => setCipherInput(null)}><Translate id="rsa.useCipher">暗号化結果を使用</Translate></button></div>
        <Formula tex={String.raw`m' = c^d \bmod n`} />
        {validCipher ? <><Formula tex={`m' = ${c}^{${d}} \\bmod ${n} = ${recovered}`} /><Working base={c} exponent={d} modulus={n} /><p className={styles.result} role="status">{validMessage && recovered === m ? <Translate id="rsa.match">復号結果は元の平文と一致する。</Translate> : <Translate id="rsa.changed">別の暗号文の復号結果を表示中。</Translate>}</p></> : <p role="alert" className={styles.error}><Translate id="rsa.invalidCipher">暗号文は表示範囲内の整数で入力すること。</Translate></p>}
        <p><Translate id="rsa.why">ed は φ(n) の倍数に 1 を足した値であるため、この鍵では暗号化してから復号すると元の整数に戻る。</Translate></p>
        <Formula tex={`ed \\equiv 1 \\pmod{\\varphi(n)}, \\qquad (m^e)^d \\equiv m \\pmod n`} />
      </section>

      <section className={styles.section}>
        <Heading as="h2"><Translate id="rsa.step4">4. PEM 形式と OpenSSL コマンド</Translate></Heading>
        <p><Translate id="rsa.pemHelp">PEM は鍵のバイナリデータ (DER) を Base64 で表し、BEGIN/END 行で囲む形式である。以下は現在の学習用の鍵を実際に変換した結果であり、数値を変えると更新される。公開鍵は SPKI、秘密鍵は暗号化していない PKCS#8 形式である。</Translate></p>
        <Heading as="h3"><Translate id="rsa.publicPem">学習用の公開鍵 PEM</Translate></Heading>
        <CodeBlock language="text">{pem.publicKey}</CodeBlock>
        <Heading as="h3"><Translate id="rsa.privatePem">学習用の秘密鍵 PEM</Translate></Heading>
        <CodeBlock language="text">{pem.privateKey}</CodeBlock>
        <p className={styles.note}><Translate id="rsa.commandHelp">以下は別の 2048 ビット鍵を新しく作成する OpenSSL 3 の例である。上の小さい鍵では OAEP を使用できない。実際の暗号化には OAEP (SHA-256) を使用する。2048 ビット鍵で暗号化できる平文は最大 190 バイトであり、長いデータには共通鍵暗号との組み合わせを使う。</Translate></p>
        <Heading as="h3"><Translate id="rsa.generateCommand">鍵の作成と公開鍵の取り出し</Translate></Heading>
        <CodeBlock language="bash">{'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem\nopenssl pkey -in private.pem -pubout -out public.pem'}</CodeBlock>
        <p><Translate id="rsa.fileHelp">平文を message.txt に保存してから、次のコマンドを順に実行する。private.pem は暗号化していない秘密鍵なので、厳重に管理する。</Translate></p>
        <Heading as="h3"><Translate id="rsa.encryptCommand">公開鍵によるファイルの暗号化</Translate></Heading>
        <CodeBlock language="bash">{'openssl pkeyutl -encrypt -pubin -inkey public.pem -in message.txt -out encrypted.bin -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256'}</CodeBlock>
        <Heading as="h3"><Translate id="rsa.decryptCommand">秘密鍵によるファイルの復号</Translate></Heading>
        <CodeBlock language="bash">{'openssl pkeyutl -decrypt -inkey private.pem -in encrypted.bin -out decrypted.txt -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256'}</CodeBlock>
        <p><Translate id="rsa.outputHelp">decrypted.txt に元の平文が出力される。OAEP には乱数が使われるため、同じ平文でも暗号文は毎回変わる。</Translate></p>
        <a href="https://docs.openssl.org/3.0/man1/openssl-pkeyutl/"><Translate id="rsa.reference">OpenSSL 公式ドキュメント</Translate></a>
      </section>
    </main>
  </Layout>;
}
