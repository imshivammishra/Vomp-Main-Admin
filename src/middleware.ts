import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "vomp_admin_session";

const PROTECTED = [
  "/dashboard",
  "/venues",
  "/cities",
  "/countries",
  "/blogs",
  "/reviews",
  "/enquiries",
  "/media",
  "/settings",
  "/bookings",
  "/users",
  "/audit",
  "/content",
  "/pages",
  "/account",
];

/**
 * Edge middleware only checks that a session cookie exists so it can redirect
 * unauthenticated visitors before rendering. The real authorisation check
 * (valid, unexpired session + permission) always happens on the server in each
 * API route — a forged cookie gets no further than a 401.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Cross-origin preflight: the admin UI (dev-admin.*) calls the API (dev.api.*)
  // with credentials, so browsers send an OPTIONS preflight for JSON/PUT/DELETE
  // requests. Answer it here with the matching CORS headers (route handlers do
  // not all export OPTIONS). Public endpoints fall back to a wildcard origin.
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const adminOrigin = process.env.ADMIN_ORIGIN?.replace(/\/+$/, "");
    const headers = new Headers();
    if (origin && adminOrigin && origin === adminOrigin) {
      headers.set("Access-Control-Allow-Origin", adminOrigin);
      headers.set("Access-Control-Allow-Credentials", "true");
    } else {
      headers.set("Access-Control-Allow-Origin", "*");
    }
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "86400");
    headers.set("Vary", "Origin");
    return new NextResponse(null, { status: 204, headers });
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isProtected = PROTECTED.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/venues/:path*",
    "/cities/:path*",
    "/countries/:path*",
    "/blogs/:path*",
    "/reviews/:path*",
    "/enquiries/:path*",
    "/media/:path*",
    "/settings/:path*",
    "/bookings/:path*",
    "/users/:path*",
    "/audit/:path*",
    "/content/:path*",
    "/pages/:path*",
    "/account/:path*",
    "/login",
  ],
};
