import { reviewsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const review = await reviewsDb.get(id);
    if (!review) return notFound("Review");
    return ok(review);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const review = await reviewsDb.update(id, body);
    if (!review) return notFound("Review");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "review.update",
      resourceType: "review",
      resourceId: review.id,
      summary: { status: review.status, featured: review.featured },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(review);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await reviewsDb.delete(id);
    if (!deleted) return notFound("Review");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "review.delete",
      resourceType: "review",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
