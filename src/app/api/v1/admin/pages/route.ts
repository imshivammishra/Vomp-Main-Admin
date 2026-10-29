import { pagesDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const result = await pagesDb.list();
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const page = await pagesDb.create(await req.json(), Number(auth.user.id));
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "page.create",
      resourceType: "page",
      resourceId: page.id,
      summary: { slug: page.slug, status: page.status },
      ip: auth.ip,
    });
    if (page.status === "published") revalidateMainSite();
    return ok(page, 201);
  } catch (error) {
    return handleError(error);
  }
}
