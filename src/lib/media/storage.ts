/**
 * Local media storage.
 *
 * Files are written under UPLOAD_DIR (outside `public/`) and served through the
 * `/uploads/[...path]` route handler. This works in dev and in a standalone
 * production build, unlike files added to `public/` at runtime.
 *
 * Object storage (S3/R2) can be plugged in later behind the same interface;
 * local disk is the supported default and is documented as such.
 */
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type MediaKind = "image" | "video" | "document";

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_MB ?? 15) * 1024 * 1024;
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_MB ?? 200) * 1024 * 1024;

export function uploadRoot(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"));
}

export function checksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/** Resolve a URL path (e.g. 2026/10/a.webp) to an absolute file path, safely. */
export function resolveStoredPath(relative: string): string | null {
  const root = uploadRoot();
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

export interface DetectedFile {
  kind: MediaKind;
  mime: string;
  ext: string;
}

/**
 * Detect the real file type from magic bytes. The browser-supplied MIME type
 * and filename extension are NOT trusted.
 */
export function detectFile(buffer: Buffer): DetectedFile | null {
  const hex = buffer.subarray(0, 16).toString("hex").toLowerCase();
  if (hex.startsWith("ffd8ff")) return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (hex.startsWith("89504e47")) return { kind: "image", mime: "image/png", ext: "png" };
  if (hex.startsWith("47494638")) return { kind: "image", mime: "image/gif", ext: "gif" };
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "image", mime: "image/webp", ext: "webp" };
  }
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) {
      return { kind: "image", mime: "image/avif", ext: "avif" };
    }
    return { kind: "video", mime: "video/mp4", ext: "mp4" };
  }
  if (hex.startsWith("1a45dfa3")) return { kind: "video", mime: "video/webm", ext: "webm" };
  if (hex.startsWith("25504446")) return { kind: "document", mime: "application/pdf", ext: "pdf" };
  return null;
}

export function makeFilename(ext: string): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `${stamp}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
}

function datedFolder(kind: MediaKind): string {
  const now = new Date();
  return path.posix.join(kind === "video" ? "video" : kind === "document" ? "docs" : "images",
    String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
}

export async function writeStored(relative: string, data: Buffer): Promise<void> {
  const target = resolveStoredPath(relative);
  if (!target) throw new Error("Invalid storage path");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

export async function deleteStored(relative: string): Promise<void> {
  const target = resolveStoredPath(relative);
  if (!target) return;
  await fs.unlink(target).catch(() => undefined);
}

export function urlFor(relative: string): string {
  return `/uploads/${relative}`;
}

export function storedRelative(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  return url.slice("/uploads/".length);
}

export function ensureUploadRoot(): void {
  fsSync.mkdirSync(uploadRoot(), { recursive: true });
}

export { datedFolder };
