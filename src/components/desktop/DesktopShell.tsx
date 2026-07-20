import {useEffect, useReducer, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import {getAppById, FolderIcon, FileIcon} from './apps';
import type {MiniApp} from './apps';
import * as vfs from '../../lib/desktop/vfs';
import type {VfsEntry} from '../../lib/desktop/vfs';
import {DesktopIcon} from './DesktopIcon';
import {AppWindow} from './AppWindow';
import {Taskbar} from './Taskbar';
import styles from './desktop.module.css';

const STORAGE_KEY = 'hikari.desktop.v2';
const BRIDGE_SOURCE = 'hikari-desktop';
const TASKBAR_H = 48;
const DEFAULT_W = 960;
const DEFAULT_H = 640;
const MIN_W = 240;
const MIN_H = 160;

type Rect = {x: number; y: number; w: number; h: number};
export type SnapKind = 'none' | 'max' | 'left' | 'right';
type WinState = {
  windowId: string;
  href: string;
  param?: string;
  rect: Rect;
  snap: SnapKind;
  minimized: boolean;
  z: number;
};

export type DesktopState = {
  icons: Record<string, {x: number; y: number}>; // key = VFS 絶対パス
  windows: Record<string, WinState>; // key = windowId
  zTop: number;
};

type Viewport = {w: number; h: number};

type Action =
  | {type: 'OPEN'; windowId: string; href: string; param?: string; viewport: Viewport}
  | {type: 'CLOSE'; windowId: string}
  | {type: 'FOCUS'; windowId: string}
  | {type: 'MINIMIZE'; windowId: string}
  | {type: 'TOGGLE_MAXIMIZE'; windowId: string}
  | {type: 'SET_SNAP'; windowId: string; snap: SnapKind}
  | {type: 'RESIZE_WINDOW'; windowId: string; rect: Rect; viewport: Viewport}
  | {type: 'TASKBAR_CLICK'; windowId: string}
  | {type: 'MOVE_WINDOW'; windowId: string; x: number; y: number; viewport: Viewport}
  | {type: 'MOVE_ICON'; iconId: string; x: number; y: number; viewport: Viewport};

function clamp(v: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(v, min), max);
}

