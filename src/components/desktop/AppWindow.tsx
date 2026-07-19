import {useMemo, useRef} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Translate, {translate} from '@docusaurus/Translate';
import type {MiniApp} from './apps';
import {usePointerDrag} from './usePointerDrag';
import styles from './desktop.module.css';

type Rect = {x: number; y: number; w: number; h: number};

type Props = {
  app: MiniApp;
  rect: Rect;
  z: number;
  maximized: boolean;
  minimized: boolean;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onDragState: (dragging: boolean) => void;
};

function MinimizeGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function RestoreGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5V3.5h7.5V11h-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AppWindow({
  app,
  rect,
  z,
  maximized,
  minimized,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onDragState,
}: Props): ReactNode {
  const rectRef = useRef(rect);
  rectRef.current = rect;

  // iframe src は memo 化して再レンダリングでリロードさせない
  const baseSrc = useBaseUrl(app.href);
  const src = useMemo(() => `${baseSrc}?embed=1`, [baseSrc]);

  const onTitlePointerDown = usePointerDrag({
    getStart: () => ({x: rectRef.current.x, y: rectRef.current.y}),
    onDragState,
    onMove: (nx, ny) => {
      if (!maximized) {
        onMove(nx, ny);
      }
    },
  });

  const restoreLabel = translate({id: 'desktop.window.restore', message: '元のサイズに戻す'});
  const maximizeLabel = translate({id: 'desktop.window.maximize', message: '最大化'});
  const minimizeLabel = translate({id: 'desktop.window.minimize', message: '最小化'});
  const closeLabel = translate({id: 'desktop.window.close', message: '閉じる'});

  return (
    <div
      className={clsx(
        styles.window,
        focused && styles.windowFocused,
        maximized && styles.windowMaximized,
        minimized && styles.windowHidden,
      )}
      style={
        maximized
          ? {zIndex: z}
          : {left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: z}
      }
      onPointerDownCapture={onFocus}
    >
      <div
        className={styles.titleBar}
        onPointerDown={(e) => {
          // ボタン上ではドラッグを開始しない (pointer capture が click を奪うため)
          if ((e.target as HTMLElement).closest('button')) {
            return;
          }
          onTitlePointerDown(e);
        }}
        onDoubleClick={onToggleMaximize}
      >
        <span className={styles.titleGlyph}>
          <app.Icon />
        </span>
        <span className={styles.titleText}>
          <Translate id={app.titleId}>{app.titleMessage}</Translate>
        </span>
        <div className={styles.titleButtons}>
          <button
            type="button"
            className={styles.titleButton}
            aria-label={minimizeLabel}
            title={minimizeLabel}
            onClick={onMinimize}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <MinimizeGlyph />
          </button>
          <button
            type="button"
            className={styles.titleButton}
            aria-label={maximized ? restoreLabel : maximizeLabel}
            title={maximized ? restoreLabel : maximizeLabel}
            onClick={onToggleMaximize}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </button>
          <button
            type="button"
            className={clsx(styles.titleButton, styles.titleButtonClose)}
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <CloseGlyph />
          </button>
        </div>
      </div>
      <div className={styles.windowBody}>
        <iframe className={styles.frame} src={src} title={app.titleMessage} loading="lazy" />
        {!focused && (
          <div
            className={styles.clickCatcher}
            onPointerDown={onFocus}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
