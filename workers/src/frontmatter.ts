import type { Frontmatter } from "./schema.ts";
import { FrontmatterSchema } from "./schema.ts";

export function serializeFrontmatter(meta: Frontmatter, body: string): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlString(meta.title)}`);
  lines.push(`authors: ${meta.authors}`);

  if (meta.tags.length > 0) {
    lines.push(`tags: [${meta.tags.map(yamlString).join(", ")}]`);
  } else {
    lines.push("tags: []");
  }

  if (meta.image) lines.push(`image: ${meta.image}`);
  if (meta.keywords && meta.keywords.length > 0) {
    lines.push(`keywords: [${meta.keywords.map(yamlString).join(", ")}]`);
  }
  if (meta.draft) lines.push("draft: true");
  if (meta.slug) lines.push(`slug: ${meta.slug}`);

  lines.push("---", "", body.trimStart());
  return lines.join("\n");
}

export function parseFrontmatter(
  raw: string,
): { meta: Frontmatter; body: string } | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const [, yaml, body] = match;
  const data = parseYaml(yaml ?? "");
  const result = FrontmatterSchema.safeParse(data);
  if (!result.success) return null;

  return { meta: result.data, body: body ?? "" };
}

function yamlString(s: string): string {
  if (/^[a-zA-Z0-9_\-./]+$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s)) {
    return s;
  }
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
        const itemLine = lines[i] ?? "";
        const itemMatch = itemLine.match(/^\s+-\s+(.*)$/);
        if (itemMatch) items.push(unquote(itemMatch[1] ?? ""));
        i++;
      }
      result[key] = items;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      if (inner === "") {
        result[key] = [];
      } else {
        result[key] = splitFlowSequence(inner).map(unquote);
      }
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
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
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
  const trimmed = s.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return trimmed;
}