function reducer(state: DesktopState, action: Action): DesktopState {
  switch (action.type) {
    case 'OPEN': {
      const existing = state.windows[action.windowId];
      const zTop = state.zTop + 1;
      if (existing) {
        // すでに開いている: パラメーターを更新 (files/editor のパス切替) して前面へ
        return {
          ...state,
          windows: {
            ...state.windows,
            [action.windowId]: {
              ...existing,
              param: action.param ?? existing.param,
              minimized: false,
              z: zTop,
            },
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
          [action.windowId]: {
            windowId: action.windowId,
            href: action.href,
            param: action.param,
            rect: {x, y, w, h},
            snap: 'none',
            minimized: false,
            z: zTop,
          },
        },
        zTop,
      };
    }
    case 'CLOSE': {
      const {[action.windowId]: _removed, ...rest} = state.windows;
      return {...state, windows: rest};
    }
    case 'FOCUS': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const zTop = state.zTop + 1;
      return {
        ...state,
        windows: {...state.windows, [action.windowId]: {...win, z: zTop}},
        zTop,
      };
    }
    case 'MINIMIZE': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      return {
        ...state,
        windows: {...state.windows, [action.windowId]: {...win, minimized: true}},
      };
    }
    case 'TOGGLE_MAXIMIZE': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const zTop = state.zTop + 1;
      const snap: SnapKind = win.snap === 'max' ? 'none' : 'max';
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.windowId]: {...win, snap, minimized: false, z: zTop},
        },
        zTop,
      };
    }
    case 'SET_SNAP': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const zTop = state.zTop + 1;
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.windowId]: {...win, snap: action.snap, minimized: false, z: zTop},
        },
        zTop,
      };
    }
    case 'RESIZE_WINDOW': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const maxBottom = Math.max(0, vh - TASKBAR_H);
      // 幅・高さを最小値以上、ビューポート内に収める
      const w = clamp(action.rect.w, MIN_W, Math.max(MIN_W, vw));
      const h = clamp(action.rect.h, MIN_H, Math.max(MIN_H, maxBottom));
      const x = clamp(action.rect.x, 0, Math.max(0, vw - w));
      const y = clamp(action.rect.y, 0, Math.max(0, maxBottom - h));
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.windowId]: {...win, rect: {x, y, w, h}, snap: 'none'},
        },
      };
    }
    case 'TASKBAR_CLICK': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const isTop = win.z === state.zTop;
      if (win.minimized || !isTop) {
        const zTop = state.zTop + 1;
        return {
          ...state,
          windows: {
            ...state.windows,
            [action.windowId]: {...win, minimized: false, z: zTop},
          },
          zTop,
        };
      }
      return {
        ...state,
        windows: {...state.windows, [action.windowId]: {...win, minimized: true}},
      };
    }
    case 'MOVE_WINDOW': {
      const win = state.windows[action.windowId];
      if (!win) {
        return state;
      }
      const {w} = win.rect;
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const x = clamp(action.x, -(w - 80), vw - 80);
      const y = clamp(action.y, 0, Math.max(0, vh - TASKBAR_H - 32));
      // スナップ中のウィンドウをドラッグしたら解除してフローティングに戻す
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.windowId]: {...win, snap: 'none', rect: {...win.rect, x, y}},
        },
      };
    }
    case 'MOVE_ICON': {
      const vw = action.viewport.w;
      const vh = action.viewport.h;
      const x = clamp(action.x, 0, Math.max(0, vw - 84));
      const y = clamp(action.y, 0, Math.max(0, vh - TASKBAR_H - 96));
      return {
        ...state,
        icons: {...state.icons, [action.iconId]: {x, y}},
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
      windows: (parsed.windows as Record<string, WinState>) ?? {},
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

// ---- エントリのアイコン/ラベル解決 -----------------------------------------

function EntryGlyph({entry}: {entry: VfsEntry}): ReactNode {
  if (entry.node.type === 'folder') {
    return <FolderIcon />;
  }
  if (entry.node.type === 'link') {
    const app = entry.node.appId ? getAppById(entry.node.appId) : undefined;
    if (app) {
      return <app.Icon />;
    }
  }
  if (entry.node.type === 'file') {
    return <FileIcon />;
  }
  return <FileIcon />;
}

function EntryLabel({entry}: {entry: VfsEntry}): ReactNode {
  if (entry.node.type === 'link' && entry.node.appId) {
    const app = getAppById(entry.node.appId);
    if (app) {
      return <Translate id={app.titleId}>{app.titleMessage}</Translate>;
    }
  }
  return <>{entry.name}</>;
}

export function DesktopShell(): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapKind | null>(null);
  const [vfsVersion, setVfsVersion] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportH, setViewportH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  const getViewport = (): Viewport => ({w: window.innerWidth, h: window.innerHeight});

  // マウント中は navbar を隠す
  useEffect(() => {
    document.documentElement.classList.add('desktop-active');
    return () => {
      document.documentElement.classList.remove('desktop-active');
    };
  }, []);

  // VFS を初期シードし、変更を購読してアイコンを再描画
  useEffect(() => {
    vfs.ensureSeeded();
    setVfsVersion((v) => v + 1);
    const unsub = vfs.subscribe(() => setVfsVersion((v) => v + 1));
    return unsub;
  }, []);

  // Files/Editor iframe からの起動要求を受け取る
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as
        | {source?: string; type?: string; appId?: string; path?: string}
        | null;
      if (!d || d.source !== BRIDGE_SOURCE) {
        return;
      }
      const viewport = getViewport();
      if (d.type === 'open-app' && d.appId) {
        const app = getAppById(d.appId);
        if (app) {
          dispatch({type: 'OPEN', windowId: app.id, href: app.href, viewport});
        }
      } else if (d.type === 'open-editor' && d.path) {
        dispatch({type: 'OPEN', windowId: 'editor', href: '/editor', param: d.path, viewport});
      } else if (d.type === 'open-folder' && d.path) {
        dispatch({type: 'OPEN', windowId: 'files', href: '/files', param: d.path, viewport});
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
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

  // Desktop フォルダーのエントリ (vfsVersion 変化で再取得)
  const desktopEntries = (() => {
    void vfsVersion;
    return vfs.readDir(vfs.DESKTOP_PATH);
  })();

  const openEntry = (entry: VfsEntry) => {
    const viewport = getViewport();
    const {node} = entry;
    if (node.type === 'folder') {
      dispatch({type: 'OPEN', windowId: 'files', href: '/files', param: entry.path, viewport});
    } else if (node.type === 'link' && node.appId && node.href) {
      dispatch({type: 'OPEN', windowId: node.appId, href: node.href, viewport});
    } else if (node.type === 'file') {
      dispatch({type: 'OPEN', windowId: 'editor', href: '/editor', param: entry.path, viewport});
    }
  };

  // 開いているウィンドウ (windowId から MiniApp メタを解決)
  const openWindows = Object.values(state.windows)
    .map((win) => {
      const app = getAppById(win.windowId);
      return app ? {win, app} : null;
    })
    .filter((v): v is {win: WinState; app: MiniApp} => v !== null);

  return (
    <div
      className={clsx(styles.surface, dragging && styles.dragging)}
      onPointerDown={(e) => {
        // 何もない場所をクリックしたら選択解除
        if (e.target === e.currentTarget) {
          setSelectedIcon(null);
        }
      }}
    >
      <div
        className={styles.iconLayer}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedIcon(null);
          }
        }}
      >
        {desktopEntries.map((entry, index) => {
          const saved = state.icons[entry.path];
          const pos = saved ?? defaultIconPos(index, viewportH);
          return (
            <DesktopIcon
              key={entry.path}
              glyph={<EntryGlyph entry={entry} />}
              label={<EntryLabel entry={entry} />}
              x={pos.x}
              y={pos.y}
              selected={selectedIcon === entry.path}
              onSelect={() => setSelectedIcon(entry.path)}
              onOpen={() => openEntry(entry)}
              onMove={(x, y) =>
                dispatch({type: 'MOVE_ICON', iconId: entry.path, x, y, viewport: getViewport()})
              }
              onDragState={setDragging}
            />
          );
        })}
      </div>

      {openWindows.map(({win, app}) => {
        const focused = win.z === state.zTop && !win.minimized;
        // editor ウィンドウはファイル名をタイトルに使う
        const titleNode =
          win.windowId === 'editor' && win.param ? (
            <>{vfs.basename(win.param)}</>
          ) : (
            <Translate id={app.titleId}>{app.titleMessage}</Translate>
          );
        const titlePlain =
          win.windowId === 'editor' && win.param ? vfs.basename(win.param) : app.titleMessage;
        return (
          <AppWindow
            key={win.windowId}
            href={win.href}
            param={win.param}
            Icon={app.Icon}
            title={titleNode}
            titlePlain={titlePlain}
            rect={win.rect}
            z={win.z}
            snap={win.snap}
            minimized={win.minimized}
            focused={focused}
            onFocus={() => dispatch({type: 'FOCUS', windowId: win.windowId})}
            onClose={() => dispatch({type: 'CLOSE', windowId: win.windowId})}
            onMinimize={() => dispatch({type: 'MINIMIZE', windowId: win.windowId})}
            onToggleMaximize={() => dispatch({type: 'TOGGLE_MAXIMIZE', windowId: win.windowId})}
            onMove={(x, y) =>
              dispatch({type: 'MOVE_WINDOW', windowId: win.windowId, x, y, viewport: getViewport()})
            }
            onResize={(rect) =>
              dispatch({type: 'RESIZE_WINDOW', windowId: win.windowId, rect, viewport: getViewport()})
            }
            onSnapPreview={setSnapPreview}
            onSnapCommit={(snap) => dispatch({type: 'SET_SNAP', windowId: win.windowId, snap})}
            onDragState={setDragging}
          />
        );
      })}

      {snapPreview && snapPreview !== 'none' && (
        <div
          className={clsx(
            styles.snapPreview,
            snapPreview === 'max' && styles.snapPreviewMax,
            snapPreview === 'left' && styles.snapPreviewLeft,
            snapPreview === 'right' && styles.snapPreviewRight,
          )}
          aria-hidden="true"
        />
      )}

      <Taskbar
        windows={openWindows.map(({win, app}) => ({
          app,
          active: win.z === state.zTop && !win.minimized,
        }))}
        onItemClick={(windowId) => dispatch({type: 'TASKBAR_CLICK', windowId})}
      />
    </div>
  );
}
