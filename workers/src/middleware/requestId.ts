import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.ts";

export async function requestIdMiddleware(
  c: Context<HonoEnv>,
  next: Next,
): Promise<void> {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.res.headers.set("X-Request-Id", requestId);
  await next();
}
