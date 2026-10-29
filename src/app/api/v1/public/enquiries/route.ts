import { NextRequest } from "next/server";
import { enquiriesDb, auditDb } from "@/lib/database";
import { ok, apiError, handleError, err } from "@/lib/apiHelpers";
import { rateLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/reqAuth";
import { seedIfEmpty } from "@/lib/seedDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req) || "unknown";
    const limit = rateLimit(`enquiry:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.allowed) {
      return apiError("Too many enquiries. Please try again later.", 429, {
        retryAfter: limit.retryAfter,
      });
    }

    await seedIfEmpty();
    const body = (await req.json().catch(() => null)) as Record<string, string> | null;
    if (!body) return err("Invalid request body");
    if (!body.name || !body.phone) return err("Name and phone required");
    if (body.name.length > 150 || body.phone.length > 40) return err("Input too long");

    const enquiry = await enquiriesDb.create({
      name: body.name,
      phone: body.phone,
      email: body.email ?? "",
      city: body.city ?? "",
      eventType: body.eventType ?? "",
      eventDate: body.eventDate ?? "",
      guestCount: body.guestCount ?? "",
      message: body.message,
      venueName: body.venueName,
      source: body.source ?? "website",
      status: "new",
    });

    await auditDb.record({
      action: "enquiry.create",
      resourceType: "enquiry",
      resourceId: enquiry.id,
      outcome: "success",
      summary: { source: enquiry.source, venue: enquiry.venueName ?? "" },
      ip,
    });
    return ok(enquiry, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
