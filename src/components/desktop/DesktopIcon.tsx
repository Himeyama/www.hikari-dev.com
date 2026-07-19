import {useRef} from 'react';
import type {ReactNode} from 'react';
import Translate from '@docusaurus/Translate';
import type {MiniApp} from './apps';
import {usePointerDrag} from './usePointerDrag';
import styles from './desktop.module.css';

const DRAG_THRESHOLD = 4;

type Props = {
  app: MiniApp;
  x: number;
  y: number;
  onOpen: () => void;
  onMove: (x: number, y: number) => void;
  onDragState: (dragging: boolean) => void;
};

export function DesktopIcon({app, x, y, onOpen, onMove, onDragState}: Props): ReactNode {
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
      className={styles.icon}
      style={{left: x, top: y}}
      onPointerDown={onPointerDown}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className={styles.iconGlyph}>
        <app.Icon />
      </span>
      <span className={styles.iconLabel}>
        <Translate id={app.titleId}>{app.titleMessage}</Translate>
      </span>
    </button>
  );
}
