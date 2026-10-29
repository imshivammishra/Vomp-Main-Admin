"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  UploadCloud, Copy, Trash2, Check, FileText, Film, ImageIcon, Search, X,
} from "lucide-react";
import { mediaApi } from "@/lib/api";
import type { MediaFile } from "@/types";
import { formatDate, formatFileSize, truncate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

type KindFilter = "" | "image" | "video" | "document";

const KIND_TABS: { id: KindFilter; label: string; icon: React.ReactNode }[] = [
  { id: "", label: "All", icon: null },
  { id: "image", label: "Images", icon: <ImageIcon size={13} /> },
  { id: "video", label: "Videos", icon: <Film size={13} /> },
  { id: "document", label: "Documents", icon: <FileText size={13} /> },
];

function formatDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function MediaPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [kind, setKind] = useState<KindFilter>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mediaApi.list({
        kind: kind || undefined,
        search: debouncedSearch || undefined,
        limit: 120,
      });
      setFiles(res.data ?? []);
      setTotal(res.total ?? (res.data ?? []).length);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load media", "error");
    } finally {
      setLoading(false);
    }
  }, [kind, debouncedSearch, toast]);

  useEffect(() => { void load(); }, [load]);

  const uploadFiles = async (list: FileList | File[]) => {
    const queue = Array.from(list);
    if (queue.length === 0) return;
    setUploading(true);
    let succeeded = 0;
    for (let i = 0; i < queue.length; i += 1) {
      const file = queue[i];
      setUploadName(queue.length > 1 ? `${file.name} (${i + 1}/${queue.length})` : file.name);
      setProgress(0);
      try {
        await mediaApi.upload(file, {
          folder: "library",
          onProgress: setProgress,
        });
        succeeded += 1;
      } catch (err) {
        toast.show(
          `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`,
          "error"
        );
      }
    }
    setUploading(false);
    setProgress(0);
    setUploadName("");
    if (succeeded > 0) {
      toast.show(`${succeeded} file${succeeded === 1 ? "" : "s"} uploaded`, "success");
      void load();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) void uploadFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      toast.show("URL copied to clipboard", "success");
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => toast.show("Could not copy to clipboard", "error"));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await mediaApi.delete(deleteTarget.id);
      toast.show("File deleted", "success");
      setDeleteTarget(null);
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer",
          uploading ? "h-36" : "h-32",
          dragging ? "border-[#7f0f2e] bg-red-50" : "border-[#e8e8ed] bg-white hover:border-[#7f0f2e] hover:bg-red-50/30",
        ].join(" ")}
      >
        {uploading ? (
          <div className="w-full max-w-sm px-6 text-center">
            <p className="text-sm text-[#3f3f46] mb-2 truncate">{uploadName || "Uploading…"}</p>
            <div className="h-1.5 w-full rounded-full bg-[#e4e4e7] overflow-hidden">
              <div
                className="h-full bg-[#9b1239] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#71717a] mt-1.5">{progress}%</p>
          </div>
        ) : (
          <>
            <UploadCloud size={28} className="text-[#6e6e73]" />
            <p className="text-sm text-[#6e6e73] text-center px-4">
              <span className="font-medium text-[#7f0f2e]">Click to upload</span> or drag and drop
            </p>
            <p className="text-[11px] text-[#a1a1aa]">
              Images (JPEG, PNG, WebP, AVIF, GIF), MP4/WebM video and PDF
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setKind(tab.id)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
                kind === tab.id
                  ? "bg-[#09090b] text-white"
                  : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]",
              ].join(" ")}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="h-8 w-full pl-9 pr-8 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#3f3f46]"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <span className="ml-auto text-[12px] text-[#a1a1aa]">
          {total} file{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={32} /></div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8e8ed] py-16 text-center text-[#6e6e73]">
          <UploadCloud size={40} className="mx-auto mb-3 opacity-30" />
          <p>{debouncedSearch || kind ? "No files match this filter" : "No media files uploaded yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => (
            <div key={file.id} className="group bg-white rounded-xl border border-[#e8e8ed] overflow-hidden">
              <div className="relative aspect-square bg-[#f4f4f5] overflow-hidden">
                {file.kind === "image" ? (
                  <Image
                    src={file.variants?.thumb || file.url}
                    alt={file.altText || file.originalName || file.filename}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    className="object-cover"
                    unoptimized
                  />
                ) : file.kind === "video" ? (
                  <video
                    src={file.url}
                    poster={file.posterUrl || undefined}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover bg-black"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#71717a] hover:text-[#9b1239]"
                  >
                    <FileText size={34} />
                    <span className="text-[10px] uppercase tracking-wider">
                      {file.mimeType.split("/")[1] || "document"}
                    </span>
                  </a>
                )}
                {file.kind === "video" && file.duration ? (
                  <span className="absolute top-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {formatDuration(file.duration)}
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-white text-[10px] font-medium truncate block">
                    {file.filename}
                  </span>
                </div>
              </div>
              <div className="p-2">
                <p
                  className="text-xs font-medium text-[#1d1d1f] truncate"
                  title={file.originalName || file.filename}
                >
                  {truncate(file.originalName || file.filename, 28)}
                </p>
                <p className="text-[11px] text-[#6e6e73]">
                  {formatFileSize(file.size)}
                  {file.width && file.height ? ` · ${file.width}×${file.height}` : ""}
                  {` · ${formatDate(file.createdAt)}`}
                </p>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => copyUrl(file.url, file.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs text-[#6e6e73] hover:bg-gray-100 transition-colors"
                    title="Copy URL"
                  >
                    {copied === file.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    {copied === file.id ? "Copied" : "Copy URL"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(file)}
                    className="px-2 py-1 rounded text-xs text-[#6e6e73] hover:bg-red-50 hover:text-[#dc2626] transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete File">
        <p className="text-sm text-[#6e6e73] mb-2">
          Delete <span className="font-medium text-[#1d1d1f]">{deleteTarget?.originalName || deleteTarget?.filename}</span>?
        </p>
        <p className="text-[12px] text-[#a1a1aa] mb-6">
          The file is removed from storage together with its generated variants. Pages already
          using this URL will show a broken image or video.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
