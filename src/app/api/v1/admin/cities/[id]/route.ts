import { citiesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const city = await citiesDb.get(id);
    if (!city) return notFound("City");
    return ok(city);
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
    const city = await citiesDb.update(id, body);
    if (!city) return notFound("City");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "city.update",
      resourceType: "city",
      resourceId: city.id,
      summary: { name: city.name, status: city.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(city);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "geography.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await citiesDb.delete(id);
    if (!deleted) return notFound("City");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "city.delete",
      resourceType: "city",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
