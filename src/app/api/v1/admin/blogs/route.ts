import { NextRequest } from "next/server";
import { blogsDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, handleError, revalidateMainSite } from "@/lib/apiHelpers";
import { seedIfEmpty } from "@/lib/seedDb";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "content.view");
    if (!auth.ok) return auth.response;
    await seedIfEmpty();
    const { searchParams } = req.nextUrl;
    const result = await blogsDb.list({
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "20"),
    });
    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.edit");
    if (!auth.ok) return auth.response;
    const body = await req.json();
    const blog = await blogsDb.create(body);
    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "blog.create",
      resourceType: "blog",
      resourceId: blog.id,
      summary: { title: blog.title, status: blog.status },
      ip: auth.ip,
    });
    if (blog.status === "published") revalidateMainSite();
    return ok(blog, 201);
  } catch (error) {
    return handleError(error);
  }
}
