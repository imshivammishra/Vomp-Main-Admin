"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, X, RotateCcw, Film, FileText, AlertCircle } from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { MediaFile } from "@/types";

export interface ImageUploadProps {
  /** Current persisted URL. */
  value?: string;
  /** Which file kinds to accept. */
  kind?: "image" | "video" | "any";
  /** Media library folder to group the upload under. */
  folder?: string;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  onUploaded: (media: MediaFile) => void;
  onClear?: () => void;
}

const ACCEPT: Record<NonNullable<ImageUploadProps["kind"]>, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  video: "video/mp4,video/webm",
  any: "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,application/pdf",
};

const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 200;

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

/** Read duration client-side. Used only as metadata; never trusted for auth. */
function readVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const value = Number.isFinite(video.duration) ? video.duration : undefined;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    video.src = url;
  });
}

export default function ImageUpload({
  value,
  kind = "image",
  folder = "general",
  label = "Upload media",
  helperText,
  disabled = false,
  className = "",
  onUploaded,
  onClear,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => revokePreview, [revokePreview]);

  const upload = useCallback(
    async (file: File) => {
      setError("");

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isPdf = file.type === "application/pdf";

      if (kind === "image" && !isImage) {
        setError("Please choose an image file (JPEG, PNG, WebP, AVIF or GIF).");
        return;
      }
      if (kind === "video" && !isVideo) {
        setError("Please choose a video file (MP4 or WebM).");
        return;
      }
      if (kind === "any" && !isImage && !isVideo && !isPdf) {
        setError("Unsupported file type.");
        return;
      }
      if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`Images must be ${MAX_IMAGE_MB} MB or smaller.`);
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Videos must be ${MAX_VIDEO_MB} MB or smaller.`);
        return;
      }

      // Local preview before the network request — replaced by the real URL
      // only after the server confirms the upload.
      revokePreview();
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreview({ url: objectUrl, type: file.type, name: file.name });
      setLastFile(file);

      setUploading(true);
      setProgress(0);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const duration = isVideo ? await readVideoDuration(file) : undefined;
        const media = await mediaApi.upload(file, {
          folder,
          duration,
          signal: controller.signal,
          onProgress: setProgress,
        });
        revokePreview();
        setPreview(null);
        setLastFile(null);
        setProgress(100);
        onUploaded(media);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
        abortRef.current = null;
      }
    },
    [folder, kind, onUploaded, revokePreview]
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setProgress(0);
    revokePreview();
    setPreview(null);
  };

  const clear = () => {
    cancel();
    setLastFile(null);
    setError("");
    onClear?.();
  };

  const shownUrl = preview?.url ?? value;
  const showsVideo = preview ? preview.type.startsWith("video/") : Boolean(value && isVideoUrl(value));
  const showsPdf = !preview && Boolean(value && isPdfUrl(value));

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">{label}</label>
      )}

      {shownUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-[#e8e8ed] bg-[#f4f4f5]">
          {showsVideo ? (
            <video
              src={shownUrl}
              controls
              playsInline
              className="w-full max-h-[320px] bg-black"
            />
          ) : showsPdf ? (
            <div className="flex items-center gap-3 p-6">
              <FileText size={28} className="text-[#6e6e73]" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1d1d1f] truncate">PDF document</p>
                <a
                  href={shownUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#9b1239] hover:underline"
                >
                  Open file
                </a>
              </div>
            </div>
          ) : (
            // Local blob previews cannot use next/image optimisation.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownUrl}
              alt={preview?.name ?? "Uploaded media preview"}
              className="w-full max-h-[320px] object-contain bg-[#f4f4f5]"
            />
          )}

          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              {onClear && (
                <button
                  type="button"
                  onClick={clear}
                  disabled={disabled}
                  className="h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  aria-label="Remove media"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {uploading && (
            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2">
              <div className="flex items-center justify-between text-[11px] text-white mb-1">
                <span>Uploading… {progress}%</span>
                <button type="button" onClick={cancel} className="underline">
                  Cancel
                </button>
              </div>
              <div className="h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-[#d4a437] transition-all"
                  style={{ width: `${Math.max(4, progress)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled || uploading}
          className={[
            "flex w-full flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed transition-colors text-center px-4",
            dragging
              ? "border-[#9b1239] bg-red-50"
              : "border-[#e8e8ed] bg-white hover:border-[#9b1239] hover:bg-red-50/30",
            disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          ].join(" ")}
        >
          {uploading ? (
            <>
              <UploadCloud size={24} className="text-[#9b1239] animate-pulse" />
              <span className="text-sm text-[#6e6e73]">Uploading… {progress}%</span>
              <span className="text-[11px] text-[#a1a1aa]">Click cancel below to stop</span>
            </>
          ) : (
            <>
              {kind === "video" ? (
                <Film size={24} className="text-[#6e6e73]" />
              ) : (
                <UploadCloud size={24} className="text-[#6e6e73]" />
              )}
              <span className="text-sm text-[#6e6e73]">
                <span className="font-medium text-[#9b1239]">Click to upload</span> or drag and drop
              </span>
              <span className="text-[11px] text-[#a1a1aa]">
                {kind === "video"
                  ? "MP4 or WebM · up to 200 MB"
                  : kind === "any"
                    ? "JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or PDF"
                    : "JPEG, PNG, WebP, AVIF or GIF · up to 15 MB"}
              </span>
            </>
          )}
        </button>
      )}

      {uploading && shownUrl && (
        <button
          type="button"
          onClick={cancel}
          className="mt-1.5 text-[11px] text-[#6e6e73] underline"
        >
          Cancel upload
        </button>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-3 py-2">
          <AlertCircle size={14} className="text-[#b91c1c] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-[#b91c1c]">{error}</p>
            {lastFile && !uploading && (
              <button
                type="button"
                onClick={() => void upload(lastFile)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#b91c1c] underline"
              >
                <RotateCcw size={11} /> Retry upload
              </button>
            )}
          </div>
        </div>
      )}

      {helperText && !error && (
        <p className="mt-1.5 text-[12px] text-[#a1a1aa]">{helperText}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
