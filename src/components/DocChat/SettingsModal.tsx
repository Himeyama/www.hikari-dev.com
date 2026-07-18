import type {MouseEvent, ReactNode} from 'react';
import {useEffect} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import {MODELS} from '../../lib/doc/ai-chat';
import styles from './styles.module.css';

// プロバイダごとにまとめて optgroup を作る (表示順は MODELS の並びを維持)
const MODELS_BY_PROVIDER = MODELS.reduce<Record<string, typeof MODELS>>((acc, m) => {
  (acc[m.provider] ??= []).push(m);
  return acc;
}, {});

interface SettingsModalProps {
  model: string;
  onChangeModel: (model: string) => void;
  onClose: () => void;
}

export function SettingsModal({
  model,
  onChangeModel,
  onClose,
}: SettingsModalProps): ReactNode {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            <Translate id="doc.modelSettings">モデル設定</Translate>
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
              <Translate id="doc.model">モデル</Translate>
            </label>
            <select value={model} onChange={(e) => onChangeModel(e.target.value)}>
              {Object.entries(MODELS_BY_PROVIDER).map(([provider, models]) => (
                <optgroup key={provider} label={provider}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnPrimary} onClick={onClose}>
            <Translate id="doc.close">閉じる</Translate>
          </button>
        </div>
      </div>
    </div>
  );
}
