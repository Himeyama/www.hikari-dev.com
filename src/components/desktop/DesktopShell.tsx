import {useEffect, useReducer, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {MINI_APPS, getAppById} from './apps';
import {DesktopIcon} from './DesktopIcon';
import {AppWindow} from './AppWindow';
import {Taskbar} from './Taskbar';
import styles from './desktop.module.css';

const STORAGE_KEY = 'hikari.desktop.v1';
const TASKBAR_H = 48;
const DEFAULT_W = 960;
const DEFAULT_H = 640;

type Rect = {x: number; y: number; w: number; h: number};
type WinState = {
  appId: string;
  rect: Rect;
  maximized: boolean;
  minimized: boolean;
  z: number;
};

export type DesktopState = {
  icons: Record<string, {x: number; y: number}>;
  windows: Record<string, WinState>;
  zTop: number;
};

type Viewport = {w: number; h: number};

type Action =
  | {type: 'OPEN'; appId: string; viewport: Viewport}
  | {type: 'CLOSE'; appId: string}
  | {type: 'FOCUS'; appId: string}
  | {type: 'MINIMIZE'; appId: string}
  | {type: 'TOGGLE_MAXIMIZE'; appId: string}
  | {type: 'TASKBAR_CLICK'; appId: string}
  | {type: 'MOVE_WINDOW'; appId: string; x: number; y: number; viewport: Viewport}
  | {type: 'MOVE_ICON'; appId: string; x: number; y: number; viewport: Viewport};

function clamp(v: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(v, min), max);
}

function reducer(state: DesktopState, action: Action): DesktopState {
  switch (action.type) {
    case 'OPEN': {
      const existing = state.windows[action.appId];
      const zTop = state.zTop + 1;
      if (existing) {
        return {
          ...state,
          windows: {
            ...state.windows,
            [action.appId]: {...existing, minimized: false, z: zTop},
          },
          zTop,
        };
      }
      const n = Object.keys(state.windows).length;
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const w = Math.min(DEFAULT_W, Math.max(320, vw - 40));
      const h = Math.min(DEFAULT_H, Math.max(240, vh - TASKBAR_H - 40));
      const x = clamp(80 + n * 32, 0, Math.max(0, vw - w));
      const y = clamp(48 + n * 32, 0, Math.max(0, vh - TASKBAR_H - h));
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.appId]: {
            appId: action.appId,
            rect: {x, y, w, h},
            maximized: false,
            minimized: false,
            z: zTop,
          },
        },
        zTop,
      };
    }
    case 'CLOSE': {
      const {[action.appId]: _removed, ...rest} = state.windows;
      return {...state, windows: rest};
    }
    case 'FOCUS': {
      const win = state.windows[action.appId];
      if (!win) {
        return state;
      }
      const zTop = state.zTop + 1;
      return {
        ...state,
        windows: {...state.windows, [action.appId]: {...win, z: zTop}},
        zTop,
      };
    }
    case 'MINIMIZE': {
      const win = state.windows[action.appId];
      if (!win) {
        return state;
      }
      return {
        ...state,
        windows: {...state.windows, [action.appId]: {...win, minimized: true}},
      };
    }
    case 'TOGGLE_MAXIMIZE': {
      const win = state.windows[action.appId];
      if (!win) {
        return state;
      }
      const zTop = state.zTop + 1;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.appId]: {...win, maximized: !win.maximized, minimized: false, z: zTop},
        },
        zTop,
      };
    }
    case 'TASKBAR_CLICK': {
      const win = state.windows[action.appId];
      if (!win) {
        return state;
      }
      const isTop = win.z === state.zTop;
      if (win.minimized || !isTop) {
        const zTop = state.zTop + 1;
        return {
          ...state,
          windows: {...state.windows, [action.appId]: {...win, minimized: false, z: zTop}},
          zTop,
        };
      }
      return {
        ...state,
        windows: {...state.windows, [action.appId]: {...win, minimized: true}},
      };
    }
    case 'MOVE_WINDOW': {
      const win = state.windows[action.appId];
      if (!win || win.maximized) {
        return state;
      }
      const {w, h} = win.rect;
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const x = clamp(action.x, -(w - 80), vw - 80);
      const y = clamp(action.y, 0, Math.max(0, vh - TASKBAR_H - 32));
      return {
        ...state,
        windows: {...state.windows, [action.appId]: {...win, rect: {...win.rect, x, y}}},
      };
    }
    case 'MOVE_ICON': {
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const x = clamp(action.x, 0, Math.max(0, vw - 84));
      const y = clamp(action.y, 0, Math.max(0, vh - TASKBAR_H - 96));
      return {
        ...state,
        icons: {...state.icons, [action.appId]: {x, y}},
      };
    }
    default:
      return state;
  }
}

