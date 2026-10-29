import { NextRequest } from "next/server";
import { geoDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, apiError, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

/** First-level administrative divisions for a country, from PostgreSQL. */
export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty();
    const country = (req.nextUrl.searchParams.get("country") ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return apiError("A 2-letter country code is required", 400);
    const states = await geoDb.states(country);
    return ok({ data: states, total: states.length });
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
