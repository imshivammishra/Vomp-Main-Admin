import { countriesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const country = await countriesDb.get(id);
    if (!country) return notFound("Country");
    return ok(country);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const country = await countriesDb.update(id, body);
    if (!country) return notFound("Country");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "country.update",
      resourceType: "country",
      resourceId: country.id,
      summary: { code: country.code, active: country.active },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(country);
  } catch (error) {
    return handleError(error);
  }
}

/** Deactivate a country rather than deleting reference data. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const country = await countriesDb.setActive(id, false);
    if (!country) return notFound("Country");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "country.deactivate",
      resourceType: "country",
      resourceId: country.id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(country);
  } catch (error) {
    return handleError(error);
  }
}
