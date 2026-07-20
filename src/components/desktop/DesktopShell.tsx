import {useEffect, useReducer, useRef, useState} from 'react';
import type React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import {getAppById} from './apps';
import type {MiniApp} from './apps';
import * as vfs from '../../lib/desktop/vfs';
import type {VfsEntry} from '../../lib/desktop/vfs';
import {EntryGlyph, EntryLabel} from './entryView';
import {DesktopIcon} from './DesktopIcon';
import type {SelectModifiers} from './DesktopIcon';
import {AppWindow} from './AppWindow';
import {Taskbar} from './Taskbar';
import {ContextMenu} from './ContextMenu';
import type {ContextMenuItem} from './ContextMenu';
import styles from './desktop.module.css';

const STORAGE_KEY = 'hikari.desktop.v2';
const BRIDGE_SOURCE = 'hikari-desktop';
const TASKBAR_H = 48;
const DEFAULT_W = 960;
const DEFAULT_H = 640;
const MIN_W = 240;
const MIN_H = 160;
const MARQUEE_THRESHOLD = 4;

type MarqueeRect = {x0: number; y0: number; x1: number; y1: number};

type Rect = {x: number; y: number; w: number; h: number};
export type SnapKind = 'none' | 'max' | 'left' | 'right';
type WinState = {
  windowId: string;
  appId: string;
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
  | {
      type: 'OPEN';
      windowId: string;
      appId: string;
      href: string;
      param?: string;
      viewport: Viewport;
    }
  | {type: 'CLOSE'; windowId: string}
  | {type: 'FOCUS'; windowId: string}
  | {type: 'MINIMIZE'; windowId: string}
  | {type: 'TOGGLE_MAXIMIZE'; windowId: string}
  | {type: 'SET_SNAP'; windowId: string; snap: SnapKind}
  | {type: 'RESIZE_WINDOW'; windowId: string; rect: Rect; viewport: Viewport}
  | {type: 'TASKBAR_CLICK'; windowId: string}
  | {type: 'MOVE_WINDOW'; windowId: string; x: number; y: number; viewport: Viewport}
  | {type: 'MOVE_ICON'; iconId: string; x: number; y: number; viewport: Viewport}
  | {type: 'ARRANGE_ICONS'; paths: string[]; viewport: Viewport};

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
            appId: action.appId,
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
    case 'ARRANGE_ICONS': {
      const icons: Record<string, {x: number; y: number}> = {};
      action.paths.forEach((path, index) => {
        icons[path] = defaultIconPos(index, action.viewport.h);
      });
      return {...state, icons};
    }
    default:
      return state;
  }
}

// アプリごとに複数ウィンドウを開けるよう、開くたびに一意な windowId を発行する
function newWindowId(appId: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${appId}::${rand}`;
}

// ---- 壁紙 (Picsum Photos からランダム取得し、一定間隔で切り替える) ----
const WALLPAPER_STORAGE_KEY = 'hikari.desktop.wallpaper';
const WALLPAPER_INTERVAL_MS = 30 * 60 * 1000;

type WallpaperState = {seed: string; changedAt: number};

function randomSeed(): string {
  return Math.random().toString(36).slice(2);
}

function wallpaperUrl(seed: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1920/1080`;
}

function loadWallpaperState(): WallpaperState {
  try {
    const raw = window.localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WallpaperState>;
      if (typeof parsed.seed === 'string' && typeof parsed.changedAt === 'number') {
        return {seed: parsed.seed, changedAt: parsed.changedAt};
      }
    }
  } catch {
    /* ignore */
  }
  return {seed: randomSeed(), changedAt: Date.now()};
}

