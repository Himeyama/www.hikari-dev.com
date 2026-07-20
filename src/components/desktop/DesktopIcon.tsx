import {useRef} from 'react';
import type React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {usePointerDrag} from './usePointerDrag';
import {RenameInput} from './RenameInput';
import styles from './desktop.module.css';

const DRAG_THRESHOLD = 4;

export type SelectModifiers = {ctrlKey: boolean; metaKey: boolean; shiftKey: boolean};

type Props = {
  glyph: ReactNode;
  label: ReactNode;
  name: string;
  editing: boolean;
  x: number;
  y: number;
  selected: boolean;
  onOpen: () => void;
  onSelect: (mods: SelectModifiers) => void;
  onMove: (x: number, y: number) => void;
  onDragState: (dragging: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
};

export function DesktopIcon({
  glyph,
  label,
  name,
  editing,
  x,
  y,
  selected,
  onOpen,
  onSelect,
  onMove,
  onDragState,
  onContextMenu,
  onCommitRename,
  onCancelRename,
  registerRef,
}: Props): ReactNode {
  const posRef = useRef({x, y});
  posRef.current = {x, y};
  const movedRef = useRef(false);

  const onPointerDown = usePointerDrag({
    getStart: () => posRef.current,
    onDragState: (d) => {
      if (d) {
        movedRef.current = false;
      }
      onDragState(d);
    },
    onMove: (nx, ny, moved) => {
      if (moved > DRAG_THRESHOLD) {
        movedRef.current = true;
        onMove(nx, ny);
      }
    },
  });

  return (
    <button
      type="button"
      ref={registerRef}
      className={clsx(styles.icon, selected && styles.iconSelected)}
      style={{left: x, top: y}}
      onPointerDown={(e) => {
        if (editing) {
          return;
        }
        // 右クリック (button !== 0) は選択状態を変えず、そのまま onContextMenu に委ねる
        // (複数選択中に右クリックすると選択が解除されてしまうバグの修正)
        if (e.button === 0) {
          onSelect({ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey});
        }
        onPointerDown(e);
      }}
      onDoubleClick={editing ? undefined : onOpen}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (editing) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className={styles.iconGlyph}>{glyph}</span>
      {editing ? (
        <RenameInput
          className={styles.iconRenameInput}
          initial={name}
          onCommit={onCommitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className={styles.iconLabel}>{label}</span>
      )}
    </button>
  );
}
