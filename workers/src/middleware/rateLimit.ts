import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.ts";
import { err } from "../utils/response.ts";

const requestCounts = new Map<string, { count: number; windowStart: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export async function rateLimitMiddleware(
  c: Context<HonoEnv>,
  next: Next,
): Promise<void | Response> {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    await next();
    return;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    const requestId = (c.get("requestId") as string | undefined) ?? "";
    return err("RATE_LIMITED", "Too many requests", requestId, 429);
  }

  await next();
}
