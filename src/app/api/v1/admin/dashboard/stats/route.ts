import { dashboardDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "venues.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    return ok(await dashboardDb.stats());
  } catch (error) {
    return handleError(error);
  }
}
