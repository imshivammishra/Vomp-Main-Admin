import { authorize } from "@/lib/reqAuth";
import { changePassword } from "@/lib/auth.server";
import { auditDb } from "@/lib/database";
import { ok, handleError, apiError } from "@/lib/apiHelpers";

export async function POST(req: Request) {
  try {
    const auth = await authorize(req);
    if (!auth.ok) return auth.response;
    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!body.newPassword) return apiError("New password is required", 400);
    await changePassword(auth.user.id, body.newPassword, body.currentPassword);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "auth.password_changed",
      resourceType: "admin_user",
      resourceId: auth.user.id,
      ip: auth.ip,
    });
    return ok({ changed: true });
  } catch (error) {
    return handleError(error);
  }
}
