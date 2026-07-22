import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {usePointerDrag} from './usePointerDrag';
import styles from './desktop.module.css';

const WINDOW_W = 360;

type Props = {
  title: ReactNode;
  message: ReactNode;
  confirmLabel: ReactNode;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 確認用の小さなウィンドウ (削除確認など)。アプリの iframe ウィンドウと同じ
 * 見た目のタイトルバーを持ち、デスクトップ内で移動できる。背景を暗くするような
 * モーダル バックドロップは持たない (通常のウィンドウと同じ扱い)。
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: Props): ReactNode {
  const [pos, setPos] = useState(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const h = typeof window !== 'undefined' ? window.innerHeight : 768;
    return {x: Math.max(0, (w - WINDOW_W) / 2), y: Math.max(0, h / 2 - 120)};
  });
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm, onCancel]);

  const onTitleDrag = usePointerDrag({
    getStart: () => posRef.current,
    onMove: (x, y) => setPos({x: Math.max(0, x), y: Math.max(0, y)}),
  });

  return (
    <div
      className={clsx(styles.window, styles.windowFocused)}
      style={{left: pos.x, top: pos.y, width: WINDOW_W, zIndex: 5000}}
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className={styles.titleBar}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          onTitleDrag(e);
        }}
      >
        <span className={styles.titleText}>{title}</span>
        <div className={styles.titleButtons}>
          <button
            type="button"
            className={clsx(styles.titleButton, styles.titleButtonClose)}
            onClick={onCancel}
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className={clsx(styles.windowBody, styles.confirmBody)}>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.confirmCancelBtn} onClick={onCancel}>
            <Translate id="editor.dialog.cancel">キャンセル</Translate>
          </button>
          <button
            type="button"
            className={clsx(styles.confirmOkBtn, danger && styles.confirmOkBtnDanger)}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
