import { connect } from "cloudflare:sockets";

const IANA_WHOIS_HOST = "whois.iana.org";
const WHOIS_PORT = 43;
const SOCKET_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 200_000;

export class WhoisError extends Error {}
export class InvalidDomainError extends WhoisError {}

function isValidDomain(domain: string): boolean {
  // Labels of letters/digits/hyphens separated by dots, no leading/trailing hyphen per label.
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i.test(domain);
}

async function queryWhoisServer(host: string, query: string): Promise<string> {
  const socket = connect({ hostname: host, port: WHOIS_PORT });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const decoder = new TextDecoder();
  let result = "";

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new WhoisError(`WHOIS サーバー ${host} への接続がタイムアウトした。`)), SOCKET_TIMEOUT_MS);
  });

  try {
    await Promise.race([
      (async () => {
        await socket.opened;
        await writer.write(new TextEncoder().encode(`${query}\r\n`));
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          if (result.length > MAX_RESPONSE_BYTES) break;
        }
      })(),
      timeout,
    ]);
  } finally {
    try {
      await reader.cancel();
    } catch {
      // socket already closed
    }
    try {
      socket.close();
    } catch {
      // socket already closed
    }
  }

  return result;
}

function extractField(response: string, field: string): string | null {
  const re = new RegExp(`^${field}:\\s*(\\S+)`, "im");
  const match = response.match(re);
  return match?.[1] ?? null;
}

export interface WhoisResult {
  domain: string;
  server: string;
  raw: string;
  referredServer?: string;
  referredRaw?: string;
}

export async function lookupWhois(domainInput: string): Promise<WhoisResult> {
  const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!isValidDomain(domain)) {
    throw new InvalidDomainError("ドメイン名の形式が正しくない。");
  }

  const tld = domain.split(".").pop();
  if (!tld) {
    throw new InvalidDomainError("ドメイン名の形式が正しくない。");
  }

  const ianaResponse = await queryWhoisServer(IANA_WHOIS_HOST, tld);
  const tldServer = extractField(ianaResponse, "whois");

  if (!tldServer) {
    return { domain, server: IANA_WHOIS_HOST, raw: ianaResponse };
  }

  const tldResponse = await queryWhoisServer(tldServer, domain);
  const result: WhoisResult = { domain, server: tldServer, raw: tldResponse };

  const registrarServer = extractField(tldResponse, "Registrar WHOIS Server");
  if (registrarServer && registrarServer !== tldServer) {
    try {
      const registrarResponse = await queryWhoisServer(registrarServer, domain);
      result.referredServer = registrarServer;
      result.referredRaw = registrarResponse;
    } catch {
      // Registrar server lookup is best-effort; TLD-level response is still returned.
    }
  }

  return result;
}
