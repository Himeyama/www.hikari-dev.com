import type {ReactNode} from 'react';
import {useState} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './uuid.module.css';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

export default function UuidPage(): ReactNode {
  const [uuid, setUuid] = useState(() => generateUuid());
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setUuid(generateUuid());
    setCopied(false);
  };

  const copy = async () => {
    const success = await copyToClipboard(uuid);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Layout
      title={translate({id: 'uuid.title', message: 'UUID ジェネレーター'})}
      description={translate({
        id: 'uuid.description',
        message: 'UUID (v4) を生成するツール。ブラウザ内で処理されるためサーバーに送信されない。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="uuid.title">UUID ジェネレーター</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="uuid.subtitle">UUID (v4) を生成する。</Translate>
        </p>

        <div className={styles.card}>
          <code className={styles.uuidText}>{uuid}</code>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={generate}>
              <Translate id="uuid.generate">生成</Translate>
            </button>
            <button className={styles.actionBtnGhost} onClick={copy}>
              {copied ? (
                <Translate id="uuid.copied">コピーしました</Translate>
              ) : (
                <Translate id="uuid.copy">コピー</Translate>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
