import type {ChangeEvent, MouseEvent, ReactNode} from 'react';
import {useEffect, useState} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import {loadApiKey, saveApiKey} from '../../lib/doc/ai-chat';
import styles from './styles.module.css';

interface ApiKeyModalProps {
  onClose: () => void;
}

export function ApiKeyModal({onClose}: ApiKeyModalProps): ReactNode {
  const [key, setKey] = useState(() => loadApiKey());
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSave() {
    saveApiKey(key);
    setSaved(true);
    setTimeout(onClose, 700);
  }

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            <Translate id="doc.apiSettings">API 設定</Translate>
          </span>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label={translate({id: 'doc.dismiss', message: '閉じる'})}
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label>
              <Translate id="doc.apiKeyLabel">OpenRouter API キー</Translate>
            </label>
            <div className={styles.keyRow}>
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setKey(e.target.value);
                  setSaved(false);
                }}
                placeholder="sk-or-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className={styles.keyToggle}
                onClick={() => setShow((v) => !v)}
              >
                {show
                  ? translate({id: 'doc.hide', message: '非表示'})
                  : translate({id: 'doc.show', message: '表示'})}
              </button>
            </div>
          </div>
          <p className={styles.modalHint}>
            <Translate id="doc.apiKeyHint">
              ブラウザの localStorage に保存される。サーバーには送信されない。
            </Translate>
          </p>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            <Translate id="doc.cancel">キャンセル</Translate>
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? (
              <Translate id="doc.saved">保存しました</Translate>
            ) : (
              <Translate id="doc.save">保存</Translate>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
