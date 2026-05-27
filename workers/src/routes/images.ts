import { Hono } from "hono";
import type { HonoEnv } from "../types.ts";
import { ImageUploadQuerySchema } from "../schema.ts";
import { err, internalError, ok } from "../utils/response.ts";
import { GitHubClient } from "../github/client.ts";
import { ImageService } from "../services/image.ts";

export const imagesRouter = new Hono<HonoEnv>();

imagesRouter.post("/", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";

  const query = {
    date: c.req.query("date"),
    slug: c.req.query("slug"),
    filename: c.req.query("filename"),
  };

  const parsed = ImageUploadQuerySchema.safeParse(query);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.message, requestId);
  }

  try {
    const github = new GitHubClient(
      c.env.GITHUB_TOKEN,
      c.env.GITHUB_OWNER,
      c.env.GITHUB_REPO,
      c.env.GITHUB_BRANCH,
    );
    const service = new ImageService(github);
    const result = await service.upload(
      c.req.raw,
      parsed.data.date,
      parsed.data.slug,
      parsed.data.filename,
    );
    return ok(result, requestId, 201);
  } catch (e) {
    if (e instanceof Error) {
      return err("UPLOAD_ERROR", e.message, requestId);
    }
    return internalError(requestId);
  }
});
