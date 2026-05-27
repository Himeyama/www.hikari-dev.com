import type { ApiError, ApiResponse } from "../types.ts";

export function ok<T>(data: T, requestId: string, status = 200): Response {
  const body: ApiResponse<T> = { data, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function err(
  code: string,
  message: string,
  requestId: string,
  status = 400,
): Response {
  const body: ApiError = { code, message, requestId };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function notFound(requestId: string): Response {
  return err("NOT_FOUND", "Resource not found", requestId, 404);
}

export function conflict(requestId: string): Response {
  return err("CONFLICT", "Resource was modified concurrently", requestId, 409);
}

export function unauthorized(requestId: string): Response {
  return err("UNAUTHORIZED", "Authentication required", requestId, 401);
}

export function internalError(requestId: string): Response {
  return err("INTERNAL_ERROR", "An unexpected error occurred", requestId, 500);
}
