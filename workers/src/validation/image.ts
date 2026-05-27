import {
  ALLOWED_MIME_TYPES,
  MAGIC_NUMBERS,
  MAX_IMAGE_DIMENSION,
  MAX_MEGAPIXELS,
  MAX_UPLOAD_SIZE_BYTES,
} from "../constants.ts";

export type ValidationResult =
  | {
      ok: true;
      mimeType: string;
      data: ArrayBuffer;
      ext: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function validateImageUpload(request: Request): Promise<ValidationResult> {
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, error: "File exceeds maximum upload size of 10MB" };
  }

  const data = await request.arrayBuffer();
  if (data.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, error: "File exceeds maximum upload size of 10MB" };
  }
  if (data.byteLength === 0) {
    return { ok: false, error: "Empty file" };
  }

  const declaredType = request.headers.get("Content-Type")?.split(";")[0]?.trim() ?? "";
  const mimeType = detectMimeType(data);
  if (!mimeType) {
    return { ok: false, error: "Unrecognized image format" };
  }
  if (
    declaredType &&
    declaredType !== mimeType &&
    declaredType !== "application/octet-stream"
  ) {
    return { ok: false, error: "Content-Type mismatch" };
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return { ok: false, error: `Image type ${mimeType} is not allowed` };
  }

  const dimensionCheck = await checkImageDimensions(data, mimeType);
  if (!dimensionCheck.ok) return dimensionCheck;

  const ext = mimeToExtension(mimeType);
  return { ok: true, mimeType, data, ext };
}

function detectMimeType(data: ArrayBuffer): string | null {
  const bytes = new Uint8Array(data.slice(0, 12));

  for (const [mime, magic] of Object.entries(MAGIC_NUMBERS)) {
    if (magic.every((b, i) => bytes[i] === b)) {
      if (mime === "image/webp") {
        const riff = bytes.slice(0, 4);
        const webp = new Uint8Array(data.slice(8, 12));
        if (
          riff[0] === 0x52 &&
          riff[1] === 0x49 &&
          riff[2] === 0x46 &&
          riff[3] === 0x46 &&
          webp[0] === 0x57 &&
          webp[1] === 0x45 &&
          webp[2] === 0x42 &&
          webp[3] === 0x50
        ) {
          return mime;
        }
        continue;
      }
      return mime;
    }
  }
  return null;
}

async function checkImageDimensions(
  data: ArrayBuffer,
  mimeType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mimeType === "image/jpeg") {
    const dims = parseJpegDimensions(data);
    if (!dims) return { ok: true };
    return validateDimensions(dims.width, dims.height);
  }
  if (mimeType === "image/png") {
    const dims = parsePngDimensions(data);
    if (!dims) return { ok: true };
    return validateDimensions(dims.width, dims.height);
  }
  return { ok: true };
}

function validateDimensions(
  width: number,
  height: number,
): { ok: true } | { ok: false; error: string } {
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      ok: false,
      error: `Image dimensions ${width}x${height} exceed maximum ${MAX_IMAGE_DIMENSION}px`,
    };
  }
  const mp = (width * height) / 1_000_000;
  if (mp > MAX_MEGAPIXELS) {
    return { ok: false, error: `Image exceeds maximum ${MAX_MEGAPIXELS} megapixels` };
  }
  return { ok: true };
}

function parsePngDimensions(
  data: ArrayBuffer,
): { width: number; height: number } | null {
  if (data.byteLength < 24) return null;
  const view = new DataView(data);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function parseJpegDimensions(
  data: ArrayBuffer,
): { width: number; height: number } | null {
  const view = new DataView(data);
  let offset = 2;
  while (offset < data.byteLength - 8) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const len = view.getUint16(offset + 2, false);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }
    offset += 2 + len;
  }
  return null;
}

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  return map[mime] ?? ".bin";
}
