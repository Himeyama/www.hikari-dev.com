// OS とのファイル受け渡し (ダウンロード保存 / ドラッグ&ドロップ取り込み)

import * as vfs from './vfs';
import {getBlob, putBlob} from './blobStore';
import {isTextualMedia, isViewable, mimeTypeOf} from './mediaTypes';

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** テキスト内容をブラウザ経由でファイルとしてダウンロード保存する */
export function downloadTextFile(filename: string, content: string): void {
  saveBlob(filename, new Blob([content], {type: 'text/plain;charset=utf-8'}));
}

/** VFS のファイルをダウンロード保存する (テキスト・バイナリのどちらでも) */
export async function downloadVfsFile(path: string): Promise<void> {
  const node = vfs.stat(path);
  if (!node || node.type !== 'file') {
    return;
  }
  const name = vfs.basename(path);
  if (vfs.isBinaryFile(node) && node.blobId) {
    const blob = await getBlob(node.blobId);
    if (blob) {
      saveBlob(name, blob);
    }
    return;
  }
  downloadTextFile(name, node.content ?? '');
}

/**
 * OS からドラッグ&ドロップされたファイルを VFS の指定フォルダーに取り込む。
 * 画像・動画・音声は実体を IndexedDB に置き、それ以外 (SVG を含む) は
 * テキストとして読む。
 */
export async function importDroppedFiles(
  files: FileList | File[],
  targetDir: string,
): Promise<void> {
  for (const file of Array.from(files)) {
    const path = vfs.uniqueChildPath(targetDir, file.name);
    if (isViewable(file.name) && !isTextualMedia(file.name)) {
      const blobId = await putBlob(file);
      vfs.createBinaryFile(path, {
        blobId,
        mime: file.type || mimeTypeOf(file.name),
        size: file.size,
      });
    } else {
      vfs.createFile(path, await file.text());
    }
  }
}
