import { NextRequest } from "next/server";
import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, apiError, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const sections = await contentDb.homepage();
    return ok({ data: sections, total: sections.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.key !== "string") return apiError("A section key is required", 400);
    const updated = await contentDb.updateHomepageSection(body.key, body);
    if (!updated) return apiError("Homepage section not found", 404);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.homepage.update",
      resourceType: "homepage_section",
      resourceId: updated.key,
      summary: { title: updated.title, visible: updated.visible },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
