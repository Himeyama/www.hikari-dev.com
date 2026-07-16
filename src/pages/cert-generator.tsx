import type {ReactNode} from 'react';
import {useState, useRef} from 'react';
import forge from 'node-forge';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './cert-generator.module.css';

const KEY_BITS_OPTIONS = [2048, 4096] as const;
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

interface KeyCertPair {
  cert: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  certPem: string;
  keyPem: string;
}

function randomSerialNumber(): string {
  let sn = forge.util.bytesToHex(forge.random.getBytesSync(16));
  if (parseInt(sn[0], 16) >= 8) sn = `00${sn}`;
  return sn;
}

function parseSanList(raw: string, fallbackCn: string): forge.pki.SubjectAltNameOption[] {
  const entries = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (entries.length === 0 && fallbackCn) entries.push(fallbackCn);
  else if (fallbackCn && !entries.includes(fallbackCn)) entries.unshift(fallbackCn);
  const seen = new Set<string>();
  const altNames: forge.pki.SubjectAltNameOption[] = [];
  for (const entry of entries) {
    if (seen.has(entry)) continue;
    seen.add(entry);
    if (IPV4_RE.test(entry)) {
      altNames.push({type: 7, ip: entry});
    } else {
      altNames.push({type: 2, value: entry});
    }
  }
  return altNames;
}

function buildAttrs(cn: string, org: string): forge.pki.CertificateField[] {
  const attrs: forge.pki.CertificateField[] = [{name: 'commonName', value: cn}];
  if (org.trim()) attrs.push({name: 'organizationName', value: org.trim()});
  return attrs;
}

interface UploadedCa {
  cert: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  certPem: string;
}

function extractPemBlock(text: string, kind: 'CERTIFICATE' | 'KEY'): string | null {
  const re =
    kind === 'CERTIFICATE'
      ? /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/
      : /-----BEGIN (?:ENCRYPTED )?(?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:ENCRYPTED )?(?:RSA )?PRIVATE KEY-----/;
  const match = text.match(re);
  return match ? match[0] : null;
}

function parsePrivateKeyPem(pem: string, passphrase: string): forge.pki.PrivateKey {
  if (pem.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    const encryptedInfo = forge.pki.encryptedPrivateKeyFromPem(pem);
    const privateKeyInfo = forge.pki.decryptPrivateKeyInfo(encryptedInfo, passphrase);
    if (!privateKeyInfo) throw new Error('decrypt-failed');
    return forge.pki.privateKeyFromAsn1(privateKeyInfo);
  }
  if (pem.includes('Proc-Type: 4,ENCRYPTED')) {
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, passphrase);
    if (!privateKey) throw new Error('decrypt-failed');
    return privateKey;
  }
  return forge.pki.privateKeyFromPem(pem);
}

function publicKeysMatch(cert: forge.pki.Certificate, privateKey: forge.pki.PrivateKey): boolean {
  const pub = cert.publicKey as unknown as forge.pki.rsa.PublicKey;
  const priv = privateKey as unknown as forge.pki.rsa.PrivateKey;
  if (!pub?.n || !priv?.n) return false;
  return pub.n.equals(priv.n) && pub.e.equals(priv.e);
}

// ── Certificate detail inspection ─────────────────
interface DnAttribute {
  shortName?: string;
  name?: string;
  value: string;
}

function formatDn(entity: {attributes: DnAttribute[]}): string {
  return entity.attributes.map((a) => `${a.shortName || a.name}=${a.value}`).join(', ');
}

