import { NextRequest } from "next/server";
import { geoDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, apiError, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

/** City suggestions for a country/state from the maintained dataset. */
export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty();
    const country = (req.nextUrl.searchParams.get("country") ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return apiError("A 2-letter country code is required", 400);
    const state = req.nextUrl.searchParams.get("state") ?? undefined;
    const q = (req.nextUrl.searchParams.get("search") ?? "").toLowerCase();
    let cities = geoDb.cities(country, state);
    if (q) cities = cities.filter((city) => city.name.toLowerCase().includes(q));
    const data = cities.slice(0, 300);
    return ok({ data, total: cities.length });
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
