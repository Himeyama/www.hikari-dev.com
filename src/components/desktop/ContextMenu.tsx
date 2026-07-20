import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import styles from './ContextMenu.module.css';

export type ContextMenuItem =
  | {
      type: 'item';
      label: ReactNode;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | {type: 'separator'};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

/**
 * 右クリック コンテキスト メニュー。デスクトップと Files アプリで共用する。
 * 外側クリック・Escape・ウィンドウ blur で閉じ、画面外にはみ出さないよう位置を補正する。
 */
export function ContextMenu({x, y, items, onClose}: Props): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({x, y});

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (x + rect.width > window.innerWidth) {
      nx = Math.max(4, window.innerWidth - rect.width - 4);
    }
    if (y + rect.height > window.innerHeight) {
      ny = Math.max(4, window.innerHeight - rect.height - 4);
    }
    setPos({x: nx, y: ny});
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onClose);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={styles.menu}
      style={{left: pos.x, top: pos.y}}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it.type === 'separator' ? (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`sep-${i}`} className={styles.separator} />
        ) : (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={`item-${i}`}
            type="button"
            role="menuitem"
            className={clsx(styles.item, it.danger && styles.itemDanger)}
            disabled={it.disabled}
            onClick={() => {
              it.onClick();
              onClose();
            }}
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}