function formatDate(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function certFingerprintSha256(cert: forge.pki.Certificate): string {
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(der);
  const hex = md.digest().toHex();
  return (hex.match(/.{2}/g) ?? []).join(':').toUpperCase();
}

const KEY_USAGE_LABELS: Record<string, string> = {
  digitalSignature: 'デジタル署名',
  nonRepudiation: '否認防止',
  keyEncipherment: '鍵の暗号化',
  dataEncipherment: 'データの暗号化',
  keyAgreement: '鍵の合意',
  keyCertSign: '証明書の署名',
  cRLSign: 'CRL の署名',
};

const EXT_KEY_USAGE_LABELS: Record<string, string> = {
  serverAuth: 'サーバー認証',
  clientAuth: 'クライアント認証',
  codeSigning: 'コード署名',
  emailProtection: 'メール保護',
  timeStamping: 'タイムスタンプ',
};

interface CertificateSummary {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  publicKeyInfo: string;
  isCa: boolean;
  keyUsage: string[];
  extKeyUsage: string[];
  san: string[];
  fingerprint: string;
}

function summarizeCertificate(cert: forge.pki.Certificate): CertificateSummary {
  const pub = cert.publicKey as unknown as forge.pki.rsa.PublicKey;
  const basicConstraints = cert.getExtension('basicConstraints') as {cA?: boolean} | undefined;
  const keyUsageExt = cert.getExtension('keyUsage') as Record<string, boolean> | undefined;
  const extKeyUsageExt = cert.getExtension('extKeyUsage') as Record<string, boolean> | undefined;
  const sanExt = cert.getExtension('subjectAltName') as
    | {altNames: {type: number; value?: string; ip?: string}[]}
    | undefined;

  return {
    subject: formatDn(cert.subject),
    issuer: formatDn(cert.issuer),
    serialNumber: cert.serialNumber,
    notBefore: formatDate(cert.validity.notBefore),
    notAfter: formatDate(cert.validity.notAfter),
    publicKeyInfo: pub?.n ? `RSA ${pub.n.bitLength()} bit` : '—',
    isCa: Boolean(basicConstraints?.cA),
    keyUsage: keyUsageExt
      ? Object.keys(KEY_USAGE_LABELS).filter((k) => keyUsageExt[k]).map((k) => KEY_USAGE_LABELS[k])
      : [],
    extKeyUsage: extKeyUsageExt
      ? Object.keys(EXT_KEY_USAGE_LABELS)
          .filter((k) => extKeyUsageExt[k])
          .map((k) => EXT_KEY_USAGE_LABELS[k])
      : [],
    san: sanExt
      ? sanExt.altNames.map((a) => (a.type === 7 ? `IP:${a.ip}` : `DNS:${a.value}`))
      : [],
    fingerprint: certFingerprintSha256(cert),
  };
}

function CertDetails({cert}: {cert: forge.pki.Certificate}): ReactNode {
  const summary = summarizeCertificate(cert);
  return (
    <details className={styles.details}>
      <summary className={styles.detailsSummary}>
        <Translate id="certGen.detailsSummary">証明書の詳細を表示</Translate>
      </summary>
      <table className={styles.detailsTable}>
        <tbody>
          <tr>
            <th>
              <Translate id="certGen.detailsSubject">サブジェクト</Translate>
            </th>
            <td>{summary.subject}</td>
          </tr>
          <tr>
            <th>
              <Translate id="certGen.detailsIssuer">発行者</Translate>
            </th>
            <td>{summary.issuer}</td>
          </tr>
          <tr>
            <th>
              <Translate id="certGen.detailsSerial">シリアル番号</Translate>
            </th>
            <td className={styles.detailsMono}>{summary.serialNumber}</td>
          </tr>
          <tr>
            <th>
              <Translate id="certGen.detailsValidity">有効期間</Translate>
            </th>
            <td>
              {summary.notBefore} 〜 {summary.notAfter}
            </td>
          </tr>
          <tr>
            <th>
              <Translate id="certGen.detailsPublicKey">公開鍵</Translate>
            </th>
            <td>{summary.publicKeyInfo}</td>
          </tr>
          <tr>
            <th>
              <Translate id="certGen.detailsBasicConstraints">基本制約</Translate>
            </th>
            <td>CA: {summary.isCa ? 'TRUE' : 'FALSE'}</td>
          </tr>
          {summary.keyUsage.length > 0 && (
            <tr>
              <th>
                <Translate id="certGen.detailsKeyUsage">鍵の用途</Translate>
              </th>
              <td>{summary.keyUsage.join(', ')}</td>
            </tr>
          )}
          {summary.extKeyUsage.length > 0 && (
            <tr>
              <th>
                <Translate id="certGen.detailsExtKeyUsage">拡張鍵用途</Translate>
              </th>
              <td>{summary.extKeyUsage.join(', ')}</td>
            </tr>
          )}
          {summary.san.length > 0 && (
            <tr>
              <th>SAN</th>
              <td>{summary.san.join(', ')}</td>
            </tr>
          )}
          <tr>
            <th>
              <Translate id="certGen.detailsFingerprint">フィンガープリント (SHA-256)</Translate>
            </th>
            <td className={styles.detailsMono}>{summary.fingerprint}</td>
          </tr>
        </tbody>
      </table>
    </details>
  );
}

function generateCaCertificate(cn: string, org: string, validityDays: number, bits: number): KeyCertPair {
  const keys = forge.pki.rsa.generateKeyPair(bits);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerialNumber();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays);

  const attrs = buildAttrs(cn, org);
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    {name: 'basicConstraints', cA: true, critical: true},
    {name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true, critical: true},
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    cert,
    privateKey: keys.privateKey,
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

function generateServerCertificate(
  cn: string,
  org: string,
  san: string,
  validityDays: number,
  bits: number,
  signer: {cert: forge.pki.Certificate; privateKey: forge.pki.PrivateKey} | null,
): KeyCertPair {
  const keys = forge.pki.rsa.generateKeyPair(bits);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerialNumber();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays);

  const subjectAttrs = buildAttrs(cn, org);
  cert.setSubject(subjectAttrs);
  cert.setIssuer(signer ? signer.cert.subject.attributes : subjectAttrs);
  cert.setExtensions([
    {name: 'basicConstraints', cA: false, critical: true},
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
      critical: true,
    },
    {name: 'extKeyUsage', serverAuth: true, clientAuth: true},
    {name: 'subjectAltName', altNames: parseSanList(san, cn)},
  ]);

  const signingKey = signer ? signer.privateKey : keys.privateKey;
  cert.sign(signingKey, forge.md.sha256.create());

  return {
    cert,
    privateKey: keys.privateKey,
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy fallback below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], {type: 'application/x-pem-file'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CertOutputBlock({
  label,
  value,
  filename,
  sensitive,
}: {
  label: string;
  value: string;
  filename: string;
  sensitive?: boolean;
}): ReactNode {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.certBlock}>
      <div className={styles.certBlockHeader}>
        <span className={styles.certBlockLabel}>{label}</span>
        <div className={styles.certBlockActions}>
          <button className={styles.actionBtnGhostSmall} onClick={copy}>
            {copied ? (
              <Translate id="certGen.copied">コピーしました</Translate>
            ) : (
              <Translate id="certGen.copy">コピー</Translate>
            )}
          </button>
          <button
            className={styles.actionBtnGhostSmall}
            onClick={() => downloadText(filename, value)}
          >
            <Translate id="certGen.download">ダウンロード</Translate>
          </button>
        </div>
      </div>
      {sensitive && (
        <p className={styles.warningText}>
          <Translate id="certGen.privateKeyWarning">
            秘密鍵は厳重に管理し、第三者と共有しないこと。
          </Translate>
        </p>
      )}
      <pre className={styles.certPre}>
        <code>{value}</code>
      </pre>
    </div>
  );
}

