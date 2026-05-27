import type { Context, Next } from "hono";
import type { Env } from "../types.ts";

export async function corsMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<void> {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = c.req.header("Origin") ?? "";
  const allowed = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? "");

  c.res.headers.set("Access-Control-Allow-Origin", allowed);
  c.res.headers.set("Access-Control-Allow-Credentials", "true");
  c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, CF-Access-Jwt-Assertion",
  );
  c.res.headers.set("Vary", "Origin");

  if (c.req.method === "OPTIONS") {
    c.res = new Response(null, { status: 204, headers: c.res.headers });
    return;
  }

  await next();
}
