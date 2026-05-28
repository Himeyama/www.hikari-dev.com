export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// 同一ブランチへ連続してコミットすると、GitHub Contents API は
// ブランチ参照の更新が反映されきる前に 409 を返すことがある
// (多言語のドラフト同期など)。最新の SHA を取り直して数百 ms 待ってから
// リトライすると解消する。
const PUT_MAX_ATTEMPTS = 4;
const PUT_RETRY_BASE_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GitHubFile {
  sha: string;
  content: string;
  path: string;
}

export interface GitHubListItem {
  path: string;
  name: string;
  sha: string;
  type: string;
}

export class GitHubClient {
  private baseUrl: string;

  constructor(
    private token: string,
    private owner: string,
    private repo: string,
    private branch: string,
  ) {
    this.baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
  }

  async getFile(path: string): Promise<GitHubFile | null> {
    const url = `${this.baseUrl}/contents/${path}?ref=${encodeURIComponent(this.branch)}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { sha: string; content: string; path: string };
    return {
      sha: data.sha,
      content: utf8Decode(data.content.replace(/\n/g, "")),
      path: data.path,
    };
  }

  async putFile(
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<{ sha: string }> {
    let currentSha = sha;

    for (let attempt = 0; attempt < PUT_MAX_ATTEMPTS; attempt++) {
      const body: Record<string, unknown> = {
        message,
        content: utf8EncodeBase64(content),
        branch: this.branch,
      };
      if (currentSha) body.sha = currentSha;

      const res = await fetch(`${this.baseUrl}/contents/${path}`, {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (res.status === 409 && attempt < PUT_MAX_ATTEMPTS - 1) {
        // ブランチ更新の競合。最新の SHA を取り直して待機後にリトライする。
        await delay(PUT_RETRY_BASE_MS * (attempt + 1));
        currentSha = (await this.getFile(path))?.sha ?? currentSha;
        continue;
      }
      if (res.status === 409) throw new ConflictError("File was modified concurrently");
      if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);

      const data = (await res.json()) as { content: { sha: string } };
      return { sha: data.content.sha };
    }

    throw new ConflictError("File was modified concurrently");
  }

  async putBinaryFile(
    path: string,
    data: ArrayBuffer,
    message: string,
  ): Promise<{ sha: string }> {
    const body: Record<string, unknown> = {
      message,
      content: arrayBufferToBase64(data),
      branch: this.branch,
    };

    const res = await fetch(`${this.baseUrl}/contents/${path}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (res.status === 409) throw new ConflictError("File was modified concurrently");
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);

    const result = (await res.json()) as { content: { sha: string } };
    return { sha: result.content.sha };
  }

  async deleteFile(path: string, message: string, sha: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/contents/${path}`, {
      method: "DELETE",
      headers: this.headers(),
      body: JSON.stringify({ message, sha, branch: this.branch }),
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  async listDirectory(prefix: string): Promise<GitHubListItem[]> {
    const url = `${this.baseUrl}/contents/${prefix}?ref=${encodeURIComponent(this.branch)}`;
    const res = await fetch(url, { headers: this.headers() });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as GitHubListItem[];
    return data.filter((f) => f.type === "file");
  }

  async listDirectoryWithContent(prefix: string): Promise<{ name: string; path: string; content: string }[]> {
    const query = `
      query($owner: String!, $repo: String!, $expr: String!) {
        repository(owner: $owner, name: $repo) {
          object(expression: $expr) {
            ... on Tree {
              entries {
                name
                object {
                  ... on Blob { text }
                }
              }
            }
          }
        }
      }
    `;
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        query,
        variables: {
          owner: this.owner,
          repo: this.repo,
          expr: `${this.branch}:${prefix}`,
        },
      }),
    });
    if (!res.ok) throw new Error(`GitHub GraphQL error: ${res.status} ${await res.text()}`);

    const json = (await res.json()) as {
      data?: {
        repository?: {
          object?: {
            entries?: { name: string; object?: { text?: string } }[];
          };
        };
      };
    };

    const entries = json.data?.repository?.object?.entries ?? [];
    return entries
      .filter((e) => e.object?.text !== undefined && (e.name.endsWith(".md") || e.name.endsWith(".mdx")))
      .map((e) => ({ name: e.name, path: `${prefix}/${e.name}`, content: e.object!.text! }));
  }

  async exists(path: string): Promise<boolean> {
    const url = `${this.baseUrl}/contents/${path}?ref=${encodeURIComponent(this.branch)}`;
    const res = await fetch(url, { headers: this.headers(), method: "HEAD" });
    return res.ok;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "hikari-dev-cms/1.0",
    };
  }
}

function utf8EncodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  return arrayBufferToBase64(bytes.buffer as ArrayBuffer);
}

function utf8Decode(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
