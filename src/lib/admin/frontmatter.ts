export interface ParsedFrontmatter {
  title: string;
  authors: string;
  tags: string[];
  image?: string;
  keywords?: string[];
  draft?: boolean;
  slug?: string;
}

export function parseFrontmatter(
  raw: string,
): { meta: ParsedFrontmatter; body: string } | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const yaml = match[1] ?? "";
  const body = match[2] ?? "";
  const data = parseYaml(yaml);
  return { meta: normalize(data), body };
}

function normalize(data: Record<string, unknown>): ParsedFrontmatter {
  return {
    title: typeof data.title === "string" ? data.title : "",
    authors: typeof data.authors === "string" ? data.authors : "hikari",
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    ...(typeof data.image === "string" ? { image: data.image } : {}),
    ...(Array.isArray(data.keywords) ? { keywords: data.keywords as string[] } : {}),
    ...(typeof data.draft === "boolean" ? { draft: data.draft } : {}),
    ...(typeof data.slug === "string" ? { slug: data.slug } : {}),
  };
}

function parseYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1] as string;
    const value = m[2] ?? "";

    if (value === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length && (lines[i] ?? "").match(/^\s+-\s+/)) {
        const itemMatch = (lines[i] ?? "").match(/^\s+-\s+(.*)$/);
        if (itemMatch) items.push(unquote(itemMatch[1] ?? ""));
        i++;
      }
      result[key] = items;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner === "" ? [] : splitFlowSequence(inner).map(unquote);
      i++;
    } else if (value === "true") {
      result[key] = true;
      i++;
    } else if (value === "false") {
      result[key] = false;
      i++;
    } else {
      result[key] = unquote(value);
      i++;
    }
  }
  return result;
}

function splitFlowSequence(s: string): string[] {
  const items: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;
  let escape = false;
  for (const ch of s) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\" && inQuote) {
      escape = true;
      continue;
    }
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch as '"' | "'";
      continue;
    }
    if (ch === ",") {
      items.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim() !== "") items.push(current.trim());
  return items;
}

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return t;
}
