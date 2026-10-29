"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { blogsApi } from "@/lib/api";
import type { BlogPost } from "@/types";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function BlogsPage() {
  const toast = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await blogsApi.list();
      setPosts(res.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load posts", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await blogsApi.delete(id);
      toast.show("Post deleted", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/blogs/new">
          <Button icon={<Plus size={15} />}>New Post</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Title", "Category", "Author", "Published", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {posts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[#6e6e73]">No posts yet</td></tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1d1d1f] max-w-xs truncate">{post.title}</p>
                    <p className="text-xs text-[#6e6e73]">{post.slug}</p>
                  </td>
                  <td className="px-4 py-3"><Badge variant="blue">{post.category}</Badge></td>
                  <td className="px-4 py-3 text-[#6e6e73]">{post.author}</td>
                  <td className="px-4 py-3 text-[#6e6e73]">{formatDate(post.publishedOn)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={post.status === "published" ? "green" : "yellow"}>
                      {post.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/blogs/${post.id}`}>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6e6e73] hover:text-[#1d1d1f]"><Pencil size={15} /></button>
                      </Link>
                      <button onClick={() => setDeleteTarget(post.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#6e6e73] hover:text-[#dc2626]">
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Post">
        <p className="text-sm text-[#6e6e73] mb-6">Are you sure you want to delete this blog post?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
