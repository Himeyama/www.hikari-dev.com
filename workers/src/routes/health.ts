import { Hono } from "hono";
import type { HonoEnv } from "../types.ts";
import { ok } from "../utils/response.ts";

export const healthRouter = new Hono<HonoEnv>();

healthRouter.get("/", (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  return ok({ status: "ok", timestamp: new Date().toISOString() }, requestId);
});
