interface JwkKey {
  kty: string;
  kid: string;
  use: string;
  n: string;
  e: string;
}

interface CertsResponse {
  keys: JwkKey[];
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function parseJwtHeader(token: string): { kid?: string; alg?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0] ?? "")));
  } catch {
    return null;
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1] ?? "")));
  } catch {
    return null;
  }
}

export async function validateAccessJwt(
  token: string,
  teamDomain: string,
  audience: string,
): Promise<boolean> {
  const header = parseJwtHeader(token);
  if (!header?.kid) return false;

  const payload = parseJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) return false;

  const audArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audArray.includes(audience)) return false;

  try {
    const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
    const res = await fetch(certsUrl);
    if (!res.ok) return false;

    const certs = (await res.json()) as CertsResponse;
    const jwk = certs.keys.find((k) => k.kid === header.kid);
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const parts = token.split(".");
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2] ?? "");

    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  } catch {
    return false;
  }
}
