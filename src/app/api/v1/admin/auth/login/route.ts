import { NextResponse } from "next/server";
import { login, SESSION_COOKIE, sessionCookieOptions, AuthError } from "@/lib/auth.server";
import { seedIfEmpty } from "@/lib/seedDb";
import { clientIp } from "@/lib/reqAuth";
import { apiError, handleError } from "@/lib/apiHelpers";

export async function POST(req: Request) {
  try {
    await seedIfEmpty();
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    if (!body.email || !body.password) return apiError("Email and password required", 400);

    const result = await login(body.email, body.password, {
      ip: clientIp(req),
      userAgent: req.headers.get("user-agent") ?? "",
      remember: Boolean(body.remember),
    });

    const maxAge = Math.max(60, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000));
    // The session token is delivered only as an HttpOnly cookie; never in JSON.
    const response = NextResponse.json(
      { user: result.user },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(maxAge));
    return response;
  } catch (error) {
    if (error instanceof AuthError) return apiError(error.message, error.status);
    return handleError(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
