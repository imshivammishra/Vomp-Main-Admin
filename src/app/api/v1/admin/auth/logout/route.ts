import { NextResponse } from "next/server";
import { extractToken, logout, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth.server";
import { authenticateRequest } from "@/lib/auth.server";
import { clientIp } from "@/lib/reqAuth";

export async function POST(req: Request) {
  const token = extractToken(req);
  const actor = await authenticateRequest(req);
  await logout(token, actor ?? undefined, clientIp(req));
  const response = new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return response;
}
