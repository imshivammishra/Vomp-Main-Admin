import { NextRequest } from "next/server";
import { mediaDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound } from "@/lib/apiHelpers";
import { deleteStored, storedRelative } from "@/lib/media/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authorize(req, "media.upload");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const media = await mediaDb.update(id, body);
    if (!media) return notFound("Media");
    return ok(media);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authorize(req, "media.delete");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const media = await mediaDb.get(id);
    if (!media) return notFound("Media");
    const deleted = await mediaDb.delete(id);
    if (!deleted) return notFound("Media");
    // Remove the stored file plus generated variants. The DB row is retained
    // (soft-deleted) so audit trails stay intact.
    for (const url of [media.url, media.posterUrl, ...Object.values(media.variants ?? {})]) {
      const rel = url ? storedRelative(url) : null;
      if (rel) await deleteStored(rel);
    }
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "media.delete",
      resourceType: "media",
      resourceId: id,
      ip: auth.ip,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
