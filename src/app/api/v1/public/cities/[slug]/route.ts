import { citiesDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, notFound, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await seedIfEmpty();
    const { slug } = await params;
    const city = await citiesDb.get(slug);
    if (!city || city.status !== "published") return notFound("City");
    return ok(city);
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
