import { NextRequest } from "next/server";
import { bookingsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "bookings.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const result = await bookingsDb.list({
      status: searchParams.get("status") ?? undefined,
      venueId: searchParams.get("venueId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "bookings.create");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const booking = await bookingsDb.create({ ...body, createdBy: Number(auth.user.id) });
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "booking.create",
      resourceType: "booking",
      resourceId: booking.id,
      summary: { reference: booking.reference, venueId: booking.venueId, eventDate: booking.eventDate },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(booking, 201);
  } catch (error) {
    return handleError(error);
  }
}
