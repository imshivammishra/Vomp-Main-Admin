import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const faq = await contentDb.updateFaq(id, await req.json());
    if (!faq) return notFound("FAQ");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.faq.update",
      resourceType: "faq",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(faq);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    if (!(await contentDb.deleteFaq(id))) return notFound("FAQ");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.faq.delete",
      resourceType: "faq",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
