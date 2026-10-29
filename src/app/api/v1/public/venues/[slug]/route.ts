import { venuesDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, notFound, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await seedIfEmpty();
    const { slug } = await params;
    const venue = await venuesDb.get(slug);
    if (!venue || venue.status !== "published" || venue.deletedAt) return notFound("Venue");
    return ok(venue);
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
