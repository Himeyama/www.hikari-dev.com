export type Lang = "ja" | "en" | "zh-TW";

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ALLOWED_ORIGINS: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  ADMIN_SECRET?: string;
  PAGES_DEPLOY_HOOK?: string;
}

export interface AppContext {
  requestId: string;
  startTime: number;
}

export type HonoEnv = { Bindings: Env; Variables: AppContext };

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
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

export interface ImageUploadResponse {
  url: string;
  path: string;
}

export interface LogEntry {
  timestamp: string;
  requestId: string;
  cfRay: string;
  action: string;
  status: number;
  durationMs: number;
}
