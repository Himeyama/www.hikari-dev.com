import { Hono } from "hono";
import type { HonoEnv } from "../types.ts";
import { ok, err } from "../utils/response.ts";

export const buildRouter = new Hono<HonoEnv>();

buildRouter.post("/", async (c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  const hookUrl = c.env.PAGES_DEPLOY_HOOK;
  if (!hookUrl) {
    return err("NOT_CONFIGURED", "Deploy hook が設定されていません", requestId, 503);
  }
  const res = await fetch(hookUrl, { method: "POST" });
  if (!res.ok) {
    return err("DEPLOY_FAILED", `Deploy hook 呼び出しに失敗しました: ${res.status}`, requestId, 502);
  }
  return ok({ message: "ビルドを開始しました" }, requestId);
});
