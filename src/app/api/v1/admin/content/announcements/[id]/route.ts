import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const item = await contentDb.updateAnnouncement(id, await req.json());
    if (!item) return notFound("Announcement");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.announcement.update",
      resourceType: "announcement",
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
    if (!(await contentDb.deleteAnnouncement(id))) return notFound("Announcement");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.announcement.delete",
      resourceType: "announcement",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
