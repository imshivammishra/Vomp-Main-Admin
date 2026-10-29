import { NextRequest } from "next/server";
import { mediaDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "media.view");
    if (!auth.ok) return auth.response;
    const { searchParams } = req.nextUrl;
    const result = await mediaDb.list({
      kind: searchParams.get("kind") ?? undefined,
      folder: searchParams.get("folder") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "60"),
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
