import {useRef} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {usePointerDrag} from './usePointerDrag';
import styles from './desktop.module.css';

const DRAG_THRESHOLD = 4;

type Props = {
  glyph: ReactNode;
  label: ReactNode;
  x: number;
  y: number;
  selected: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDragState: (dragging: boolean) => void;
};

export function DesktopIcon({
  glyph,
  label,
  x,
  y,
  selected,
  onOpen,
  onSelect,
  onMove,
  onDragState,
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
      className={clsx(styles.icon, selected && styles.iconSelected)}
      style={{left: x, top: y}}
      onPointerDown={(e) => {
        onSelect();
        onPointerDown(e);
      }}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className={styles.iconGlyph}>{glyph}</span>
      <span className={styles.iconLabel}>{label}</span>
    </button>
  );
}
