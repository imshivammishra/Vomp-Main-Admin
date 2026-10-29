"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Star, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/types";
import { formatDate, truncate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function ReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.list();
      setReviews(res.data ?? []);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await reviewsApi.approve(id);
      toast.show("Review approved", "success");
      load();
    } catch {
      toast.show("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await reviewsApi.reject(id);
      toast.show("Review rejected", "success");
      load();
    } catch {
      toast.show("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await reviewsApi.delete(id);
      toast.show("Review deleted", "success");
      setDeleteTarget(null);
      load();
    } catch {
      toast.show("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Name", "Context", "Quote", "Rating", "Venue", "Featured", "Status", "Date", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {reviews.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-[#6e6e73]">No reviews yet</td></tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1d1d1f]">{r.name}</td>
                  <td className="px-4 py-3 text-[#6e6e73]">{r.context}</td>
                  <td className="px-4 py-3 text-[#6e6e73] max-w-xs">
                    <p className="truncate">{truncate(r.quote, 60)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={13} className={i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6e6e73]">{r.venueSlug}</td>
                  <td className="px-4 py-3">
                    {r.featured && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "published" ? "green" : r.status === "draft" ? "yellow" : "red"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6e6e73]">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status !== "published" && (
                        <button
                          onClick={() => handleApprove(r.id)}
                          disabled={actionLoading === r.id}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-[#6e6e73] hover:text-[#16a34a] transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {r.status !== "draft" && (
                        <button
                          onClick={() => handleReject(r.id)}
                          disabled={actionLoading === r.id}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-[#6e6e73] hover:text-[#d97706] transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(r.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#6e6e73] hover:text-[#dc2626] transition-colors"
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

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Review">
        <p className="text-sm text-[#6e6e73] mb-6">Are you sure you want to delete this review?</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={() => deleteTarget && handleDelete(deleteTarget)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
