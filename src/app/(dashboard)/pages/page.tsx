"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { pagesApi } from "@/lib/api";
import { slugify } from "@/lib/utils";
import type { WebsitePage, ContentStatus } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "draft", label: "Draft — not visible" },
  { value: "published", label: "Published — live" },
  { value: "archived", label: "Archived" },
];

const STATUS_BADGE: Record<ContentStatus, "green" | "yellow" | "gray"> = {
  published: "green",
  draft: "yellow",
  archived: "gray",
};

type FormState = Partial<WebsitePage>;

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  ogImage: "",
  robots: "index,follow",
  status: "draft",
  blocks: [],
};

export default function WebsitePagesPage() {
  const toast = useToast();
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WebsitePage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugManual, setSlugManual] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<WebsitePage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pagesApi.list();
      setPages(res.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load pages", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (page: WebsitePage) => {
    setEditing(page);
    setForm({ ...EMPTY_FORM, ...page });
    setSlugManual(true);
    setErrors({});
    setShowForm(true);
  };

  const handleTitle = (value: string) => {
    set("title", value);
    if (!slugManual) set("slug", slugify(value));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = "Title is required";
    if (!form.slug?.trim()) e.slug = "Slug is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Partial<WebsitePage> = {
        title: form.title?.trim(),
        slug: slugify(form.slug || form.title || ""),
        description: form.description ?? "",
        seoTitle: form.seoTitle ?? "",
        seoDescription: form.seoDescription ?? "",
        canonicalUrl: form.canonicalUrl ?? "",
        ogImage: form.ogImage ?? "",
        robots: form.robots || "index,follow",
        status: form.status ?? "draft",
        blocks: form.blocks ?? [],
      };
      if (editing) {
        await pagesApi.update(editing.id, payload);
        toast.show("Page updated", "success");
      } else {
        await pagesApi.create(payload);
        toast.show("Page created", "success");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save page", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (page: WebsitePage) => {
    setDeleting(true);
    try {
      await pagesApi.delete(page.id);
      toast.show("Page deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6e6e73]">
          Static marketing pages (About, Privacy, Terms, etc.) served on the public website.
        </p>
        <Button icon={<Plus size={15} />} onClick={openCreate}>
          New Page
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Title", "URL", "Status", "Updated", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {pages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#6e6e73]">
                  No website pages yet. Click &ldquo;New Page&rdquo; to create one.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1d1d1f]">{page.title}</p>
                    {page.description && (
                      <p className="text-xs text-[#6e6e73] max-w-xs truncate">{page.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6e6e73]">/{page.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[page.status] ?? "gray"}>
                      {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#6e6e73]">
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(page)}
                        aria-label="Edit page"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6e6e73] hover:text-[#1d1d1f]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(page)}
                        aria-label="Delete page"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#6e6e73] hover:text-[#dc2626]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Page" : "New Page"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Title"
              required
              value={form.title ?? ""}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="e.g. About Us"
              error={errors.title}
            />
            <Input
              label="Slug"
              required
              value={form.slug ?? ""}
              onChange={(e) => {
                setSlugManual(true);
                set("slug", e.target.value);
              }}
              placeholder="about"
              helperText="Public URL path, e.g. /about"
              error={errors.slug}
            />
          </div>

          <Textarea
            label="Description"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short summary of the page"
            rows={3}
          />

          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status ?? "draft"}
            onChange={(e) => set("status", e.target.value as ContentStatus)}
          />

          <div className="pt-2 border-t border-[#e8e8ed]">
            <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider mb-3">
              SEO
            </p>
            <div className="space-y-4">
              <Input
                label="SEO Title"
                value={form.seoTitle ?? ""}
                onChange={(e) => set("seoTitle", e.target.value)}
                placeholder="Overrides the page title in search results"
              />
              <Textarea
                label="SEO Description"
                value={form.seoDescription ?? ""}
                onChange={(e) => set("seoDescription", e.target.value)}
                placeholder="Meta description for search engines"
                rows={2}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Canonical URL"
                  value={form.canonicalUrl ?? ""}
                  onChange={(e) => set("canonicalUrl", e.target.value)}
                  placeholder="https://venueonmyplate.com/about"
                />
                <Input
                  label="Robots"
                  value={form.robots ?? ""}
                  onChange={(e) => set("robots", e.target.value)}
                  placeholder="index,follow"
                />
              </div>
              <Input
                label="OG Image URL"
                value={form.ogImage ?? ""}
                onChange={(e) => set("ogImage", e.target.value)}
                placeholder="Social share image URL"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-[#e8e8ed]">
          <Button variant="secondary" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            {editing ? "Save Changes" : "Create Page"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Page"
      >
        <p className="text-sm text-[#6e6e73] mb-6">
          Are you sure you want to delete{" "}
          <span className="font-medium text-[#1d1d1f]">{deleteTarget?.title}</span>? This archives
          the page and removes it from the public website.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() => deleteTarget && handleDelete(deleteTarget)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
