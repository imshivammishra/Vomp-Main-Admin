import fs from "node:fs/promises";
import path from "node:path";
import { resolveStoredPath } from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

/** Serve uploaded media from the storage directory. Blocks path traversal. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;
  const relative = parts.join("/");
  const target = resolveStoredPath(relative);
  if (!target) return new Response("Not found", { status: 404 });

  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const data = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
