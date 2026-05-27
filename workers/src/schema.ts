import { z } from "zod";

export const LangSchema = z.enum(["ja", "en", "zh-TW"]);

export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");

export const FrontmatterSchema = z.object({
  title: z.string().min(1).max(200),
  authors: z.string().default("hikari"),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
  slug: z.string().optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export const CreateArticleRequestSchema = z.object({
  lang: LangSchema,
  date: DateSchema,
  slug: SlugSchema,
  title: z.string().min(1).max(200),
  authors: z.string().default("hikari"),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
  body: z.string(),
});

export const UpdateArticleRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  authors: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  draft: z.boolean().optional(),
  body: z.string().optional(),
  sha: z.string(),
});

export type CreateArticleRequest = z.infer<typeof CreateArticleRequestSchema>;
export type UpdateArticleRequest = z.infer<typeof UpdateArticleRequestSchema>;

export const ImageUploadQuerySchema = z.object({
  date: DateSchema,
  slug: SlugSchema,
  filename: z.string().regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename"),
});

export type ImageUploadQuery = z.infer<typeof ImageUploadQuerySchema>;
