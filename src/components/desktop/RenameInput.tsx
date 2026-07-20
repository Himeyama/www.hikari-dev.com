import {useEffect, useRef} from 'react';
import type {ReactNode} from 'react';

type Props = {
  initial: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
  className?: string;
};

/**
 * インライン リネーム用の入力欄。ブラウザの prompt を使わずデスクトップ内で
 * 名前を編集する。マウント時に拡張子を除いた部分を選択し、Enter で確定、
 * Escape / blur でキャンセルまたは確定する。
 */
export function RenameInput({initial, onCommit, onCancel, className}: Props): ReactNode {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.focus();
    const dot = initial.lastIndexOf('.');
    if (dot > 0) {
      el.setSelectionRange(0, dot);
    } else {
      el.select();
    }
  }, [initial]);

  const commit = () => {
    const v = ref.current?.value.trim() ?? '';
    if (v && v !== initial) {
      onCommit(v);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={ref}
      className={className}
      defaultValue={initial}
      spellCheck={false}
      autoComplete="off"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
    />
  );
}
