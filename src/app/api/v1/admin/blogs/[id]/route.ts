import { blogsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const blog = await blogsDb.get(id);
    if (!blog) return notFound("Blog");
    return ok(blog);
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
    const blog = await blogsDb.update(id, body);
    if (!blog) return notFound("Blog");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "blog.update",
      resourceType: "blog",
      resourceId: blog.id,
      summary: { title: blog.title, status: blog.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(blog);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await blogsDb.delete(id);
    if (!deleted) return notFound("Blog");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "blog.delete",
      resourceType: "blog",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
