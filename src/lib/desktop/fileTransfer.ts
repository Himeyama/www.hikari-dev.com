// OS とのファイル受け渡し (ダウンロード保存 / ドラッグ&ドロップ取り込み)

import * as vfs from './vfs';

/** テキスト内容をブラウザ経由でファイルとしてダウンロード保存する */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** OS からドラッグ&ドロップされたファイルをテキストとして VFS の指定フォルダーに取り込む */
export async function importDroppedFiles(
  files: FileList | File[],
  targetDir: string,
): Promise<void> {
  for (const file of Array.from(files)) {
    const text = await file.text();
    const path = vfs.uniqueChildPath(targetDir, file.name);
    vfs.createFile(path, text);
  }
}
