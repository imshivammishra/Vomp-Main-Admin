import { adminUsersDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "users.view");
    if (!auth.ok) return auth.response;
    const roles = await adminUsersDb.listRoles();
    return ok({ data: roles, total: roles.length });
  } catch (error) {
    return handleError(error);
  }
}
