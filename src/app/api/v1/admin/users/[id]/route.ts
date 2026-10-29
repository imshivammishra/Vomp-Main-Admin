import { adminUsersDb, auditDb, sessionsDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { hashPassword } from "@/lib/auth.server";
import { ok, apiError, handleError, notFound } from "@/lib/apiHelpers";
import { ROLES } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "users.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const target = await adminUsersDb.get(id);
    if (!target) return notFound("User");
    const body = (await req.json().catch(() => ({}))) as {
      role?: string;
      isActive?: boolean;
      password?: string;
      name?: string;
    };

    if (body.role !== undefined) {
      if (!ROLES.some((role) => role.key === body.role)) return apiError("Unknown role", 422);
      if (target.id === auth.user.id) return apiError("You cannot change your own role", 403);
      if (target.role === "super_admin" && body.role !== "super_admin") {
        const remaining = await adminUsersDb.countActiveSuperAdmins();
        if (remaining <= 1) return apiError("At least one active super administrator is required", 409);
      }
      await adminUsersDb.updateRole(target.id, body.role!);
    }

    if (body.isActive !== undefined) {
      if (target.id === auth.user.id && body.isActive === false) {
        return apiError("You cannot deactivate your own account", 403);
      }
      if (target.role === "super_admin" && body.isActive === false) {
        const remaining = await adminUsersDb.countActiveSuperAdmins();
        if (remaining <= 1) return apiError("At least one active super administrator is required", 409);
      }
      await adminUsersDb.setActive(target.id, Boolean(body.isActive));
      if (body.isActive === false) await sessionsDb.revokeAllForUser(target.id);
    }

    if (body.password !== undefined) {
      if (body.password.length < 10) return apiError("Password must be at least 10 characters", 422);
      await adminUsersDb.updatePassword(target.email, await hashPassword(body.password));
      await sessionsDb.revokeAllForUser(target.id);
    }

    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "user.update",
      resourceType: "admin_user",
      resourceId: target.id,
      summary: {
        role: body.role, isActive: body.isActive,
        passwordReset: body.password !== undefined,
      },
      ip: auth.ip,
    });
    return ok(await adminUsersDb.get(target.id));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req, "users.manage");
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const target = await adminUsersDb.get(id);
    if (!target) return notFound("User");
    if (target.id === auth.user.id) return apiError("You cannot delete your own account", 403);
    if (target.role === "super_admin") {
      const remaining = await adminUsersDb.countActiveSuperAdmins();
      if (remaining <= 1) return apiError("At least one active super administrator is required", 409);
    }
    await sessionsDb.revokeAllForUser(target.id);
    await adminUsersDb.delete(target.id);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "user.delete",
      resourceType: "admin_user",
      resourceId: target.id,
      summary: { email: target.email, role: target.role },
      ip: auth.ip,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