type SignMode = 'self' | 'ca-generated' | 'ca-uploaded';
type CaTab = 'generate' | 'upload';

export default function CertGeneratorPage(): ReactNode {
  // ── Root CA section ────────────────────────────
  const [caTab, setCaTab] = useState<CaTab>('generate');

  const [caCn, setCaCn] = useState('My Local Root CA');
  const [caOrg, setCaOrg] = useState('');
  const [caValidityDays, setCaValidityDays] = useState(3650);
  const [caBits, setCaBits] = useState<number>(2048);
  const [caGenerating, setCaGenerating] = useState(false);
  const [caError, setCaError] = useState<string | null>(null);
  const [caResult, setCaResult] = useState<KeyCertPair | null>(null);

  const generateCa = (e: React.FormEvent) => {
    e.preventDefault();
    setCaError(null);
    if (!caCn.trim()) {
      setCaError(translate({id: 'certGen.errorCnRequired', message: 'コモンネーム (CN) を入力してください。'}));
      return;
    }
    setCaGenerating(true);
    setTimeout(() => {
      try {
        const result = generateCaCertificate(caCn.trim(), caOrg, caValidityDays, caBits);
        setCaResult(result);
      } catch (err) {
        console.error(err);
        setCaError(translate({id: 'certGen.errorGenerate', message: '証明書の生成に失敗した。'}));
      } finally {
        setCaGenerating(false);
      }
    }, 10);
  };

  // ── Root CA upload ──────────────────────────────
  const [uploadCertPem, setUploadCertPem] = useState('');
  const [uploadKeyPem, setUploadKeyPem] = useState('');
  const [uploadPassphrase, setUploadPassphrase] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCa, setUploadedCa] = useState<UploadedCa | null>(null);
  const [isCaDragging, setIsCaDragging] = useState(false);
  const caFileInputRef = useRef<HTMLInputElement>(null);

  const handleCaFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      const content = await file.text();
      const certBlock = extractPemBlock(content, 'CERTIFICATE');
      const keyBlock = extractPemBlock(content, 'KEY');
      if (certBlock) setUploadCertPem(certBlock);
      if (keyBlock) setUploadKeyPem(keyBlock);
    }
  };

  const onCaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsCaDragging(false);
    handleCaFiles(e.dataTransfer.files);
  };

  const loadUploadedCa = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!uploadCertPem.trim() || !uploadKeyPem.trim()) {
      setUploadError(
        translate({
          id: 'certGen.errorUploadMissing',
          message: 'CA 証明書と CA 秘密鍵の両方を入力してください。',
        }),
      );
      return;
    }
    try {
      const cert = forge.pki.certificateFromPem(uploadCertPem);
      const privateKey = parsePrivateKeyPem(uploadKeyPem, uploadPassphrase);
      if (!publicKeysMatch(cert, privateKey)) {
        setUploadError(
          translate({
            id: 'certGen.errorUploadMismatch',
            message: 'CA 証明書と CA 秘密鍵が一致しない。',
          }),
        );
        return;
      }
      setUploadedCa({cert, privateKey, certPem: uploadCertPem.trim()});
    } catch (err) {
      console.error(err);
      setUploadError(
        translate({
          id: 'certGen.errorUploadParse',
          message: 'CA の読み込みに失敗した。PEM 形式か、秘密鍵の場合はパスフレーズを確認してください。',
        }),
      );
    }
  };

  const clearUploadedCa = () => {
    setUploadedCa(null);
    setUploadCertPem('');
    setUploadKeyPem('');
    setUploadPassphrase('');
    setUploadError(null);
  };

  const uploadedCaIsCa = uploadedCa?.cert.getExtension('basicConstraints') as
    | {cA?: boolean}
    | undefined;

  // ── Server certificate section ─────────────────
  const [srvCn, setSrvCn] = useState('localhost');
  const [srvOrg, setSrvOrg] = useState('');
  const [srvSan, setSrvSan] = useState('localhost, 127.0.0.1');
  const [srvValidityDays, setSrvValidityDays] = useState(825);
  const [srvBits, setSrvBits] = useState<number>(2048);
  const [srvSignMode, setSrvSignMode] = useState<SignMode>('self');
  const [srvGenerating, setSrvGenerating] = useState(false);
  const [srvError, setSrvError] = useState<string | null>(null);
  const [srvResult, setSrvResult] = useState<KeyCertPair | null>(null);
  const [srvSignerCertPem, setSrvSignerCertPem] = useState<string | null>(null);
  const [srvSignerCert, setSrvSignerCert] = useState<forge.pki.Certificate | null>(null);

  const activeSigner =
    srvSignMode === 'ca-generated'
      ? caResult
        ? {cert: caResult.cert, privateKey: caResult.privateKey, certPem: caResult.certPem}
        : null
      : srvSignMode === 'ca-uploaded'
        ? uploadedCa
        : null;

  const generateServer = (e: React.FormEvent) => {
    e.preventDefault();
    setSrvError(null);
    if (!srvCn.trim()) {
      setSrvError(translate({id: 'certGen.errorCnRequired', message: 'コモンネーム (CN) を入力してください。'}));
      return;
    }
    if (srvSignMode !== 'self' && !activeSigner) {
      setSrvError(
        translate({
          id: 'certGen.errorNoCa',
          message: '署名に使用する CA が読み込まれていない。ルート CA を生成するかアップロードしてください。',
        }),
      );
      return;
    }
    setSrvGenerating(true);
    setTimeout(() => {
      try {
        const result = generateServerCertificate(
          srvCn.trim(),
          srvOrg,
          srvSan,
          srvValidityDays,
          srvBits,
          activeSigner ? {cert: activeSigner.cert, privateKey: activeSigner.privateKey} : null,
        );
        setSrvResult(result);
        setSrvSignerCertPem(activeSigner ? activeSigner.certPem : null);
        setSrvSignerCert(activeSigner ? activeSigner.cert : null);
      } catch (err) {
        console.error(err);
        setSrvError(translate({id: 'certGen.errorGenerate', message: '証明書の生成に失敗した。'}));
      } finally {
        setSrvGenerating(false);
      }
    }, 10);
  };

  return (
    <Layout
      title={translate({id: 'certGen.title', message: '証明書ジェネレーター'})}
      description={translate({
        id: 'certGen.description',
        message: 'ルート CA 証明書とサーバー証明書 (オレオレ証明書) をブラウザ内で生成するツール。秘密鍵を含め、内容はサーバーに送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="certGen.title">証明書ジェネレーター</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="certGen.subtitle">
            ルート CA 証明書とサーバー証明書 (オレオレ証明書) を生成する。すべての処理はブラウザ内で完結し、秘密鍵を含め内容はサーバーに送信されない。
          </Translate>
        </p>

        {/* ── Root CA ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="certGen.caSectionTitle">1. ルート CA を準備</Translate>
        </Heading>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${caTab === 'generate' ? styles.tabBtnActive : ''}`}
            onClick={() => setCaTab('generate')}
          >
            <Translate id="certGen.tabGenerate">新規生成</Translate>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${caTab === 'upload' ? styles.tabBtnActive : ''}`}
            onClick={() => setCaTab('upload')}
          >
            <Translate id="certGen.tabUpload">既存の CA をアップロード</Translate>
          </button>
        </div>

        {caTab === 'generate' && (
        <form className={styles.form} onSubmit={generateCa}>
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              <Translate id="certGen.cnLabel">コモンネーム (CN)</Translate>
              <input
                className={styles.formInput}
                value={caCn}
                onChange={(e) => setCaCn(e.target.value)}
                required
              />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.orgLabel">組織名 (O、任意)</Translate>
              <input className={styles.formInput} value={caOrg} onChange={(e) => setCaOrg(e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.validityLabel">有効期間 (日)</Translate>
              <input
                type="number"
                className={styles.formInput}
                value={caValidityDays}
                min={1}
                max={7300}
                onChange={(e) => setCaValidityDays(Number(e.target.value))}
              />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.keyBitsLabel">鍵長</Translate>
              <select
                className={styles.formInput}
                value={caBits}
                onChange={(e) => setCaBits(Number(e.target.value))}
              >
                {KEY_BITS_OPTIONS.map((bits) => (
                  <option key={bits} value={bits}>
                    {bits} bit
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className={styles.actionBtn} disabled={caGenerating}>
            {caGenerating ? (
              <Translate id="certGen.generating">生成中...</Translate>
            ) : (
              <Translate id="certGen.generateCaBtn">ルート CA を生成</Translate>
            )}
          </button>
        </form>
        )}

        {caTab === 'generate' && caError && <p className={styles.errorText}>{caError}</p>}

        {caTab === 'generate' && caResult && (
          <div className={styles.resultGroup}>
            <CertOutputBlock
              label={translate({id: 'certGen.caCertLabel', message: 'CA 証明書 (PEM)'})}
              value={caResult.certPem}
              filename="ca-cert.pem"
            />
            <CertOutputBlock
              label={translate({id: 'certGen.caKeyLabel', message: 'CA 秘密鍵 (PEM)'})}
              value={caResult.keyPem}
              filename="ca-key.pem"
              sensitive
            />
            <CertDetails cert={caResult.cert} />
          </div>
        )}

        {caTab === 'upload' && (
          <form className={styles.form} onSubmit={loadUploadedCa}>
            <div
              className={`${styles.dropzone} ${isCaDragging ? styles.dropzoneActive : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsCaDragging(true);
              }}
              onDragLeave={() => setIsCaDragging(false)}
              onDrop={onCaDrop}
              onClick={() => caFileInputRef.current?.click()}
            >
              <input
                ref={caFileInputRef}
                type="file"
                multiple
                className={styles.hiddenInput}
                onChange={(e) => handleCaFiles(e.target.files)}
              />
              <p className={styles.dropzoneText}>
                <Translate id="certGen.caUploadDropHint">
                  CA 証明書・CA 秘密鍵のファイルをここにドロップ、またはクリックして選択 (まとめて 1
                  ファイルでも可)
                </Translate>
              </p>
            </div>

            <label className={styles.formLabelWide}>
              <Translate id="certGen.caUploadCertLabel">CA 証明書 (PEM)</Translate>
              <textarea
                className={styles.formTextareaMono}
                value={uploadCertPem}
                onChange={(e) => setUploadCertPem(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----"
              />
            </label>

            <label className={styles.formLabelWide}>
              <Translate id="certGen.caUploadKeyLabel">CA 秘密鍵 (PEM)</Translate>
              <textarea
                className={styles.formTextareaMono}
                value={uploadKeyPem}
                onChange={(e) => setUploadKeyPem(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----"
              />
            </label>

            <label className={styles.formLabel} style={{marginBottom: '1rem', maxWidth: 280}}>
              <Translate id="certGen.caUploadPassphraseLabel">
                秘密鍵のパスフレーズ (暗号化されている場合のみ)
              </Translate>
              <input
                type="password"
                className={styles.formInput}
                value={uploadPassphrase}
                onChange={(e) => setUploadPassphrase(e.target.value)}
              />
            </label>

            <div className={styles.formButtonRow}>
              <button type="submit" className={styles.actionBtn}>
                <Translate id="certGen.caUploadLoadBtn">CA を読み込む</Translate>
              </button>
              {uploadedCa && (
                <button type="button" className={styles.actionBtnGhost} onClick={clearUploadedCa}>
                  <Translate id="certGen.caUploadClearBtn">クリア</Translate>
                </button>
              )}
            </div>
          </form>
        )}

        {caTab === 'upload' && uploadError && <p className={styles.errorText}>{uploadError}</p>}

        {caTab === 'upload' && uploadedCa && (
          <>
            <p className={styles.statusText}>
              <Translate id="certGen.caUploadLoaded">読み込み済み:</Translate>{' '}
              {uploadedCa.cert.subject.getField('CN')?.value ?? '—'}
            </p>
            {uploadedCaIsCa && !uploadedCaIsCa.cA && (
              <p className={styles.warningText}>
                <Translate id="certGen.caUploadNotCaWarning">
                  この証明書は CA (basicConstraints: cA=true) として設定されていない。署名は可能だが、多くのクライアントで信頼エラーになる可能性がある。
                </Translate>
              </p>
            )}
            <CertDetails cert={uploadedCa.cert} />
          </>
        )}

        {/* ── Server certificate ── */}
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="certGen.serverSectionTitle">2. サーバー証明書を生成</Translate>
        </Heading>

        <form className={styles.form} onSubmit={generateServer}>
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              <Translate id="certGen.cnLabel">コモンネーム (CN)</Translate>
              <input
                className={styles.formInput}
                value={srvCn}
                onChange={(e) => setSrvCn(e.target.value)}
                required
              />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.orgLabel">組織名 (O、任意)</Translate>
              <input className={styles.formInput} value={srvOrg} onChange={(e) => setSrvOrg(e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.validityLabel">有効期間 (日)</Translate>
              <input
                type="number"
                className={styles.formInput}
                value={srvValidityDays}
                min={1}
                max={825}
                onChange={(e) => setSrvValidityDays(Number(e.target.value))}
              />
            </label>
            <label className={styles.formLabel}>
              <Translate id="certGen.keyBitsLabel">鍵長</Translate>
              <select
                className={styles.formInput}
                value={srvBits}
                onChange={(e) => setSrvBits(Number(e.target.value))}
              >
                {KEY_BITS_OPTIONS.map((bits) => (
                  <option key={bits} value={bits}>
                    {bits} bit
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.formLabelWide}>
            <Translate id="certGen.sanLabel">
              SAN (Subject Alternative Name、カンマまたは改行区切り。ドメイン名と IP アドレスに対応)
            </Translate>
            <textarea
              className={styles.formTextarea}
              value={srvSan}
              onChange={(e) => setSrvSan(e.target.value)}
              placeholder="localhost, 127.0.0.1, example.local"
            />
          </label>

          <div className={styles.radioGroup}>
            <span className={styles.formLabelText}>
              <Translate id="certGen.signModeLabel">署名方法</Translate>
            </span>

            <label className={styles.radioCard}>
              <div className={styles.radioCardHead}>
                <input
                  type="radio"
                  name="signMode"
                  checked={srvSignMode === 'self'}
                  onChange={() => setSrvSignMode('self')}
                />
                <Translate id="certGen.signModeSelf">自己署名 (オレオレ証明書)</Translate>
              </div>
              <p className={styles.radioCardDesc}>
                <Translate id="certGen.signModeSelfDesc">
                  証明書自身が発行者になる、最も手軽な方式。CA を用意する必要はないが、ブラウザや OS
                  はこの証明書の発行元を知らないため信頼せず、アクセスのたびに警告が表示される。1
                  台のサーバーを自分だけで動作確認する場合に向く。
                </Translate>
              </p>
            </label>

            <label className={`${styles.radioCard} ${!caResult ? styles.radioCardDisabled : ''}`}>
              <div className={styles.radioCardHead}>
                <input
                  type="radio"
                  name="signMode"
                  checked={srvSignMode === 'ca-generated'}
                  onChange={() => setSrvSignMode('ca-generated')}
                  disabled={!caResult}
                />
                <Translate id="certGen.signModeCaGenerated">生成したルート CA で署名</Translate>
                {caResult ? (
                  <span className={styles.radioBadgeReady}>
                    <Translate id="certGen.readyBadge">✓ 使用可能</Translate>
                  </span>
                ) : (
                  <span className={styles.radioBadgeLocked}>
                    <Translate id="certGen.signModeCaGeneratedHint">
                      未準備 — 先に上でルート CA を生成
                    </Translate>
                  </span>
                )}
              </div>
              <p className={styles.radioCardDesc}>
                <Translate id="certGen.signModeCaDesc">
                  上のセクションで生成 (またはアップロード) した CA の秘密鍵で署名する方式。CA
                  証明書を OS やブラウザに「信頼されたルート証明機関」としてインポートしておけば、その
                  CA が署名したサーバー証明書はすべて警告なしに信頼される。複数のサーバーや複数のドメインを
                  同じ CA でまとめて発行・管理したい場合に向く。
                </Translate>
              </p>
            </label>

            <label className={`${styles.radioCard} ${!uploadedCa ? styles.radioCardDisabled : ''}`}>
              <div className={styles.radioCardHead}>
                <input
                  type="radio"
                  name="signMode"
                  checked={srvSignMode === 'ca-uploaded'}
                  onChange={() => setSrvSignMode('ca-uploaded')}
                  disabled={!uploadedCa}
                />
                <Translate id="certGen.signModeCaUploaded">アップロードした CA で署名</Translate>
                {uploadedCa ? (
                  <span className={styles.radioBadgeReady}>
                    <Translate id="certGen.readyBadge">✓ 使用可能</Translate>
                  </span>
                ) : (
                  <span className={styles.radioBadgeLocked}>
                    <Translate id="certGen.signModeCaUploadedHint">
                      未準備 — 先に上で CA をアップロード
                    </Translate>
                  </span>
                )}
              </div>
              <p className={styles.radioCardDesc}>
                <Translate id="certGen.signModeCaUploadedDesc">
                  既存の CA (このツールの以前のセッションで生成したものや、社内・チームで共有している
                  CA など) の証明書と秘密鍵をアップロードして署名する方式。仕組みは「生成したルート CA
                  で署名」と同じだが、すでに信頼ストアへインポート済みの CA をそのまま使い回せる。
                </Translate>
              </p>
            </label>
          </div>

          <button type="submit" className={styles.actionBtn} disabled={srvGenerating}>
            {srvGenerating ? (
              <Translate id="certGen.generating">生成中...</Translate>
            ) : (
              <Translate id="certGen.generateServerBtn">サーバー証明書を生成</Translate>
            )}
          </button>
        </form>

        {srvError && <p className={styles.errorText}>{srvError}</p>}

        {srvResult && (
          <div className={styles.resultGroup}>
            <CertOutputBlock
              label={translate({id: 'certGen.serverKeyLabel', message: 'サーバー秘密鍵 (PEM)'})}
              value={srvResult.keyPem}
              filename="server-key.pem"
              sensitive
            />
            <CertOutputBlock
              label={translate({id: 'certGen.serverCertLabel', message: 'サーバー証明書 (PEM)'})}
              value={srvResult.certPem}
              filename="server-cert.pem"
            />
            <CertDetails cert={srvResult.cert} />
            {srvSignerCertPem && (
              <>
                <CertOutputBlock
                  label={translate({
                    id: 'certGen.chainCaCertLabel',
                    message: 'CA 証明書 (PEM) — 信頼ストアへのインポート用',
                  })}
                  value={srvSignerCertPem}
                  filename="ca-cert.pem"
                />
                {srvSignerCert && <CertDetails cert={srvSignerCert} />}
              </>
            )}
          </div>
        )}

        {/* Notes */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="certGen.notesTitle">このツールについて</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="certGen.note1">
                証明書の生成はすべてブラウザ内で完結し、秘密鍵を含め内容がサーバーに送信されることはない。
              </Translate>
            </li>
            <li>
              <Translate id="certGen.note2">
                ページを再読み込みすると生成した鍵と証明書は失われるため、必要な場合はダウンロードして保存すること。
              </Translate>
            </li>
            <li>
              <Translate id="certGen.note3">
                ルート CA で署名したサーバー証明書をブラウザや OS に信頼させるには、CA 証明書を信頼されたルート証明機関としてインポートする必要がある。
              </Translate>
            </li>
            <li>
              <Translate id="certGen.note4">
                このツールで生成する証明書はローカル開発・検証用途を想定している。実運用環境では認証局が発行した正式な証明書を使用すること。
              </Translate>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
