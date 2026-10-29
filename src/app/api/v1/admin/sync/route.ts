import { auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, apiError, handleError, revalidateMainSiteNow } from "@/lib/apiHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Manually purge the public website cache. Requires a real publish permission
 * and reports the actual result of the public site request — a missing secret
 * is surfaced as "not configured" rather than a fake success.
 */
export async function POST(req: Request) {
  try {
    const auth = await authorize(req, "content.publish");
    if (!auth.ok) return auth.response;

    const result = await revalidateMainSiteNow();

    if (!result.skipped) {
      await auditDb.record({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "content.sync",
        resourceType: "public_site",
        resourceId: "revalidate",
        outcome: result.ok ? "success" : "failure",
        summary: { status: result.status ?? null, error: result.error ?? null },
        ip: auth.ip,
      });
    }

    if (result.skipped) {
      return apiError(
        "Public site sync is not configured. Set MAIN_SITE_URL and REVALIDATE_SECRET on the server.",
        503,
        { configured: false }
      );
    }
    if (!result.ok) {
      return apiError(result.error ?? "The public site did not confirm the cache purge", 502);
    }
    return ok({ synced: true, status: result.status ?? 200 });
  } catch (error) {
    return handleError(error);
  }
}
