import type React from 'react';

type DragOptions = {
  getStart: () => {x: number; y: number};
  onMove: (x: number, y: number, moved: number) => void;
  onDragState?: (dragging: boolean) => void;
  onEnd?: () => void;
};

/**
 * Pointer Events + pointer capture ベースの共通ドラッグフック。
 * アイコンとウィンドウのタイトルバー両方で使用する。
 * onMove の第 3 引数には開始点からの移動量 (px) を渡す。
 */
export function usePointerDrag(opts: DragOptions) {
  return (e: React.PointerEvent<HTMLElement>): void => {
    if (e.button !== 0) {
      return;
    }
    const el = e.currentTarget;
    const start = opts.getStart();
    const px = e.clientX;
    const py = e.clientY;
    el.setPointerCapture(e.pointerId);
    opts.onDragState?.(true);

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - px;
      const dy = ev.clientY - py;
      const moved = Math.hypot(dx, dy);
      opts.onMove(start.x + dx, start.y + dy, moved);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      opts.onDragState?.(false);
      opts.onEnd?.();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end, {once: true});
    el.addEventListener('pointercancel', end, {once: true});
  };
}
