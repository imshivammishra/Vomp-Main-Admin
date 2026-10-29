"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { BlogPost } from "@/types";
import { blogsApi } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";

interface Props {
  blog?: BlogPost;
}

const CATEGORIES = ["Wedding Tips", "Venue Guide", "Inspiration", "Travel", "Food & Cuisine", "Real Weddings", "Planning"];

const defaultBlog: Partial<BlogPost> = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  author: "",
  publishedOn: new Date().toISOString().split("T")[0],
  readingMinutes: 5,
  image: "",
  imageAlt: "",
  body: [""],
  status: "draft",
};

export default function BlogForm({ blog }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(blog?.id);

  const [form, setForm] = useState<Partial<BlogPost>>(blog ?? defaultBlog);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = (key: keyof BlogPost, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleTitleChange = (title: string) => {
    set("title", title);
    if (!isEdit) set("slug", slugify(title));
  };

  const updateParagraph = (index: number, value: string) => {
    const body = [...(form.body ?? [""])];
    body[index] = value;
    set("body", body);
  };

  const addParagraph = () => set("body", [...(form.body ?? [""]), ""]);

  const removeParagraph = (index: number) => {
    const body = (form.body ?? [""]).filter((_, i) => i !== index);
    set("body", body.length > 0 ? body : [""]);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = "Title is required";
    if (!form.slug?.trim()) e.slug = "Slug is required";
    if (!form.category) e.category = "Category is required";
    if (!form.author?.trim()) e.author = "Author is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit && blog?.id) {
        await blogsApi.update(blog.id, form);
        toast.show("Post updated", "success");
      } else {
        await blogsApi.create(form);
        toast.show("Post created", "success");
      }
      router.push("/blogs");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save post", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">Post Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Title" value={form.title ?? ""} onChange={(e) => handleTitleChange(e.target.value)} error={errors.title} required />
          <Input label="Slug" value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} error={errors.slug} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={form.category ?? ""}
            onChange={(e) => set("category", e.target.value)}
            error={errors.category}
            required
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder="Select category"
          />
          <Input label="Author" value={form.author ?? ""} onChange={(e) => set("author", e.target.value)} error={errors.author} required />
          <Input label="Published On" type="date" value={form.publishedOn ?? ""} onChange={(e) => set("publishedOn", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Reading Time (minutes)" type="number" value={form.readingMinutes ?? ""} onChange={(e) => set("readingMinutes", Number(e.target.value))} min={1} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">Cover Image</h2>
        <Input label="Image URL" value={form.image ?? ""} onChange={(e) => set("image", e.target.value)} placeholder="https://example.com/blog.jpg" />
        <Input label="Image Alt Text" value={form.imageAlt ?? ""} onChange={(e) => set("imageAlt", e.target.value)} />
      </section>

      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">Content</h2>
        <Textarea label="Excerpt" value={form.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} rows={3} placeholder="Brief summary of the post…" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#1d1d1f]">Body Paragraphs</label>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addParagraph}>
              Add Paragraph
            </Button>
          </div>
          {(form.body ?? [""]).map((para, i) => (
            <div key={i} className="flex gap-2">
              <Textarea
                value={para}
                onChange={(e) => updateParagraph(i, e.target.value)}
                rows={3}
                placeholder={`Paragraph ${i + 1}…`}
                className="flex-1"
              />
              {(form.body ?? []).length > 1 && (
                <button type="button" onClick={() => removeParagraph(i)} className="p-2 text-[#6e6e73] hover:text-[#dc2626] self-start mt-0.5">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#e8e8ed] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#6e6e73] uppercase tracking-wider">Status</h2>
        <div className="flex gap-2">
          {(["draft", "published"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.status === s
                  ? s === "published" ? "bg-green-50 border-green-300 text-green-700" : "bg-yellow-50 border-yellow-300 text-yellow-700"
                  : "bg-white border-[#e8e8ed] text-[#6e6e73]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-3 pb-6">
        <Button type="submit" loading={saving} size="lg">{isEdit ? "Update Post" : "Create Post"}</Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.push("/blogs")}>Cancel</Button>
      </div>
    </form>
  );
}
