import { NextRequest } from "next/server";
import { enquiriesDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "bookings.view");
    if (!auth.ok) return auth.response;
    const { searchParams } = req.nextUrl;
    const result = await enquiriesDb.list({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
