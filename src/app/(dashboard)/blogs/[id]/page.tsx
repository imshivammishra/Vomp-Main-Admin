"use client";

import React, { useEffect, useState } from "react";
import { use } from "react";
import { blogsApi } from "@/lib/api";
import type { BlogPost } from "@/types";
import BlogForm from "@/components/forms/BlogForm";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    blogsApi.get(id)
      .then(setPost)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load post"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-[#dc2626]">{error}</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
  if (!post) return null;
  return <BlogForm blog={post} />;
}
