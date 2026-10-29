import { adminUsersDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { hashPassword } from "@/lib/auth.server";
import { ok, apiError, handleError } from "@/lib/apiHelpers";
import { ROLES } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "users.view");
    if (!auth.ok) return auth.response;
    const users = await adminUsersDb.list();
    return ok({ data: users, total: users.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "users.manage");
    if (!auth.ok) return auth.response;
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
      password?: string;
      role?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return apiError("A valid email is required", 400);
    if (!body.password || body.password.length < 10) {
      return apiError("Password must be at least 10 characters", 422);
    }
    const roleKey = body.role ?? "admin";
    if (!ROLES.some((role) => role.key === roleKey)) return apiError("Unknown role", 422);
    if (await adminUsersDb.findByEmail(email)) {
      return apiError("An account with that email already exists", 409);
    }
    await adminUsersDb.create(email, await hashPassword(body.password), body.name ?? "Admin", roleKey);
    const created = await adminUsersDb.findByEmail(email);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "user.create",
      resourceType: "admin_user",
      resourceId: created?.id ?? "",
      summary: { email, role: roleKey },
      ip: auth.ip,
    });
    return ok(
      created
        ? {
            id: created.id, email: created.email, name: created.name,
            role: created.role, roleName: created.roleName,
            permissions: created.permissions, isActive: created.isActive,
            lastLoginAt: created.lastLoginAt,
          }
        : null,
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
