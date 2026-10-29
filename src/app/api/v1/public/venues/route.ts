import { NextRequest } from "next/server";
import { venuesDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "500") || 500));
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const result = await venuesDb.list({
      status: "published",
      page,
      limit,
      city: searchParams.get("city") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
    });
    return ok({ data: result.data, total: result.total, page: result.page });
  } catch (error) {
    return handleError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
