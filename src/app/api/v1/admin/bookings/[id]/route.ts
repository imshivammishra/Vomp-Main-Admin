import { bookingsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, apiError, handleError, notFound, revalidateMainSite } from "@/lib/apiHelpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "bookings.view");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const booking = await bookingsDb.get(id);
    if (!booking) return notFound("Booking");
    return ok(booking);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { status?: string; note?: string };
    if (!body.status) return apiError("Status is required", 400);
    const permission = body.status === "cancelled" ? "bookings.cancel" : "bookings.edit";
    const auth = await authorize(req, permission);
    if (!auth.ok) return auth.response;
    const booking = await bookingsDb.setStatus(id, body.status, body.note ?? "", Number(auth.user.id));
    if (!booking) return notFound("Booking");
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "booking.status",
      resourceType: "booking",
      resourceId: booking.id,
      summary: { reference: booking.reference, status: booking.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(booking);
  } catch (error) {
    return handleError(error);
  }
}
