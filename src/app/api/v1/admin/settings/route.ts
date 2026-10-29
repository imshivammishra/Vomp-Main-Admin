import { settingsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "settings.view");
    if (!auth.ok) return auth.response;
    return ok(await settingsDb.get());
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await authorize(req, "settings.manage");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const settings = await settingsDb.update(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "settings.update",
      resourceType: "settings",
      summary: { keys: Object.keys(body ?? {}) },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(settings);
  } catch (error) {
    return handleError(error);
  }
}
