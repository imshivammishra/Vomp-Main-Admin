import { NextRequest } from "next/server";
import { venuesDb } from "@/lib/database";
import { auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "venues.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const result = await venuesDb.list({
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
      search: searchParams.get("search") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      featured: searchParams.get("featured") === null ? undefined : searchParams.get("featured") === "true",
      sort: searchParams.get("sort") ?? undefined,
      order: searchParams.get("order") === "asc" ? "asc" : "desc",
      includeDeleted: searchParams.get("includeDeleted") === "true",
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "venues.create");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const venue = await venuesDb.create(body, Number(auth.user.id));
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "venue.create",
      resourceType: "venue",
      resourceId: venue.id,
      summary: { name: venue.name, slug: venue.slug, status: venue.status },
      ip: auth.ip,
    });
    if (venue.status === "published") revalidateMainSite();
    return ok(venue, 201);
  } catch (error) {
    return handleError(error);
  }
}
