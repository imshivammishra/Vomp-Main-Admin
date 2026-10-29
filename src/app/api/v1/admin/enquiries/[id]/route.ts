import { NextRequest } from "next/server";
import { enquiriesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, notFound } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authorize(req, "bookings.view");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const enquiry = await enquiriesDb.get(id);
    if (!enquiry) return notFound("Enquiry");
    return ok(enquiry);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authorize(req, "bookings.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = await req.json();
    const updated = await enquiriesDb.update(id, body);
    if (!updated) return notFound("Enquiry");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "enquiry.update",
      resourceType: "enquiry",
      resourceId: updated.id,
      summary: { status: updated.status },
      ip: auth.ip,
    });
    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authorize(req, "bookings.edit");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const deleted = await enquiriesDb.delete(id);
    if (!deleted) return notFound("Enquiry");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "enquiry.delete",
      resourceType: "enquiry",
      resourceId: id,
      ip: auth.ip,
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
