import { NextRequest } from "next/server";
import { citiesDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty();
    const result = await citiesDb.list({
      status: "published",
      country: req.nextUrl.searchParams.get("country") ?? undefined,
      search: req.nextUrl.searchParams.get("search") ?? undefined,
    });
    return ok({ data: result.data, total: result.total });
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
