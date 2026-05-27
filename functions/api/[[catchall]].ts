interface Env {
  WORKER_URL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const workerUrl = context.env.WORKER_URL;
  if (!workerUrl) {
    return new Response(JSON.stringify({ message: "WORKER_URL が設定されていません" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, workerUrl);

  const req = new Request(target, context.request);
  return fetch(req);
};
