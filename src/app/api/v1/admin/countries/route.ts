import { NextRequest } from "next/server";
import { countriesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const result = await countriesDb.list({
      all: searchParams.get("all") === "true",
      search: searchParams.get("search") ?? undefined,
      active: searchParams.has("active") ? searchParams.get("active") === "true" : undefined,
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
    const country = await countriesDb.create(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "country.create",
      resourceType: "country",
      resourceId: country.id,
      summary: { code: country.code, name: country.name },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(country, 201);
  } catch (error) {
    return handleError(error);
  }
}
