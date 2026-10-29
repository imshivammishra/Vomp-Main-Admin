import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const items = await contentDb.allAnnouncements();
    return ok({ data: items, total: items.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const item = await contentDb.createAnnouncement(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.announcement.create",
      resourceType: "announcement",
      resourceId: item?.id ?? "",
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(item, 201);
  } catch (error) {
    return handleError(error);
  }
}
