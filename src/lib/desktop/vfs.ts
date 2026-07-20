// 仮想ファイルシステム (VFS)
//
// localStorage キー hikari.vfs.v1 にフラット マップ (絶対パス -> ノード) で
// ツリーを保存する。空フォルダーも 1 エントリとして表現でき、パス ベース API が
// 単純になる。デスクトップ (親ウィンドウ) と Files/Editor (iframe) は同一オリジンの
// localStorage を共有し、subscribe() が storage イベント (別ウィンドウ発) と
// vfs-change CustomEvent (同一ウィンドウ発) の両方を購読して同期する。

import {MINI_APPS} from '../../components/desktop/apps';

const STORAGE_KEY = 'hikari.vfs.v1';
const CHANGE_EVENT = 'vfs-change';

export const DESKTOP_PATH = '/home/user/Desktop';

export type VfsNodeType = 'folder' | 'file' | 'link';

export interface VfsNode {
  type: VfsNodeType;
  createdAt: number;
  modifiedAt: number;
  /** file: 中身 */
  content?: string;
  /** link: ミニアプリのルート (例 "/uuid") */
  href?: string;
  /** link: アイコン/翻訳解決用の appId (例 "uuid") */
  appId?: string;
}

/** readDir が返すエントリ (絶対パス付き) */
export interface VfsEntry {
  path: string;
  name: string;
  node: VfsNode;
}

interface VfsData {
  version: 1;
  nodes: Record<string, VfsNode>;
  /** 削除済みシード link の appId (再シード抑止) */
  removedLinks: string[];
}

// ---- パス ユーティリティ ----------------------------------------------------

/** 末尾スラッシュを除去し正規化する ("/" はそのまま) */
export function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  // 連続スラッシュを 1 つに
  path = path.replace(/\/+/g, '/');
  // 末尾スラッシュ除去 (ルート除く)
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
}

/** 親ディレクトリのパスを返す (ルートの親はルート) */
export function parentPath(path: string): string {
  const p = normalizePath(path);
  if (p === '/') {
    return '/';
  }
  const idx = p.lastIndexOf('/');
  return idx <= 0 ? '/' : p.slice(0, idx);
}

/** パス末尾のセグメント (表示名) を返す */
export function basename(path: string): string {
  const p = normalizePath(path);
  if (p === '/') {
    return '/';
  }
  return p.slice(p.lastIndexOf('/') + 1);
}

/** 親パスと名前を結合する */
export function joinPath(parent: string, name: string): string {
  return normalizePath(parent + '/' + name);
}

// ---- 永続化 ----------------------------------------------------------------

function emptyData(): VfsData {
  return {version: 1, nodes: {}, removedLinks: []};
}

function load(): VfsData {
  if (typeof window === 'undefined') {
    return emptyData();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyData();
    }
    const parsed = JSON.parse(raw) as Partial<VfsData>;
    return {
      version: 1,
      nodes: parsed.nodes ?? {},
      removedLinks: parsed.removedLinks ?? [],
    };
  } catch {
    return emptyData();
  }
}

function save(data: VfsData): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota 等は無視 */
  }
  // 同一ウィンドウ内の購読者へ通知 (storage イベントは自ウィンドウでは発火しない)
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* 環境非対応時は無視 */
  }
}

// ---- シード ----------------------------------------------------------------

/** デスクトップに常設シードする特殊アプリの link 情報 */
const FILES_LINK = {appId: 'files', href: '/files'};
const EDITOR_LINK = {appId: 'editor', href: '/editor'};

function ensureFolder(data: VfsData, path: string): void {
  const p = normalizePath(path);
  if (p === '/') {
    return;
  }
  if (!data.nodes[p]) {
    const now = Date.now();
    data.nodes[p] = {type: 'folder', createdAt: now, modifiedAt: now};
  }
}

/**
 * 初回起動時、または MINI_APPS に新規アプリが増えたとき、Desktop に
 * ミニアプリの link ノードをシードする。removedLinks に含まれる appId は
 * ユーザーが削除したものとして再シードしない。
 */
export function ensureSeeded(): void {
  const data = load();
  let changed = false;

  const before = JSON.stringify(data.nodes);

  ensureFolder(data, '/home');
  ensureFolder(data, '/home/user');
  ensureFolder(data, DESKTOP_PATH);

  const links: {appId: string; href: string}[] = [
    FILES_LINK,
    EDITOR_LINK,
    ...MINI_APPS.map((app) => ({appId: app.id, href: app.href})),
  ];

  const now = Date.now();
  for (const {appId, href} of links) {
    if (data.removedLinks.includes(appId)) {
      continue;
    }
    const path = joinPath(DESKTOP_PATH, appId);
    if (!data.nodes[path]) {
      data.nodes[path] = {
        type: 'link',
        href,
        appId,
        createdAt: now,
        modifiedAt: now,
      };
    }
  }

  if (JSON.stringify(data.nodes) !== before) {
    changed = true;
  }
  if (changed) {
    save(data);
  }
}

/** 削除済み link をクリアして既定アイコンを復元する */
export function reseedDefaultLinks(): void {
  const data = load();
  data.removedLinks = [];
  save(data);
  ensureSeeded();
}

// ---- 読み取り API ----------------------------------------------------------

export function stat(path: string): VfsNode | null {
  const p = normalizePath(path);
  if (p === '/') {
    return {type: 'folder', createdAt: 0, modifiedAt: 0};
  }
  return load().nodes[p] ?? null;
}

