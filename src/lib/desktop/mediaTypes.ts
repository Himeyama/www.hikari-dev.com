// 拡張子からファイルの種別と MIME タイプを判定する。
// デスクトップ/Files はこの判定でビューア (画像・動画・音声) とエディタ (テキスト) を
// 開き分ける。

export type MediaKind = 'image' | 'video' | 'audio' | 'text';

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
};

const AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
};

/** ファイル名末尾の拡張子 (小文字、ドットなし) */
export function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf('/') + 1).toLowerCase();
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot + 1) : '';
}

/** ファイル名から種別を判定する (未知の拡張子はテキスト扱い) */
export function mediaKindOf(name: string): MediaKind {
  const ext = extensionOf(name);
  if (ext in IMAGE_MIME) {
    return 'image';
  }
  if (ext in VIDEO_MIME) {
    return 'video';
  }
  if (ext in AUDIO_MIME) {
    return 'audio';
  }
  return 'text';
}

/** ビューアで開ける種別か */
export function isViewable(name: string): boolean {
  return mediaKindOf(name) !== 'text';
}

/**
 * ビューアで表示できるが中身はテキストである形式 (SVG)。
 * 取り込み時にテキストとして保存し、エディタでも編集できるようにする。
 */
export function isTextualMedia(name: string): boolean {
  return extensionOf(name) === 'svg';
}

/**
 * ファイル名から MIME タイプを求める。OS から受け取った File の type が
 * 空だったり不正だったりする場合の補完に使う。
 */
export function mimeTypeOf(name: string): string {
  const ext = extensionOf(name);
  return (
    IMAGE_MIME[ext] ?? VIDEO_MIME[ext] ?? AUDIO_MIME[ext] ?? 'application/octet-stream'
  );
}
