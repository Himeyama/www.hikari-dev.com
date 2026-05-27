import type { Context, Next } from "hono";
import type { HonoEnv, LogEntry } from "../types.ts";

export async function loggerMiddleware(
  c: Context<HonoEnv>,
  next: Next,
): Promise<void> {
  const start = Date.now();
  await next();

  const entry: Partial<LogEntry> = {
    timestamp: new Date().toISOString(),
    requestId: (c.get("requestId") as string | undefined) ?? "",
    cfRay: c.req.header("CF-Ray") ?? "",
    action: `${c.req.method} ${new URL(c.req.url).pathname}`,
    status: c.res.status,
    durationMs: Date.now() - start,
  };

  console.log(JSON.stringify(entry));
}
