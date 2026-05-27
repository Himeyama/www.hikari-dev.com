import { Hono } from "hono";
import type { HonoEnv } from "./types.ts";
import { requestIdMiddleware } from "./middleware/requestId.ts";
import { corsMiddleware } from "./middleware/cors.ts";
import { loggerMiddleware } from "./middleware/logger.ts";
import { rateLimitMiddleware } from "./middleware/rateLimit.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { healthRouter } from "./routes/health.ts";
import { articlesRouter } from "./routes/articles.ts";
import { imagesRouter } from "./routes/images.ts";

const app = new Hono<HonoEnv>();

app.use("*", requestIdMiddleware);
app.use("*", loggerMiddleware);
app.use("*", corsMiddleware);
app.use("*", rateLimitMiddleware);

app.route("/health", healthRouter);

app.use("/api/*", authMiddleware);
app.route("/api/articles", articlesRouter);
app.route("/api/images", imagesRouter);

app.notFound((c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "";
  return new Response(
    JSON.stringify({ code: "NOT_FOUND", message: "Route not found", requestId }),
    { status: 404, headers: { "Content-Type": "application/json" } },
  );
});

export default app;
