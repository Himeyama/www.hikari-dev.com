import type { ImageUploadResponse } from "../types.ts";
import { COMMIT_MESSAGES, imagePath, imageUrl } from "../constants.ts";
import type { GitHubClient } from "../github/client.ts";
import { validateImageUpload } from "../validation/image.ts";

export class ImageService {
  constructor(private github: GitHubClient) {}

  async upload(
    request: Request,
    date: string,
    slug: string,
    filename: string,
  ): Promise<ImageUploadResponse> {
    const validation = await validateImageUpload(request);
    if (!validation.ok) throw new Error(validation.error);

    const safeFilename = ensureExtension(filename, validation.ext);
    const path = imagePath(date, slug, safeFilename);
    const dir = `${date}-${slug}`;

    await this.github.putBinaryFile(
      path,
      validation.data,
      COMMIT_MESSAGES.uploadImage(safeFilename, dir),
    );

    return {
      url: imageUrl(date, slug, safeFilename),
      path,
    };
  }
}

function ensureExtension(filename: string, expectedExt: string): string {
  const lower = filename.toLowerCase();
  const validExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  for (const ext of validExts) {
    if (lower.endsWith(ext)) {
      if (ext === expectedExt || (ext === ".jpeg" && expectedExt === ".jpg")) {
        return filename;
      }
      return filename.slice(0, -ext.length) + expectedExt;
    }
  }
  return filename + expectedExt;
}