export function exists(path: string): boolean {
  return stat(path) !== null;
}

export function readDir(path: string): VfsEntry[] {
  const parent = normalizePath(path);
  const {nodes} = load();
  const entries: VfsEntry[] = [];
  for (const [p, node] of Object.entries(nodes)) {
    if (parentPath(p) === parent && p !== parent) {
      entries.push({path: p, name: basename(p), node});
    }
  }
  // フォルダー優先 + 名前順
  entries.sort((a, b) => {
    const ta = a.node.type === 'folder' ? 0 : 1;
    const tb = b.node.type === 'folder' ? 0 : 1;
    if (ta !== tb) {
      return ta - tb;
    }
    return a.name.localeCompare(b.name, 'ja');
  });
  return entries;
}

export function readFile(path: string): string | null {
  const node = stat(path);
  if (!node || node.type !== 'file') {
    return null;
  }
  return node.content ?? '';
}

// ---- 書き込み API ----------------------------------------------------------

export function mkdir(path: string): void {
  const p = normalizePath(path);
  const data = load();
  if (data.nodes[p]) {
    return;
  }
  const now = Date.now();
  data.nodes[p] = {type: 'folder', createdAt: now, modifiedAt: now};
  save(data);
}

export function createFile(path: string, content = ''): void {
  const p = normalizePath(path);
  const data = load();
  if (data.nodes[p]) {
    return;
  }
  const now = Date.now();
  data.nodes[p] = {type: 'file', content, createdAt: now, modifiedAt: now};
  save(data);
}

export function createLink(
  path: string,
  opts: {href: string; appId?: string},
): void {
  const p = normalizePath(path);
  const data = load();
  const now = Date.now();
  data.nodes[p] = {
    type: 'link',
    href: opts.href,
    appId: opts.appId,
    createdAt: now,
    modifiedAt: now,
  };
  save(data);
}

export function writeFile(path: string, content: string): void {
  const p = normalizePath(path);
  const data = load();
  const now = Date.now();
  const existing = data.nodes[p];
  if (existing && existing.type === 'file') {
    data.nodes[p] = {...existing, content, modifiedAt: now};
  } else {
    data.nodes[p] = {type: 'file', content, createdAt: now, modifiedAt: now};
  }
  save(data);
}

export function rename(path: string, newName: string): string | null {
  const p = normalizePath(path);
  const data = load();
  const node = data.nodes[p];
  if (!node) {
    return null;
  }
  const target = joinPath(parentPath(p), newName);
  if (data.nodes[target]) {
    return null; // 既に存在
  }
  // フォルダーの場合は子孫も付け替える
  const prefix = p + '/';
  for (const [childPath, childNode] of Object.entries(data.nodes)) {
    if (childPath.startsWith(prefix)) {
      const rest = childPath.slice(p.length);
      data.nodes[target + rest] = childNode;
      delete data.nodes[childPath];
    }
  }
  data.nodes[target] = {...node, modifiedAt: Date.now()};
  delete data.nodes[p];
  save(data);
  return target;
}

export function move(path: string, newParent: string): string | null {
  const p = normalizePath(path);
  const parent = normalizePath(newParent);
  const data = load();
  const node = data.nodes[p];
  if (!node) {
    return null;
  }
  const target = joinPath(parent, basename(p));
  if (target === p || data.nodes[target]) {
    return null;
  }
  // 自分自身の配下へは移動不可
  if (target.startsWith(p + '/')) {
    return null;
  }
  const prefix = p + '/';
  for (const [childPath, childNode] of Object.entries(data.nodes)) {
    if (childPath.startsWith(prefix)) {
      const rest = childPath.slice(p.length);
      data.nodes[target + rest] = childNode;
      delete data.nodes[childPath];
    }
  }
  data.nodes[target] = {...node, modifiedAt: Date.now()};
  delete data.nodes[p];
  save(data);
  return target;
}

export function remove(path: string): void {
  const p = normalizePath(path);
  const data = load();
  const node = data.nodes[p];
  if (!node) {
    return;
  }
  // シードされた link を消したら再シードしないよう記録
  if (node.type === 'link' && node.appId && !data.removedLinks.includes(node.appId)) {
    data.removedLinks.push(node.appId);
  }
  // 自身 + 子孫を削除
  const prefix = p + '/';
  for (const childPath of Object.keys(data.nodes)) {
    if (childPath === p || childPath.startsWith(prefix)) {
      delete data.nodes[childPath];
    }
  }
  save(data);
}

/**
 * parent 直下で baseName が重複しない一意なパスを返す。
 * 例: "新しいフォルダー" -> "新しいフォルダー" / "新しいフォルダー (2)" ...
 */
export function uniqueChildPath(parent: string, baseName: string): string {
  const data = load();
  let candidate = joinPath(parent, baseName);
  if (!data.nodes[candidate]) {
    return candidate;
  }
  // 拡張子を保持して連番を挿入
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  for (let i = 2; i < 1000; i++) {
    candidate = joinPath(parent, `${stem} (${i})${ext}`);
    if (!data.nodes[candidate]) {
      return candidate;
    }
  }
  return joinPath(parent, `${stem} (${Date.now()})${ext}`);
}

// ---- 購読 ------------------------------------------------------------------

/**
 * VFS の変更を購読する。別ウィンドウ/iframe からの storage イベントと、
 * 同一ウィンドウの書き込みが発火する vfs-change イベントの両方を拾う。
 */
export function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cb();
    }
  };
  const onLocal = () => cb();
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocal);
  };
}
