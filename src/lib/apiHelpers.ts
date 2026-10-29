import { ValidationError } from "./database";
import { AuthError } from "./auth.server";

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json(
    { error: message, message, ...(extra ?? {}) },
    { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
  );
}

export const err = apiError;

export function unauthorized(): Response {
  return apiError("Authentication required", 401);
}

export function forbidden(): Response {
  return apiError("You do not have permission to do that", 403);
}

export function notFound(resource = "Resource"): Response {
  return apiError(`${resource} not found`, 404);
}

/** Convert thrown errors into safe API responses. Never leaks SQL or stack traces. */
export function handleError(error: unknown): Response {
  if (error instanceof ValidationError) {
    return apiError(error.message, 422, { fields: error.fields });
  }
  if (error instanceof AuthError) {
    return apiError(error.message, error.status);
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "23505" || code === "SQLITE_CONSTRAINT_UNIQUE") {
      return apiError("A record with that unique value already exists", 409);
    }
    if (code === "23503" || code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return apiError("This record is still referenced by other data", 409);
    }
  }
  console.error("[api] Unhandled error", error);
  return apiError("Something went wrong. Please try again.", 500);
}

export function paginate<T>(items: T[], page = 1, limit = 100) {
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), total: items.length, page };
}

export interface RevalidateResult {
  ok: boolean;
  /** True when the integration has not been configured yet (never reported as success). */
  skipped?: boolean;
  status?: number;
  error?: string;
}

/**
 * Ask the public Next.js site to revalidate its content cache and report the
 * real outcome. The secret is only ever sent server-to-server.
 */
export async function revalidateMainSiteNow(): Promise<RevalidateResult> {
  const siteUrl = (process.env.MAIN_SITE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET ?? "";
  if (!secret) {
    console.warn("[revalidate] REVALIDATE_SECRET is not configured; skipping");
    return { ok: false, skipped: true, error: "REVALIDATE_SECRET is not configured" };
  }
  try {
    const response = await fetch(`${siteUrl}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-token": secret, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return { ok: false, status: response.status, error: `Public site responded ${response.status}` };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("[revalidate] Public site cache purge failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Ask the public Next.js site to revalidate its content cache.
 * Never blocks or breaks the admin response; failures are logged without secrets.
 */
export function revalidateMainSite(): void {
  void revalidateMainSiteNow();
}
