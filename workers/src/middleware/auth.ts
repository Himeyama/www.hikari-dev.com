import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.ts";
import { unauthorized } from "../utils/response.ts";
import { validateAccessJwt } from "../auth/access.ts";

export async function authMiddleware(
  c: Context<HonoEnv>,
  next: Next,
): Promise<void | Response> {
  // Bearer token (ADMIN_SECRET)
  const adminSecret = c.env.ADMIN_SECRET;
  if (adminSecret) {
    const authHeader = c.req.header("Authorization");
    if (authHeader === `Bearer ${adminSecret}`) {
      await next();
      return;
    }
  }

  // Cloudflare Access JWT
  const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
  const isCfAccessConfigured =
    teamDomain && teamDomain !== "your-team.cloudflareaccess.com";
  if (isCfAccessConfigured) {
    const token = c.req.header("CF-Access-Jwt-Assertion");
    if (token) {
      const valid = await validateAccessJwt(token, teamDomain, c.env.CF_ACCESS_AUD);
      if (valid) {
        await next();
        return;
      }
    }
  }

  const requestId = (c.get("requestId") as string | undefined) ?? "";
  return unauthorized(requestId);
}
