import { Hono } from "hono";
import type { HonoEnv, Lang } from "../types.ts";
import {
  CreateArticleRequestSchema,
  LangSchema,
  UpdateArticleRequestSchema,
} from "../schema.ts";
import { conflict, err, internalError, notFound, ok } from "../utils/response.ts";
import { ConflictError, GitHubClient } from "../github/client.ts";
import { ArticleService } from "../services/article.ts";

export const articlesRouter = new Hono<HonoEnv>();

function getService(c: { env: HonoEnv["Bindings"] }): ArticleService {
  const github = new GitHubClient(
    c.env.GITHUB_TOKEN,
    c.env.GITHUB_OWNER,
    c.env.GITHUB_REPO,
    c.env.GITHUB_BRANCH,
  );
  return new ArticleService(github);
}

function getLang(c: { req: { query: (k: string) => string | undefined } }): Lang | null {
  const lang = c.req.query("lang");
  const parsed = LangSchema.safeParse(lang);
  return parsed.success ? parsed.data : null;
}

articlesRouter.get("/", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const lang = getLang(c);
  if (!lang) return err("VALIDATION_ERROR", "lang query is required (ja|en|zh-TW)", requestId);
  try {
    const articles = await getService(c).list(lang);
    return ok(articles, requestId);
  } catch (e) {
    console.error("[articles.list]", e);
    return internalError(requestId);
  }
});

articlesRouter.get("/:filename", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const lang = getLang(c);
  if (!lang) return err("VALIDATION_ERROR", "lang query is required", requestId);
  const filename = c.req.param("filename");
  try {
    const article = await getService(c).get(filename, lang);
    if (!article) return notFound(requestId);
    return ok(article, requestId);
  } catch {
    return internalError(requestId);
  }
});

articlesRouter.post("/", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  try {
    const body = await c.req.json();
    const parsed = CreateArticleRequestSchema.safeParse(body);
    if (!parsed.success) {
      return err("VALIDATION_ERROR", parsed.error.message, requestId);
    }
    const article = await getService(c).create(parsed.data);
    return ok(article, requestId, 201);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Article already exists")) {
      return err("ALREADY_EXISTS", e.message, requestId, 409);
    }
    return internalError(requestId);
  }
});

articlesRouter.put("/:filename", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const lang = getLang(c);
  if (!lang) return err("VALIDATION_ERROR", "lang query is required", requestId);
  const filename = c.req.param("filename");
  try {
    const body = await c.req.json();
    const parsed = UpdateArticleRequestSchema.safeParse(body);
    if (!parsed.success) {
      return err("VALIDATION_ERROR", parsed.error.message, requestId);
    }
    const article = await getService(c).update(filename, lang, parsed.data);
    return ok(article, requestId);
  } catch (e) {
    if (e instanceof ConflictError) return conflict(requestId);
    if (e instanceof Error && e.message.includes("not found")) return notFound(requestId);
    return internalError(requestId);
  }
});

articlesRouter.delete("/:filename", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const lang = getLang(c);
  if (!lang) return err("VALIDATION_ERROR", "lang query is required", requestId);
  const filename = c.req.param("filename");
  const sha = c.req.query("sha");
  if (!sha) return err("VALIDATION_ERROR", "sha is required", requestId);
  try {
    await getService(c).delete(filename, lang, sha);
    return ok({ deleted: true }, requestId);
  } catch (e) {
    if (e instanceof Error && e.message.includes("not found")) return notFound(requestId);
    return internalError(requestId);
  }
});
