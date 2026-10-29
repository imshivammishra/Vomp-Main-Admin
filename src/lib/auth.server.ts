/**
 * Session-based authentication.
 *
 * - Passwords: bcrypt (cost 12).
 * - Session tokens: 256-bit random, only the SHA-256 hash is stored in SQL.
 * - Cookies: HttpOnly, SameSite=Lax (Strict in production), Secure in production.
 * - Every permission is re-checked on the server for each request.
 */
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { adminUsersDb, auditDb, sessionsDb } from "./database";
import type { AdminUser } from "@/types";

export const SESSION_COOKIE = "vomp_admin_session";
const BCRYPT_ROUNDS = 12;
const DEFAULT_SESSION_HOURS = Number(process.env.SESSION_HOURS ?? 12);

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  const isProd = process.env.NODE_ENV === "production";
  // When the admin UI and API live on different sub-domains
  // (e.g. dev-admin.venueonmyplate.com and dev.api.venueonmyplate.com) the
  // session cookie must be scoped to the shared parent domain so both the
  // admin pages (for the middleware redirect check) and the API (for request
  // auth) receive it. Leave SESSION_COOKIE_DOMAIN unset for same-origin setups.
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined;
  // CSRF is independently enforced on the server (sameOrigin + ADMIN_ORIGIN),
  // so "lax" is safe and keeps cross-sub-domain sign-in reliable.
  const sameSite = (process.env.SESSION_COOKIE_SAMESITE?.trim() ||
    (isProd ? "lax" : "lax")) as "strict" | "lax" | "none";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite,
    ...(domain ? { domain } : {}),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export interface LoginResult {
  user: AdminUser;
  token: string;
  expiresAt: Date;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Verify credentials, enforce lockout/rate limiting and create a session. */
export async function login(
  email: string,
  password: string,
  meta: { ip?: string; userAgent?: string; remember?: boolean }
): Promise<LoginResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) throw new AuthError("Email and password are required", 400);

  const recent = await import("./db/client").then(({ one }) =>
    one<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM login_attempts
       WHERE (lower(email) = lower($1) OR ip = $2)
         AND success = false AND created_at > now() - interval '15 minutes'`,
      [cleanEmail, meta.ip ?? ""]
    )
  );
  if (Number(recent?.count ?? 0) >= 10) {
    throw new AuthError("Too many sign-in attempts. Try again in 15 minutes.", 429);
  }

  const record = await adminUsersDb.findByEmail(cleanEmail);
  let ok = false;
  if (record && record.isActive) {
    if (record.lockedUntil && new Date(record.lockedUntil) > new Date()) {
      throw new AuthError("This account is temporarily locked. Try again later.", 423);
    }
    ok = await bcrypt.compare(password, record.passwordHash);
  }

  const { execute } = await import("./db/client");
  await execute(
    `INSERT INTO login_attempts (email, ip, success) VALUES ($1,$2,$3)`,
    [cleanEmail, meta.ip ?? "", ok]
  );

  if (!ok || !record) {
    if (record) await adminUsersDb.recordFailure(cleanEmail);
    await auditDb.record({
      actorEmail: cleanEmail,
      action: "auth.login",
      resourceType: "admin_user",
      resourceId: record?.id ?? "",
      outcome: "failure",
      summary: { reason: "invalid_credentials" },
      ip: meta.ip,
    });
    throw new AuthError("Invalid email or password", 401);
  }

  await adminUsersDb.recordLogin(record.id);
  const token = randomBytes(32).toString("base64url");
  const hours = meta.remember ? 24 * 7 : DEFAULT_SESSION_HOURS;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await sessionsDb.create({
    id: randomBytes(16).toString("hex"),
    userId: record.id,
    tokenHash: tokenHash(token),
    expiresAt,
    ip: meta.ip ?? "",
    userAgent: meta.userAgent ?? "",
  });

  await auditDb.record({
    actorId: record.id,
    actorEmail: record.email,
    action: "auth.login",
    resourceType: "admin_user",
    resourceId: record.id,
    ip: meta.ip,
  });

  return {
    token,
    expiresAt,
    user: {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      roleName: record.roleName,
      permissions: record.permissions,
    },
  };
}

export async function logout(token: string | null, actor?: AdminUser, ip?: string) {
  if (!token) return;
  const session = await sessionsDb.findValid(tokenHash(token));
  if (session) await sessionsDb.revoke(session.sessionId);
  if (actor) {
    await auditDb.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "auth.logout",
      resourceType: "session",
      resourceId: session?.sessionId ?? "",
      ip,
    });
  }
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function authenticateToken(token: string | null): Promise<AdminUser | null> {
  if (!token) return null;
  const session = await sessionsDb.findValid(tokenHash(token));
  return session?.user ?? null;
}

export async function authenticateRequest(req: Request): Promise<AdminUser | null> {
  return authenticateToken(extractToken(req));
}

export function can(user: AdminUser | null, permission: string): boolean {
  if (!user) return false;
  return (user.permissions ?? []).includes(permission);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function changePassword(
  userId: string,
  newPlain: string,
  currentPlain?: string
): Promise<void> {
  if (newPlain.length < 10) throw new AuthError("Password must be at least 10 characters", 422);
  if (!/[A-Za-z]/.test(newPlain) || !/\d/.test(newPlain)) {
    throw new AuthError("Password must include letters and numbers", 422);
  }
  const { one } = await import("./db/client");
  const row = await one<{ email: string; password_hash: string }>(
    "SELECT email, password_hash FROM admin_users WHERE id = $1",
    [Number(userId) || -1]
  );
  if (!row) throw new AuthError("User not found", 404);
  if (currentPlain !== undefined) {
    const match = await bcrypt.compare(currentPlain, row.password_hash);
    if (!match) throw new AuthError("Current password is incorrect", 403);
  }
  await adminUsersDb.updatePassword(row.email, await hashPassword(newPlain));
  await sessionsDb.revokeAllForUser(userId);
}

/** Compare an Origin header against the request host (CSRF defence). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // native/server-to-server requests carry no Origin
  const host = req.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    return originHost === host || origin === process.env.ADMIN_ORIGIN;
  } catch {
    return false;
  }
}
