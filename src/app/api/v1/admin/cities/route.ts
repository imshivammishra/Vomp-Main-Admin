import { NextRequest } from "next/server";
import { citiesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const result = await citiesDb.list({
      country: req.nextUrl.searchParams.get("country") ?? undefined,
      status: req.nextUrl.searchParams.get("status") ?? undefined,
      search: req.nextUrl.searchParams.get("search") ?? undefined,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const city = await citiesDb.create(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "city.create",
      resourceType: "city",
      resourceId: city.id,
      summary: { name: city.name, slug: city.slug },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(city, 201);
  } catch (error) {
    return handleError(error);
  }
}
