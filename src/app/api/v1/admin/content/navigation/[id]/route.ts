import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const item = await contentDb.updateNav(id, body);
    if (!item) return notFound("Navigation item");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.navigation.update",
      resourceType: "navigation_item",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(item);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await contentDb.deleteNav(id);
    if (!deleted) return notFound("Navigation item");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.navigation.delete",
      resourceType: "navigation_item",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
