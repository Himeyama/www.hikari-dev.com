export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0;
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}
