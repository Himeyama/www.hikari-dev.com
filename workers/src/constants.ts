import type { Lang } from "./types.ts";

export const LANGS: readonly Lang[] = ["ja", "en", "zh-TW"] as const;

export const BLOG_PATH_JA = "blog";
export const BLOG_PATH_I18N = (lang: Exclude<Lang, "ja">) =>
  `i18n/${lang}/docusaurus-plugin-content-blog`;

export function listPath(lang: Lang): string {
  return lang === "ja" ? BLOG_PATH_JA : BLOG_PATH_I18N(lang);
}

export function articlePath(date: string, slug: string, lang: Lang): string {
  const file = `${date}-${slug}.md`;
  return `${listPath(lang)}/${file}`;
}

export function imageDir(date: string, slug: string): string {
  return `static/img/blog/${date}-${slug}`;
}

export function imagePath(date: string, slug: string, filename: string): string {
  return `${imageDir(date, slug)}/${filename}`;
}

export function imageUrl(date: string, slug: string, filename: string): string {
  return `/img/blog/${date}-${slug}/${filename}`;
}

export function parseFilename(name: string): { date: string; slug: string } | null {
  const stripped = name.replace(/\.mdx?$/, "");
  const m = stripped.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!m) return null;
  return { date: m[1] as string, slug: m[2] as string };
}

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4000;
export const MAX_MEGAPIXELS = 16;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const MAGIC_NUMBERS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

export const COMMIT_MESSAGES = {
  create: (filename: string, lang: Lang) => `create: article ${filename} (${lang})`,
  update: (filename: string, lang: Lang) => `update: article ${filename} (${lang})`,
  delete: (filename: string, lang: Lang) => `delete: article ${filename} (${lang})`,
  uploadImage: (filename: string, dir: string) => `upload: image ${filename} (${dir})`,
} as const;
