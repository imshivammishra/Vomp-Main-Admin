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
