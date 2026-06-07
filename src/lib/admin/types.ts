export type Lang = "ja" | "en" | "zh-TW";

export const LANGS: readonly Lang[] = ["ja", "en", "zh-TW"] as const;

export interface FrontmatterFormState {
  title: string;
  slug: string;
  date: string;
  tags: string;
  image: string;
  keywords: string;
  draft: boolean;
  authors: string;
}

export interface ArticleMeta {
  filename: string;
  date: string;
  slug: string;
  lang: Lang;
  title: string;
  authors: string;
  tags: string[];
  image?: string;
  draft?: boolean;
}

export interface ArticleContent extends ArticleMeta {
  body: string;
  keywords?: string[];
  sha: string;
}

export interface CreateArticleRequest {
  lang: Lang;
  date: string;
  slug: string;
  title: string;
  authors: string;
  tags: string[];
  image?: string;
  keywords?: string[];
  draft?: boolean;
  body: string;
}

export interface UpdateArticleRequest {
  title?: string;
  authors?: string;
  tags?: string[];
  image?: string;
  keywords?: string[];
  draft?: boolean;
  body?: string;
  sha: string;
}

export interface ImageUploadResponse {
  url: string;
  path: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}

export interface PendingDraft {
  form: FrontmatterFormState;
  body: string;
  existing: ArticleContent | null;
  lang: Lang;
}

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
}
