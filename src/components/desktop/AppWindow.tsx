import {useMemo, useRef} from 'react';
import type React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Translate, {translate} from '@docusaurus/Translate';
import type {MiniApp} from './apps';
import type {SnapKind} from './DesktopShell';
import {usePointerDrag} from './usePointerDrag';
import styles from './desktop.module.css';

type Rect = {x: number; y: number; w: number; h: number};

const MIN_W = 240;
const MIN_H = 160;
// 画面端スナップの検出しきい値 (px)
const EDGE = 12;

// 8 方向のリサイズ ハンドル定義
const RESIZE_DIRS: {dir: string; cls: keyof typeof styles}[] = [
  {dir: 'n', cls: 'resizeN'},
  {dir: 's', cls: 'resizeS'},
  {dir: 'e', cls: 'resizeE'},
  {dir: 'w', cls: 'resizeW'},
  {dir: 'ne', cls: 'resizeNE'},
  {dir: 'nw', cls: 'resizeNW'},
  {dir: 'se', cls: 'resizeSE'},
  {dir: 'sw', cls: 'resizeSW'},
];

type Props = {
  app: MiniApp;
  rect: Rect;
  z: number;
  snap: SnapKind;
  minimized: boolean;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (rect: Rect) => void;
  onSnapPreview: (snap: SnapKind | null) => void;
  onSnapCommit: (snap: SnapKind) => void;
  onDragState: (dragging: boolean) => void;
};

// 生ポインタ座標から吸着ゾーンを判定
function detectZone(cx: number, cy: number): SnapKind {
  if (cy <= EDGE) {
    return 'max';
  }
  if (cx <= EDGE) {
    return 'left';
  }
  if (cx >= window.innerWidth - EDGE) {
    return 'right';
  }
  return 'none';
}

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
  snap,
  minimized,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onResize,
  onSnapPreview,
  onSnapCommit,
  onDragState,
}: Props): ReactNode {
  const rectRef = useRef(rect);
  rectRef.current = rect;
  const snapRef = useRef(snap);
  snapRef.current = snap;
  // タイトル ドラッグ中の状態 (開始時スナップ・現在の吸着ゾーン)
  const titleDragRef = useRef<{snapAtStart: SnapKind; zone: SnapKind}>({
    snapAtStart: 'none',
    zone: 'none',
  });

  // iframe src は memo 化して再レンダリングでリロードさせない
  const baseSrc = useBaseUrl(app.href);
  const src = useMemo(() => `${baseSrc}?embed=1`, [baseSrc]);

  const onTitleDrag = usePointerDrag({
    getStart: () => ({x: rectRef.current.x, y: rectRef.current.y}),
    onDragState,
    onMove: (nx, ny, _moved, cx, cy) => {
      const t = titleDragRef.current;
      if (t.snapAtStart !== 'none') {
        // スナップ状態から掴んだ場合はフローティングに戻し、カーソル中心へ追従
        const r = rectRef.current;
        onMove(cx - r.w / 2, cy - 18);
      } else {
        onMove(nx, ny);
      }
      const zone = detectZone(cx, cy);
      t.zone = zone;
      onSnapPreview(zone === 'none' ? null : zone);
    },
    onEnd: () => {
      const {zone} = titleDragRef.current;
      onSnapPreview(null);
      titleDragRef.current = {snapAtStart: 'none', zone: 'none'};
      if (zone !== 'none') {
        onSnapCommit(zone);
      }
    },
  });

  // リサイズ ハンドル (usePointerDrag を介さず方向別に rect を計算)
  const onResizeHandleDown = (e: React.PointerEvent<HTMLElement>): void => {
    if (e.button !== 0) {
      return;
    }
    const el = e.currentTarget;
    const dir = el.dataset.dir ?? '';
    const start = {...rectRef.current};
    const right = start.x + start.w;
    const bottom = start.y + start.h;
    const px = e.clientX;
    const py = e.clientY;
    el.setPointerCapture(e.pointerId);
    onDragState(true);

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - px;
      const dy = ev.clientY - py;
      let {x, y, w, h} = start;
      if (dir.includes('e')) {
        w = Math.max(MIN_W, start.w + dx);
      }
      if (dir.includes('s')) {
        h = Math.max(MIN_H, start.h + dy);
      }
      if (dir.includes('w')) {
        x = Math.max(0, Math.min(start.x + dx, right - MIN_W));
        w = right - x;
      }
      if (dir.includes('n')) {
        y = Math.max(0, Math.min(start.y + dy, bottom - MIN_H));
        h = bottom - y;
      }
      onResize({x, y, w, h});
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      onDragState(false);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end, {once: true});
    el.addEventListener('pointercancel', end, {once: true});
  };

  const restoreLabel = translate({id: 'desktop.window.restore', message: '元のサイズに戻す'});
  const maximizeLabel = translate({id: 'desktop.window.maximize', message: '最大化'});
  const minimizeLabel = translate({id: 'desktop.window.minimize', message: '最小化'});
  const closeLabel = translate({id: 'desktop.window.close', message: '閉じる'});

  return (
    <div
      className={clsx(
        styles.window,
        focused && styles.windowFocused,
        snap === 'max' && styles.windowMaximized,
        snap === 'left' && styles.windowSnapLeft,
        snap === 'right' && styles.windowSnapRight,
        minimized && styles.windowHidden,
      )}
      style={
        snap === 'none'
          ? {left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: z}
          : {zIndex: z}
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
          titleDragRef.current = {snapAtStart: snapRef.current, zone: 'none'};
          onTitleDrag(e);
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
            aria-label={snap === 'max' ? restoreLabel : maximizeLabel}
            title={snap === 'max' ? restoreLabel : maximizeLabel}
            onClick={onToggleMaximize}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {snap === 'max' ? <RestoreGlyph /> : <MaximizeGlyph />}
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
      {snap === 'none' &&
        RESIZE_DIRS.map(({dir, cls}) => (
          <div
            key={dir}
            className={clsx(styles.resizeHandle, styles[cls])}
            data-dir={dir}
            onPointerDown={onResizeHandleDown}
            aria-hidden="true"
          />
        ))}
    </div>
  );
}
