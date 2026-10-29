import { pagesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const page = await pagesDb.get(id);
    if (!page) return notFound("Page");
    return ok(page);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    if (body.status !== undefined) {
      const publishAuth = await authorize(req, "content.publish");
      if (!publishAuth.ok) return publishAuth.response;
    }
    const page = await pagesDb.update(id, body, Number(auth.user.id));
    if (!page) return notFound("Page");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "page.update",
      resourceType: "page",
      resourceId: page.id,
      summary: { slug: page.slug, status: page.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(page);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    if (!(await pagesDb.delete(id))) return notFound("Page");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "page.delete",
      resourceType: "page",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
