import { NextRequest } from "next/server";
import { reviewsDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty();
    const result = await reviewsDb.list({
      status: "published",
      venueSlug: req.nextUrl.searchParams.get("venue") ?? undefined,
    });
    // Public consumers use sortOrder; our table has no explicit field, so the
    // newest published rows sort first and a stable order is provided.
    const data = result.data.map((review, index) => ({ ...review, sortOrder: index }));
    return ok({ data, total: result.total });
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
