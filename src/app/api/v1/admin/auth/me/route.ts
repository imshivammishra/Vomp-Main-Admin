import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req);
    if (!auth.ok) return auth.response;
    return ok(auth.user);
  } catch (error) {
    return handleError(error);
  }
}
