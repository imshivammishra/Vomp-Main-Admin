import { venuesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "venues.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { id } = await params;
    const venue = await venuesDb.get(id);
    if (!venue) return notFound("Venue");
    return ok(venue);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "venues.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    if (body.status !== undefined) {
      const publishAuth = await authorize(req, "venues.publish");
      if (!publishAuth.ok) return publishAuth.response;
    }
    const venue = await venuesDb.update(id, body);
    if (!venue) return notFound("Venue");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "venue.update",
      resourceType: "venue",
      resourceId: venue.id,
      summary: { name: venue.name, status: venue.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(venue);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "venues.delete");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await venuesDb.delete(id);
    if (!deleted) return notFound("Venue");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "venue.delete",
      resourceType: "venue",
      resourceId: id,
      ip: auth.ip,
    });
    revalidateMainSite();
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