function emptyState(): DesktopState {
  return {icons: {}, windows: {}, zTop: 0};
}

function initState(): DesktopState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as Partial<DesktopState>;
    return {
      icons: parsed.icons ?? {},
      windows: parsed.windows ?? {},
      zTop: parsed.zTop ?? 0,
    };
  } catch {
    return emptyState();
  }
}

// アイコンのデフォルト配置 (縦方向カラムグリッド)
const CELL_W = 96;
const CELL_H = 104;
const START_X = 16;
const START_Y = 16;

function defaultIconPos(index: number, viewportH: number): {x: number; y: number} {
  const usableH = Math.max(CELL_H, viewportH - TASKBAR_H - START_Y);
  const perColumn = Math.max(1, Math.floor(usableH / CELL_H));
  const col = Math.floor(index / perColumn);
  const row = index % perColumn;
  return {x: START_X + col * CELL_W, y: START_Y + row * CELL_H};
}

export function DesktopShell(): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [dragging, setDragging] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  // マウント中は navbar を隠す
  useEffect(() => {
    document.documentElement.classList.add('desktop-active');
    return () => {
      document.documentElement.classList.remove('desktop-active');
    };
  }, []);

  // ビューポート高さ追従 (アイコンのデフォルト配置に使用)
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // localStorage デバウンス保存
  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* quota 等は無視 */
      }
    }, 300);
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [state]);

  const getViewport = (): Viewport => ({w: window.innerWidth, h: window.innerHeight});

  const openWindows = MINI_APPS.filter((app) => state.windows[app.id]);

  return (
    <div className={clsx(styles.surface, dragging && styles.dragging)}>
      <div className={styles.iconLayer}>
        {MINI_APPS.map((app, index) => {
          const saved = state.icons[app.id];
          const pos = saved ?? defaultIconPos(index, viewportH);
          return (
            <DesktopIcon
              key={app.id}
              app={app}
              x={pos.x}
              y={pos.y}
              onOpen={() => dispatch({type: 'OPEN', appId: app.id, viewport: getViewport()})}
              onMove={(x, y) =>
                dispatch({type: 'MOVE_ICON', appId: app.id, x, y, viewport: getViewport()})
              }
              onDragState={setDragging}
            />
          );
        })}
      </div>

      {openWindows.map((app) => {
        const win = state.windows[app.id];
        const focused = win.z === state.zTop && !win.minimized;
        return (
          <AppWindow
            key={app.id}
            app={app}
            rect={win.rect}
            z={win.z}
            maximized={win.maximized}
            minimized={win.minimized}
            focused={focused}
            onFocus={() => dispatch({type: 'FOCUS', appId: app.id})}
            onClose={() => dispatch({type: 'CLOSE', appId: app.id})}
            onMinimize={() => dispatch({type: 'MINIMIZE', appId: app.id})}
            onToggleMaximize={() => dispatch({type: 'TOGGLE_MAXIMIZE', appId: app.id})}
            onMove={(x, y) =>
              dispatch({type: 'MOVE_WINDOW', appId: app.id, x, y, viewport: getViewport()})
            }
            onDragState={setDragging}
          />
        );
      })}

      <Taskbar
        windows={openWindows.map((app) => {
          const win = state.windows[app.id];
          return {
            app: getAppById(app.id)!,
            active: win.z === state.zTop && !win.minimized,
          };
        })}
        onItemClick={(appId) => dispatch({type: 'TASKBAR_CLICK', appId})}
      />
    </div>
  );
}
