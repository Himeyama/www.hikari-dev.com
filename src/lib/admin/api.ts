import type {
  ApiError,
  ApiResponse,
  ArticleContent,
  ArticleMeta,
  BatchSaveRequest,
  CreateArticleRequest,
  ImageUploadResponse,
  Lang,
  UpdateArticleRequest,
} from "./types";

const DEFAULT_BASE = "/api";
const LOCAL_WORKERS_BASE = "http://localhost:8787/api";

export const ADMIN_SECRET_STORAGE = "admin_secret";

export function getAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_SECRET_STORAGE);
}

export function setAdminSecret(secret: string | null): void {
  if (typeof window === "undefined") return;
  if (secret) {
    localStorage.setItem(ADMIN_SECRET_STORAGE, secret);
  } else {
    localStorage.removeItem(ADMIN_SECRET_STORAGE);
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("認証が必要です。管理者シークレットを設定してください。");
    this.name = "UnauthorizedError";
  }
}

function getBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE;
  const fromWindow = (window as Window & { __ADMIN_API_URL__?: string }).__ADMIN_API_URL__;
  if (fromWindow) return fromWindow;
  if (window.location.hostname === "localhost") return LOCAL_WORKERS_BASE;
  return DEFAULT_BASE;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = getAdminSecret();
  const authHeaders: Record<string, string> = secret
    ? { Authorization: `Bearer ${secret}` }
    : {};

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    throw new UnauthorizedError();
  }

  const text = await res.text();

  if (!res.ok) {
    if (text) {
      try {
        const error = JSON.parse(text) as ApiError;
        throw new Error(error.message ?? `Request failed: ${res.status}`);
      } catch {
        throw new Error(`Request failed: ${res.status}`);
      }
    }
    throw new Error(`Request failed: ${res.status}`);
  }

  if (!text) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("API サーバーに接続できません。Workers が起動しているか確認してください。");
  }
  const json = JSON.parse(text) as ApiResponse<T>;
  return json.data;
}

export const api = {
  articles: {
    list(lang: Lang): Promise<ArticleMeta[]> {
      return request<ArticleMeta[]>(`/articles?lang=${encodeURIComponent(lang)}`);
    },

    get(filename: string, lang: Lang): Promise<ArticleContent> {
      return request<ArticleContent>(
        `/articles/${encodeURIComponent(filename)}?lang=${encodeURIComponent(lang)}`,
      );
    },

    create(data: CreateArticleRequest): Promise<ArticleContent> {
      return request<ArticleContent>("/articles", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // 同一記事の複数言語を 1 コミットでまとめて保存する。
    batchSave(data: BatchSaveRequest): Promise<ArticleContent[]> {
      return request<ArticleContent[]>("/articles/batch", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(
      filename: string,
      lang: Lang,
      data: UpdateArticleRequest,
    ): Promise<ArticleContent> {
      return request<ArticleContent>(
        `/articles/${encodeURIComponent(filename)}?lang=${encodeURIComponent(lang)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
    },

    delete(filename: string, lang: Lang, sha: string): Promise<void> {
      return request<void>(
        `/articles/${encodeURIComponent(filename)}?lang=${encodeURIComponent(lang)}&sha=${encodeURIComponent(sha)}`,
        {
          method: "DELETE",
        },
      );
    },
  },

  images: {
    upload(
      file: File | Blob,
      date: string,
      slug: string,
      filename: string,
    ): Promise<ImageUploadResponse> {
      const query = new URLSearchParams({ date, slug, filename }).toString();
      return request<ImageUploadResponse>(`/images?${query}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
    },
  },

  build(): Promise<{ message: string }> {
    return request<{ message: string }>("/build", { method: "POST" });
  },
};
