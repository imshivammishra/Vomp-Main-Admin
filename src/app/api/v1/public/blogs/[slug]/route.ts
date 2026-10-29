import { blogsDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, notFound, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await seedIfEmpty();
    const { slug } = await params;
    const blog = await blogsDb.get(slug);
    if (!blog || blog.status !== "published") return notFound("Blog");
    return ok(blog);
  } catch (error) {
    return handleError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
