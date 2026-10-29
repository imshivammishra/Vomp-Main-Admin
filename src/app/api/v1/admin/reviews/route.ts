import { NextRequest } from "next/server";
import { reviewsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const result = await reviewsDb.list({
      venueSlug: searchParams.get("venue") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const review = await reviewsDb.create(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "review.create",
      resourceType: "review",
      resourceId: review.id,
      summary: { name: review.name, status: review.status },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(review, 201);
  } catch (error) {
    return handleError(error);
  }
}
