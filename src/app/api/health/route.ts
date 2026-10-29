import { driver, healthCheck } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/** Liveness + database readiness probe for the reverse proxy and uptime checks. */
export async function GET() {
  const health = await healthCheck();
  const body = {
    status: health.ok ? "ok" : "degraded",
    database: {
      driver: driver(),
      ok: health.ok,
      latencyMs: health.latencyMs,
      ...(health.error ? { error: health.error } : {}),
    },
    time: new Date().toISOString(),
  };
  return Response.json(body, {
    status: health.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
