import type { ArticleContent, ArticleMeta, Lang } from "../types.ts";
import type {
  CreateArticleRequest,
  Frontmatter,
  UpdateArticleRequest,
} from "../schema.ts";
import { articlePath, COMMIT_MESSAGES, listPath, parseFilename } from "../constants.ts";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.ts";
import type { GitHubClient } from "../github/client.ts";

export class ArticleService {
  constructor(private github: GitHubClient) {}

  async list(lang: Lang): Promise<ArticleMeta[]> {
    const files = await this.github.listDirectory(listPath(lang));
    const articles: ArticleMeta[] = [];

    await Promise.all(
      files.map(async (file) => {
        if (!file.name.endsWith(".md") && !file.name.endsWith(".mdx")) return;
        const parsedName = parseFilename(file.name);
        if (!parsedName) return;

        const raw = await this.github.getFile(file.path);
        if (!raw) return;

        const parsed = parseFrontmatter(raw.content);
        if (!parsed) return;

        articles.push(metaFromFrontmatter(parsedName, lang, parsed.meta));
      }),
    );

    return articles.sort((a, b) => b.date.localeCompare(a.date));
  }

  async get(filename: string, lang: Lang): Promise<ArticleContent | null> {
    const parsedName = parseFilename(filename);
    if (!parsedName) return null;

    const path = articlePath(parsedName.date, parsedName.slug, lang);
    const file = await this.github.getFile(path);
    if (!file) return null;

    const parsed = parseFrontmatter(file.content);
    if (!parsed) return null;

    return contentFromFrontmatter(parsedName, lang, parsed.meta, parsed.body, file.sha);
  }

  async create(req: CreateArticleRequest): Promise<ArticleContent> {
    const filename = `${req.date}-${req.slug}`;
    const path = articlePath(req.date, req.slug, req.lang);

    const existing = await this.github.getFile(path);
    if (existing) {
      throw new Error(`Article already exists: ${filename} (${req.lang})`);
    }

    const fm = frontmatterFromRequest(req);
    const content = serializeFrontmatter(fm, req.body);
    const { sha } = await this.github.putFile(
      path,
      content,
      COMMIT_MESSAGES.create(filename, req.lang),
    );

    return contentFromFrontmatter(
      { date: req.date, slug: req.slug },
      req.lang,
      fm,
      req.body,
      sha,
    );
  }

  async update(
    filename: string,
    lang: Lang,
    req: UpdateArticleRequest,
  ): Promise<ArticleContent> {
    const existing = await this.get(filename, lang);
    if (!existing) throw new Error(`Article ${filename} (${lang}) not found`);

    const merged: Frontmatter = {
      title: req.title ?? existing.title,
      authors: req.authors ?? existing.authors,
      tags: req.tags ?? existing.tags,
      ...maybeField("image", req.image ?? existing.image),
      ...maybeField("keywords", req.keywords ?? existing.keywords),
      ...maybeField("draft", req.draft ?? existing.draft),
    };

    const body = req.body ?? existing.body;
    const path = articlePath(existing.date, existing.slug, lang);
    const content = serializeFrontmatter(merged, body);
    const { sha } = await this.github.putFile(
      path,
      content,
      COMMIT_MESSAGES.update(filename, lang),
      req.sha,
    );

    return contentFromFrontmatter(
      { date: existing.date, slug: existing.slug },
      lang,
      merged,
      body,
      sha,
    );
  }

  async delete(filename: string, lang: Lang, sha: string): Promise<void> {
    const parsedName = parseFilename(filename);
    if (!parsedName) throw new Error("Invalid filename");
    const path = articlePath(parsedName.date, parsedName.slug, lang);
    await this.github.deleteFile(path, COMMIT_MESSAGES.delete(filename, lang), sha);
  }
}

function metaFromFrontmatter(
  parsedName: { date: string; slug: string },
  lang: Lang,
  meta: Frontmatter,
): ArticleMeta {
  return {
    filename: `${parsedName.date}-${parsedName.slug}`,
    date: parsedName.date,
    slug: parsedName.slug,
    lang,
    title: meta.title,
    authors: meta.authors,
    tags: meta.tags,
    ...maybeField("image", meta.image),
    ...maybeField("draft", meta.draft),
  };
}

function contentFromFrontmatter(
  parsedName: { date: string; slug: string },
  lang: Lang,
  meta: Frontmatter,
  body: string,
  sha: string,
): ArticleContent {
  return {
    ...metaFromFrontmatter(parsedName, lang, meta),
    body,
    sha,
    ...maybeField("keywords", meta.keywords),
  };
}

function frontmatterFromRequest(req: CreateArticleRequest): Frontmatter {
  return {
    title: req.title,
    authors: req.authors,
    tags: req.tags,
    ...maybeField("image", req.image),
    ...maybeField("keywords", req.keywords),
    ...maybeField("draft", req.draft),
  };
}

function maybeField<K extends string, V>(
  key: K,
  value: V | undefined,
): { [P in K]: V } | Record<string, never> {
  if (value === undefined) return {};
  return { [key]: value } as { [P in K]: V };
}
