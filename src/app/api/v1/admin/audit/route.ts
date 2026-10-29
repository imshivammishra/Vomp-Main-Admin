import { NextRequest } from "next/server";
import { auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "audit.view");
    if (!auth.ok) return auth.response;
    const { searchParams } = req.nextUrl;
    const result = await auditDb.list({
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "50"),
      action: searchParams.get("action") ?? undefined,
      resourceType: searchParams.get("resourceType") ?? undefined,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
