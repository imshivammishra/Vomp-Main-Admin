import { NextRequest } from "next/server";
import sharp, { type Metadata } from "sharp";
import path from "node:path";
import { mediaDb, auditDb } from "@/lib/database";
import { authorize } from "@/lib/reqAuth";
import { ok, apiError, handleError } from "@/lib/apiHelpers";
import {
  MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, checksum, detectFile, makeFilename,
  writeStored, deleteStored, urlFor, datedFolder,
} from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGE_VARIANTS = [
  { name: "thumb", width: 400 },
  { name: "medium", width: 1200 },
  { name: "large", width: 1920 },
] as const;

function badRequest(message: string) {
  return apiError(message, 400);
}

export async function POST(req: NextRequest) {
  const written: string[] = [];
  try {
    const auth = await authorize(req, "media.upload");
    if (!auth.ok) return auth.response;

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return badRequest("Upload must be multipart/form-data");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("No file provided");
    if (file.size === 0) return badRequest("The file is empty");

    const folder = String(form.get("folder") ?? "general").slice(0, 100) || "general";
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectFile(buffer);
    if (!detected) {
      return badRequest("Unsupported file type. Allowed: JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, PDF.");
    }
    if (detected.kind === "image" && buffer.length > MAX_IMAGE_BYTES) {
      return badRequest(`Image exceeds the ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB limit`);
    }
    if (detected.kind === "video" && buffer.length > MAX_VIDEO_BYTES) {
      return badRequest(`Video exceeds the ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB limit`);
    }

    const hash = checksum(buffer);
    const existing = await mediaDb.findByChecksum(hash);
    if (existing) {
      return ok({ ...existing, deduplicated: true }, 200);
    }

    const dir = datedFolder(detected.kind);
    let url: string;
    let width: number | null = null;
    let height: number | null = null;
    let mime = detected.mime;
    let size = buffer.length;
    const variants: Record<string, string> = {};
    const posterUrl = "";

    if (detected.kind === "image") {
      // Validate that the bytes really are a decodable image before trusting them.
      let meta: Metadata;
      try {
        meta = await sharp(buffer, { failOn: "error" }).metadata();
      } catch {
        return badRequest("The image could not be decoded. It may be corrupt or not a real image.");
      }
      width = meta.width ?? null;
      height = meta.height ?? null;

      // Store a normalised WebP as the canonical asset, preserving the original.
      const originalName = makeFilename(detected.ext);
      const originalRel = path.posix.join(dir, `orig-${originalName}`);
      await writeStored(originalRel, buffer);
      written.push(originalRel);

      const canonicalName = makeFilename("webp");
      const canonicalRel = path.posix.join(dir, canonicalName);
      const canonical = await sharp(buffer, { failOn: "error" })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await writeStored(canonicalRel, canonical);
      written.push(canonicalRel);

      const canonicalMeta = await sharp(canonical).metadata();
      width = canonicalMeta.width ?? width;
      height = canonicalMeta.height ?? height;
      mime = "image/webp";
      size = canonical.length;
      url = urlFor(canonicalRel);

      for (const variant of IMAGE_VARIANTS) {
        if (width && variant.width > width) continue;
        const name = makeFilename("webp");
        const rel = path.posix.join(dir, `${variant.name}-${name}`);
        const data = await sharp(buffer, { failOn: "error" })
          .rotate()
          .resize({ width: variant.width, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer();
        await writeStored(rel, data);
        written.push(rel);
        variants[variant.name] = urlFor(rel);
      }

      const filename = path.basename(canonicalRel);
      const record = await mediaDb.add({
        url,
        filename,
        originalName: file.name.slice(0, 255),
        size,
        mimeType: mime,
        kind: "image",
        width,
        height,
        duration: null,
        altText: String(form.get("altText") ?? ""),
        caption: String(form.get("caption") ?? ""),
        credit: String(form.get("credit") ?? ""),
        folder,
        checksum: hash,
        posterUrl: "",
        variants,
        createdBy: Number(auth.user.id),
      });

      await auditDb.record({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "media.upload",
        resourceType: "media",
        resourceId: record.id,
        summary: { kind: record.kind, size, width, height },
        ip: auth.ip,
      });
      return ok(record, 201);
    }

    // Video / document: stored as uploaded. No ffmpeg is available in this
    // environment, so no server-side poster frame is generated. Duration is
    // taken from the client (validated range) and clearly marked as such.
    const name = makeFilename(detected.ext);
    const rel = path.posix.join(dir, name);
    await writeStored(rel, buffer);
    written.push(rel);
    url = urlFor(rel);

    const clientDuration = Number(form.get("duration"));
    const duration =
      detected.kind === "video" && Number.isFinite(clientDuration) && clientDuration > 0
        ? Math.min(clientDuration, 60 * 60 * 6)
        : null;

    const record = await mediaDb.add({
      url,
      filename: path.basename(rel),
      originalName: file.name.slice(0, 255),
      size,
      mimeType: mime,
      kind: detected.kind,
      width: null,
      height: null,
      duration,
      altText: String(form.get("altText") ?? ""),
      caption: String(form.get("caption") ?? ""),
      credit: String(form.get("credit") ?? ""),
      folder,
      checksum: hash,
      posterUrl,
      variants,
      createdBy: Number(auth.user.id),
    });

    await auditDb.record({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "media.upload",
      resourceType: "media",
      resourceId: record.id,
      summary: { kind: record.kind, size, duration },
      ip: auth.ip,
    });
    return ok(record, 201);
  } catch (error) {
    // If the DB write failed after files were written, clean up orphans.
    for (const rel of written) await deleteStored(rel);
    return handleError(error);
  }
}
