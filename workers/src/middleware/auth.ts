import type { Context, Next } from "hono";
import type { HonoEnv } from "../types.ts";
import { unauthorized } from "../utils/response.ts";
import { validateAccessJwt } from "../auth/access.ts";

export async function authMiddleware(
  c: Context<HonoEnv>,
  next: Next,
): Promise<void | Response> {
  const teamDomain = c.env.CF_ACCESS_TEAM_DOMAIN;
  if (!teamDomain || teamDomain === "your-team.cloudflareaccess.com") {
    // ローカル開発: Cloudflare Access 未設定のため認証をスキップ
    await next();
    return;
  }

  const token = c.req.header("CF-Access-Jwt-Assertion");
  if (!token) {
    const requestId = (c.get("requestId") as string | undefined) ?? "";
    return unauthorized(requestId);
  }

  const valid = await validateAccessJwt(token, teamDomain, c.env.CF_ACCESS_AUD);
  if (!valid) {
    const requestId = (c.get("requestId") as string | undefined) ?? "";
    return unauthorized(requestId);
  }

  await next();
}