function saveWallpaperState(state: WallpaperState): void {
  try {
    window.localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota 等は無視 */
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
    const rawWindows = (parsed.windows as Record<string, WinState>) ?? {};
    // v2 以前の保存データには appId が無いため windowId から補完する
    const windows: Record<string, WinState> = {};
    for (const [id, win] of Object.entries(rawWindows)) {
      windows[id] = {...win, appId: win.appId ?? win.windowId};
    }
    return {
      icons: parsed.icons ?? {},
      windows,
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
  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [anchorIcon, setAnchorIcon] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const iconRefs = useRef(new Map<string, HTMLButtonElement>());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{x: number; y: number; entry: VfsEntry | null} | null>(null);
  const [taskbarMenu, setTaskbarMenu] = useState<{x: number; y: number; windowId: string} | null>(
    null,
  );
  const [homeMenu, setHomeMenu] = useState<{x: number; y: number} | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperState>(() => loadWallpaperState());
  const [wallpaperBgUrl, setWallpaperBgUrl] = useState<string | null>(null);
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

  // 壁紙を Picsum Photos から先読みし、読み込み完了後に切り替える (ちらつき防止)
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) {
        setWallpaperBgUrl(wallpaperUrl(wallpaper.seed));
      }
    };
    img.src = wallpaperUrl(wallpaper.seed);
    return () => {
      cancelled = true;
    };
  }, [wallpaper.seed]);

  // 30 分ごとに壁紙をランダムに切り替える (前回切替時刻からの残り時間で次回をスケジュール)
  useEffect(() => {
    const elapsed = Date.now() - wallpaper.changedAt;
    const remaining = Math.max(0, WALLPAPER_INTERVAL_MS - elapsed);
    const timer = setTimeout(() => {
      const next: WallpaperState = {seed: randomSeed(), changedAt: Date.now()};
      saveWallpaperState(next);
      setWallpaper(next);
    }, remaining);
    return () => clearTimeout(timer);
  }, [wallpaper.changedAt]);

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
          dispatch({
            type: 'OPEN',
            windowId: newWindowId(app.id),
            appId: app.id,
            href: app.href,
            viewport,
          });
        }
      } else if (d.type === 'open-editor' && d.path) {
        dispatch({
          type: 'OPEN',
          windowId: 'editor',
          appId: 'editor',
          href: '/editor',
          param: d.path,
          viewport,
        });
      } else if (d.type === 'open-folder' && d.path) {
        dispatch({
          type: 'OPEN',
          windowId: 'files',
          appId: 'files',
          href: '/files',
          param: d.path,
          viewport,
        });
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
      dispatch({
        type: 'OPEN',
        windowId: 'files',
        appId: 'files',
        href: '/files',
        param: entry.path,
        viewport,
      });
    } else if (node.type === 'link' && node.appId && node.href) {
      dispatch({
        type: 'OPEN',
        windowId: newWindowId(node.appId),
        appId: node.appId,
        href: node.href,
        viewport,
      });
    } else if (node.type === 'file') {
      dispatch({
        type: 'OPEN',
        windowId: 'editor',
        appId: 'editor',
        href: '/editor',
        param: entry.path,
        viewport,
      });
    }
  };

  // ---- 作成 / リネーム / 削除 (Desktop フォルダー内) ----
  const newFolder = () => {
    const p = vfs.uniqueChildPath(
      vfs.DESKTOP_PATH,
      translate({id: 'files.newFolderName', message: '新しいフォルダー'}),
    );
    vfs.mkdir(p);
    setSelectedIcons(new Set([p]));
    setAnchorIcon(p);
    setRenaming(p);
  };

  const newFile = () => {
    const p = vfs.uniqueChildPath(
      vfs.DESKTOP_PATH,
      translate({id: 'files.newFileName', message: '新しいファイル.txt'}),
    );
    vfs.createFile(p, '');
    setSelectedIcons(new Set([p]));
    setAnchorIcon(p);
    setRenaming(p);
  };

  const commitRename = (entry: VfsEntry, name: string) => {
    const newPath = vfs.rename(entry.path, name);
    setRenaming(null);
    if (newPath) {
      setSelectedIcons(new Set([newPath]));
      setAnchorIcon(newPath);
    }
  };

  const doDelete = (paths: string[]) => {
    paths.forEach((p) => vfs.remove(p));
    setSelectedIcons(new Set());
    setAnchorIcon(null);
    setRenaming(null);
  };

  // ---- 選択 (Ctrl 複数選択 / Shift 範囲選択) ----
  const selectWith = (path: string, mods: SelectModifiers) => {
    if (mods.shiftKey && anchorIcon) {
      const order = desktopEntries.map((entry) => entry.path);
      const ai = order.indexOf(anchorIcon);
      const pi = order.indexOf(path);
      if (ai !== -1 && pi !== -1) {
        const [lo, hi] = ai < pi ? [ai, pi] : [pi, ai];
        setSelectedIcons(new Set(order.slice(lo, hi + 1)));
        return;
      }
    }
    if (mods.ctrlKey || mods.metaKey) {
      setSelectedIcons((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
      setAnchorIcon(path);
      return;
    }
    setSelectedIcons(new Set([path]));
    setAnchorIcon(path);
  };

  // ---- 矩形 (ラバーバンド) 選択 ----
  const onLayerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) {
      return;
    }
    const additive = e.ctrlKey || e.metaKey;
    const baseSelection = additive ? new Set(selectedIcons) : new Set<string>();
    const startX = e.clientX;
    const startY = e.clientY;
    const el = e.currentTarget;
    let moved = false;
    el.setPointerCapture(e.pointerId);
    if (!additive) {
      setSelectedIcons(new Set());
      setAnchorIcon(null);
    }

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) <= MARQUEE_THRESHOLD) {
        return;
      }
      moved = true;
      const rect: MarqueeRect = {
        x0: Math.min(startX, ev.clientX),
        y0: Math.min(startY, ev.clientY),
        x1: Math.max(startX, ev.clientX),
        y1: Math.max(startY, ev.clientY),
      };
      setMarquee(rect);
      const hit = new Set(baseSelection);
      iconRefs.current.forEach((iconEl, path) => {
        const r = iconEl.getBoundingClientRect();
        if (r.left < rect.x1 && r.right > rect.x0 && r.top < rect.y1 && r.bottom > rect.y0) {
          hit.add(path);
        }
      });
      setSelectedIcons(hit);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      setMarquee(null);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end, {once: true});
    el.addEventListener('pointercancel', end, {once: true});
  };

  // ---- アイコンの整列 ----
  const TYPE_ORDER: Record<string, number> = {folder: 0, link: 1, file: 2};

  const arrangeIcons = (order: 'name' | 'type') => {
    const entries = [...desktopEntries];
    if (order === 'name') {
      entries.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    } else if (order === 'type') {
      entries.sort((a, b) => {
        const diff = (TYPE_ORDER[a.node.type] ?? 99) - (TYPE_ORDER[b.node.type] ?? 99);
        return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ja');
      });
    }
    dispatch({
      type: 'ARRANGE_ICONS',
      paths: entries.map((entry) => entry.path),
      viewport: getViewport(),
    });
  };

  const openMenu = (e: React.MouseEvent, entry: VfsEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (entry && !selectedIcons.has(entry.path)) {
      setSelectedIcons(new Set([entry.path]));
      setAnchorIcon(entry.path);
    }
    setMenu({x: e.clientX, y: e.clientY, entry});
  };

  const menuItems = (m: {entry: VfsEntry | null}): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        type: 'item',
        label: <Translate id="files.newFolder">新しいフォルダー</Translate>,
        onClick: newFolder,
      },
      {
        type: 'item',
        label: <Translate id="files.newFile">新しいファイル</Translate>,
        onClick: newFile,
      },
    ];
    if (!m.entry) {
      items.push(
        {type: 'separator'},
        {
          type: 'item',
          label: <Translate id="desktop.sortByName">名前順に整列</Translate>,
          onClick: () => arrangeIcons('name'),
        },
        {
          type: 'item',
          label: <Translate id="desktop.sortByType">種類ごとに整列</Translate>,
          onClick: () => arrangeIcons('type'),
        },
      );
    }
    if (m.entry) {
      const entry = m.entry;
      const targets =
        selectedIcons.size > 1 && selectedIcons.has(entry.path)
          ? desktopEntries.filter((e) => selectedIcons.has(e.path))
          : [entry];
      items.push({type: 'separator'});
      if (targets.length === 1) {
        items.push(
          {
            type: 'item',
            label: <Translate id="files.open">開く</Translate>,
            onClick: () => openEntry(targets[0]),
          },
          {
            type: 'item',
            label: <Translate id="files.rename">名前の変更</Translate>,
            onClick: () => setRenaming(targets[0].path),
          },
        );
      }
      items.push({
        type: 'item',
        danger: true,
        label: <Translate id="files.delete">削除</Translate>,
        onClick: () => doDelete(targets.map((t) => t.path)),
      });
    }
    return items;
  };

  // デスクトップを初期状態に戻す (VFS のファイル/フォルダー + アイコン配置・ウィンドウ状態を破棄)
  const resetDesktop = () => {
    vfs.resetAll();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* quota 等は無視 */
    }
    window.location.reload();
  };

  // 開いているウィンドウ (windowId から MiniApp メタを解決)
  const openWindows = Object.values(state.windows)
    .map((win) => {
      const app = getAppById(win.appId);
      return app ? {win, app} : null;
    })
    .filter((v): v is {win: WinState; app: MiniApp} => v !== null);

  return (
    <div
      className={clsx(styles.surface, dragging && styles.dragging)}
      style={wallpaperBgUrl ? {backgroundImage: `url(${wallpaperBgUrl})`} : undefined}
    >
      <div
        className={styles.iconLayer}
        onPointerDown={onLayerPointerDown}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            openMenu(e, null);
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
              name={entry.name}
              editing={renaming === entry.path}
              x={pos.x}
              y={pos.y}
              selected={selectedIcons.has(entry.path)}
              onSelect={(mods) => selectWith(entry.path, mods)}
              onOpen={() => openEntry(entry)}
              onMove={(x, y) =>
                dispatch({type: 'MOVE_ICON', iconId: entry.path, x, y, viewport: getViewport()})
              }
              onDragState={setDragging}
              onContextMenu={(e) => openMenu(e, entry)}
              onCommitRename={(name) => commitRename(entry, name)}
              onCancelRename={() => setRenaming(null)}
              registerRef={(el) => {
                if (el) {
                  iconRefs.current.set(entry.path, el);
                } else {
                  iconRefs.current.delete(entry.path);
                }
              }}
            />
          );
        })}
      </div>

      {marquee && (
        <div
          className={styles.marquee}
          style={{
            left: marquee.x0,
            top: marquee.y0,
            width: marquee.x1 - marquee.x0,
            height: marquee.y1 - marquee.y0,
          }}
          aria-hidden="true"
        />
      )}

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
          windowId: win.windowId,
          app,
          active: win.z === state.zTop && !win.minimized,
        }))}
        onItemClick={(windowId) => dispatch({type: 'TASKBAR_CLICK', windowId})}
        onItemContextMenu={(e, windowId) => {
          e.preventDefault();
          e.stopPropagation();
          setTaskbarMenu({x: e.clientX, y: e.clientY, windowId});
        }}
        onHomeContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHomeMenu({x: e.clientX, y: e.clientY});
        }}
      />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu)}
          onClose={() => setMenu(null)}
        />
      )}

      {taskbarMenu && (
        <ContextMenu
          x={taskbarMenu.x}
          y={taskbarMenu.y}
          items={[
            {
              type: 'item',
              danger: true,
              label: <Translate id="desktop.taskbar.close">閉じる</Translate>,
              onClick: () => dispatch({type: 'CLOSE', windowId: taskbarMenu.windowId}),
            },
          ]}
          onClose={() => setTaskbarMenu(null)}
        />
      )}

      {homeMenu && (
        <ContextMenu
          x={homeMenu.x}
          y={homeMenu.y}
          items={[
            {
              type: 'item',
              danger: true,
              label: <Translate id="desktop.reset">デスクトップをリセット</Translate>,
              onClick: resetDesktop,
            },
          ]}
          onClose={() => setHomeMenu(null)}
        />
      )}
    </div>
  );
}
