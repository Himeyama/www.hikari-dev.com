import { Hono } from "hono";
import type { HonoEnv } from "../types.ts";
import { ok, err } from "../utils/response.ts";
import { lookupWhois, WhoisError, InvalidDomainError } from "../services/whois.ts";

export const whoisRouter = new Hono<HonoEnv>();

whoisRouter.get("/", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const domain = c.req.query("domain");
  if (!domain) {
    return err("INVALID_REQUEST", "domain クエリパラメーターが必要です", requestId, 400);
  }

  try {
    const result = await lookupWhois(domain);
    return ok(result, requestId);
  } catch (e) {
    if (e instanceof InvalidDomainError) {
      return err("INVALID_DOMAIN", e.message, requestId, 400);
    }
    if (e instanceof WhoisError) {
      return err("WHOIS_LOOKUP_FAILED", e.message, requestId, 502);
    }
    throw e;
  }
});
