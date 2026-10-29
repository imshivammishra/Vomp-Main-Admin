import { authenticateRequest, can, sameOrigin, SESSION_COOKIE, clearedSessionCookieHeader } from "./auth.server";
import type { AdminUser } from "@/types";
import { apiError } from "./apiHelpers";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

export async function getActor(req: Request): Promise<AdminUser | null> {
  return authenticateRequest(req);
}

/** Backwards-compatible boolean check. Prefer authorize() in new code. */
export async function isAuthorized(req: Request): Promise<boolean> {
  return Boolean(await authenticateRequest(req));
}

export type AuthResult =
  | { ok: true; user: AdminUser; ip: string }
  | { ok: false; response: Response };

/**
 * Authenticate and, when `permission` is supplied, verify it on the server.
 * Mutating same-origin cookie requests are checked for CSRF.
 */
export async function authorize(
  req: Request,
  permission?: string
): Promise<AuthResult> {
  const user = await authenticateRequest(req);
  const ip = clientIp(req);
  if (!user) {
    const response = apiError("Authentication required", 401);
    // If the browser sent a session cookie but it is no longer valid (expired
    // or its server session is gone), clear it. Otherwise the cookie-only
    // middleware check keeps redirecting /login → /dashboard while the API
    // returns 401, which makes the admin panel flicker in a redirect loop.
    if ((req.headers.get("cookie") ?? "").includes(`${SESSION_COOKIE}=`)) {
      response.headers.append("Set-Cookie", clearedSessionCookieHeader());
    }
    return { ok: false, response };
  }
  if (permission && !can(user, permission)) {
    return { ok: false, response: apiError("You do not have permission to do that", 403) };
  }
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const hasCookie = (req.headers.get("cookie") ?? "").includes("vomp_admin_session=");
    if (hasCookie && !sameOrigin(req)) {
      return { ok: false, response: apiError("Cross-site request rejected", 403) };
    }
  }
  return { ok: true, user, ip };
}
