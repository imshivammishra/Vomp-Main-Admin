import { NextRequest } from "next/server";
import { contentDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    const location = req.nextUrl.searchParams.get("location") ?? "header";
    const items = await contentDb.navigation(location);
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
    const item = await contentDb.createNav(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "content.navigation.create",
      resourceType: "navigation_item",
      resourceId: item?.id ?? "",
      summary: { label: body.label, url: body.url },
      ip: auth.ip,
    });
    revalidateMainSite();
    return ok(item, 201);
  } catch (error) {
    return handleError(error);
  }
}
