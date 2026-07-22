import type React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {RenameInput} from './RenameInput';
import {VFS_ITEM_MIME, readVfsItemDrag} from '../../lib/desktop/dragDrop';
import styles from './desktop.module.css';

export type SelectModifiers = {ctrlKey: boolean; metaKey: boolean; shiftKey: boolean};

type Props = {
  path: string;
  isFolder: boolean;
  glyph: ReactNode;
  label: ReactNode;
  name: string;
  editing: boolean;
  x: number;
  y: number;
  selected: boolean;
  onOpen: () => void;
  onSelect: (mods: SelectModifiers) => void;
  onDropItem?: (sourcePath: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
};

export function DesktopIcon({
  path,
  isFolder,
  glyph,
  label,
  name,
  editing,
  x,
  y,
  selected,
  onOpen,
  onSelect,
  onDropItem,
  onContextMenu,
  onCommitRename,
  onCancelRename,
  registerRef,
}: Props): ReactNode {
  return (
    <button
      type="button"
      ref={registerRef}
      className={clsx(styles.icon, selected && styles.iconSelected)}
      style={{left: x, top: y}}
      draggable={!editing}
      onPointerDown={(e) => {
        if (editing) {
          return;
        }
        // 右クリック (button !== 0) は選択状態を変えず、そのまま onContextMenu に委ねる
        // (複数選択中に右クリックすると選択が解除されてしまうバグの修正)
        if (e.button === 0) {
          onSelect({ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey});
        }
      }}
      onDragStart={(e) => {
        if (editing) {
          e.preventDefault();
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(
          VFS_ITEM_MIME,
          JSON.stringify({
            path,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
          }),
        );
      }}
      onDragOver={(e) => {
        if (isFolder && e.dataTransfer.types.includes(VFS_ITEM_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={(e) => {
        if (!isFolder || !onDropItem || !e.dataTransfer.types.includes(VFS_ITEM_MIME)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const dragged = readVfsItemDrag(e.dataTransfer);
        if (dragged && dragged.path !== path) {
          onDropItem(dragged.path);
        }
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
