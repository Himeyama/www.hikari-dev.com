// デスクトップ / Files アプリ間 (iframe をまたぐ) でアイテムをドラッグ&ドロップするための
// 共通データ形式。ネイティブの HTML5 Drag and Drop はブラウザの機能なので iframe 境界を
// 越えて動作する。dataTransfer には VFS の絶対パスと、掴んだ位置のオフセットを載せる。

export const VFS_ITEM_MIME = 'application/x-hikari-vfs-item';

export type VfsItemDrag = {path: string; offsetX: number; offsetY: number};

export function readVfsItemDrag(dataTransfer: DataTransfer): VfsItemDrag | null {
  const raw = dataTransfer.getData(VFS_ITEM_MIME);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<VfsItemDrag>;
    if (typeof parsed.path !== 'string') {
      return null;
    }
    return {
      path: parsed.path,
      offsetX: typeof parsed.offsetX === 'number' ? parsed.offsetX : 0,
      offsetY: typeof parsed.offsetY === 'number' ? parsed.offsetY : 0,
    };
  } catch {
    return null;
  }
}
