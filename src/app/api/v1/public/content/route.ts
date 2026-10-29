import { contentDb } from "@/lib/database";
import { seedIfEmpty } from "@/lib/seedDb";
import { ok, handleError } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

/**
 * Public reusable content blocks consumed by the marketing site
 * (about page film placement, contact page copy, homepage sections).
 */
export async function GET() {
  try {
    await seedIfEmpty();
    const sections = await contentDb.homepage();
    const blocks = sections
      .filter((section) => section.visible)
      .map((section) => {
        const content = (section.content ?? {}) as Record<string, unknown>;
        const known = new Set([
          "body", "image", "imageAlt", "linkLabel", "linkHref", "icon", "status",
        ]);
        const meta = Object.fromEntries(
          Object.entries(content).filter(([key]) => !known.has(key))
        );
        return {
          id: section.id,
          section: section.type,
          blockKey: section.key,
          title: section.title,
          subtitle: section.subtitle,
          body: String(content.body ?? ""),
          image: String(content.image ?? ""),
          imageAlt: String(content.imageAlt ?? ""),
          linkLabel: String(content.linkLabel ?? ""),
          linkHref: String(content.linkHref ?? ""),
          icon: String(content.icon ?? ""),
          meta,
          sortOrder: section.sortOrder,
          status: "published",
          createdAt: "",
          updatedAt: "",
        };
      });

    return ok(blocks);
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
