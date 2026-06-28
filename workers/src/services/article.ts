import type { ArticleContent, ArticleMeta, Lang } from "../types.ts";
import type {
  BatchSaveRequest,
  CreateArticleRequest,
  Frontmatter,
  UpdateArticleRequest,
} from "../schema.ts";
import { articlePath, COMMIT_MESSAGES, LANGS, listPath, parseFilename } from "../constants.ts";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.ts";
import type { FileChange, GitHubClient } from "../github/client.ts";

export class ArticleService {
  constructor(private github: GitHubClient) {}

  async list(lang: Lang): Promise<ArticleMeta[]> {
    const files = await this.github.listDirectoryWithContent(listPath(lang));
    const articles: ArticleMeta[] = [];

    for (const file of files) {
      const parsedName = parseFilename(file.name);
      if (!parsedName) continue;

      const parsed = parseFrontmatter(file.content);
      if (!parsed) continue;

      articles.push(metaFromFrontmatter(parsedName, lang, parsed.meta));
    }

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

    // draft が変わったら、他言語ファイルのドラフト状態も同じ 1 コミットで同期する。
    const newDraft = req.draft ?? existing.draft ?? false;
    if ((existing.draft ?? false) !== newDraft) {
      const changes: FileChange[] = [{ path, content }];
      for (const otherLang of LANGS) {
        if (otherLang === lang) continue;
        const other = await this.get(filename, otherLang);
        if (!other || (other.draft ?? false) === newDraft) continue;
        const otherMerged: Frontmatter = {
          title: other.title,
          authors: other.authors,
          tags: other.tags,
          ...maybeField("image", other.image),
          ...maybeField("keywords", other.keywords),
          ...maybeField("draft", newDraft),
        };
        changes.push({
          path: articlePath(other.date, other.slug, otherLang),
          content: serializeFrontmatter(otherMerged, other.body),
        });
      }
      const blobShas = await this.github.commitFiles(
        changes,
        COMMIT_MESSAGES.update(filename, lang),
      );
      return contentFromFrontmatter(
        { date: existing.date, slug: existing.slug },
        lang,
        merged,
        body,
        blobShas[path] ?? existing.sha,
      );
    }

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

  /**
   * 同一記事 (date+slug) の複数言語ファイルを 1 コミットでまとめて保存する。
   * 言語ごとにコミットが分かれないよう Git Data API (commitFiles) を使う。
   */
  async batchSave(req: BatchSaveRequest): Promise<ArticleContent[]> {
    const filename = `${req.date}-${req.slug}`;

    // 新規 (sha なし) のファイルが既に存在する場合は衝突として扱う。
    for (const item of req.items) {
      if (item.sha) continue;
      const path = articlePath(req.date, req.slug, item.lang);
      const existing = await this.github.getFile(path);
      if (existing) {
        throw new Error(`Article already exists: ${filename} (${item.lang})`);
      }
    }

    const changes: FileChange[] = [];
    const prepared = req.items.map((item) => {
      const fm: Frontmatter = {
        title: item.title,
        authors: item.authors,
        tags: item.tags,
        ...maybeField("image", item.image),
        ...maybeField("keywords", item.keywords),
        ...maybeField("draft", item.draft),
      };
      const path = articlePath(req.date, req.slug, item.lang);
      const content = serializeFrontmatter(fm, item.body);
      changes.push({ path, content });
      return { item, fm, path };
    });

    const created = req.items.every((item) => !item.sha);
    const langs = req.items.map((item) => item.lang);
    const blobShas = await this.github.commitFiles(
      changes,
      COMMIT_MESSAGES.save(filename, langs, created),
    );

    return prepared.map(({ item, fm, path }) =>
      contentFromFrontmatter(
        { date: req.date, slug: req.slug },
        item.lang,
        fm,
        item.body,
        blobShas[path] ?? item.sha ?? "",
      ),
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
