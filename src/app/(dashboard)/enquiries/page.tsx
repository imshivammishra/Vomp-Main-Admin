"use client";

import React, { useCallback, useEffect, useState } from "react";
import { 
  Inbox, Search, Trash2, CheckCheck, Archive, Mail, 
  Calendar, Users, MapPin, MessageSquare, Building2, 
  Phone, Clock, MailOpen, X
} from "lucide-react";
import { enquiriesApi } from "@/lib/api";
import type { Enquiry } from "@/types";
import { formatDate } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type StatusFilter = "" | "new" | "read" | "replied" | "archived";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

const STATUS_CONFIG: Record<Enquiry["status"], { label: string; color: string; bg: string }> = {
  new:      { label: "New",      color: "#1d4ed8", bg: "#eff6ff" },
  read:     { label: "Read",     color: "#71717a", bg: "#f4f4f5" },
  replied:  { label: "Replied",  color: "#15803d", bg: "#f0fdf4" },
  archived: { label: "Archived", color: "#b45309", bg: "#fffbeb" },
};

function StatTile({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[24px] font-bold text-[#09090b] leading-none">{value}</p>
        <p className="text-[11px] text-[#71717a] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function EnquiryRow({ enquiry, isSelected, onClick }: { enquiry: Enquiry; isSelected: boolean; onClick: () => void }) {
  const s = STATUS_CONFIG[enquiry.status];
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3.5 cursor-pointer border-b border-[#f4f4f5] last:border-0 transition-colors ${
        isSelected ? "bg-[#fef2f2]" : enquiry.status === "new" ? "bg-[#fafbff]" : "hover:bg-[#fafafa]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-[13px] truncate ${enquiry.status === "new" ? "font-semibold text-[#09090b]" : "font-medium text-[#3f3f46]"}`}>
              {enquiry.name}
            </p>
            {enquiry.status === "new" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-[#a1a1aa]">{enquiry.eventType || "Enquiry"}</span>
            {enquiry.city && (
              <>
                <span className="text-[#e4e4e7]">·</span>
                <span className="text-[11px] text-[#a1a1aa]">{enquiry.city}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[#a1a1aa]">{timeAgo(enquiry.createdAt)}</span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ color: s.color, background: s.bg }}
          >
            {s.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function EnquiryDetail({
  enquiry,
  onClose,
  onStatusChange,
  onDelete,
  actionLoading,
}: {
  enquiry: Enquiry;
  onClose: () => void;
  onStatusChange: (id: string, status: Enquiry["status"]) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}) {
  const s = STATUS_CONFIG[enquiry.status];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e4e7] bg-white">
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090b]">{enquiry.name}</h2>
          <p className="text-[12px] text-[#a1a1aa] mt-0.5">{timeAgo(enquiry.createdAt)}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f4f4f5] text-[#71717a] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>
            {s.label}
          </span>
          <span className="text-[11px] text-[#a1a1aa]">{formatDate(enquiry.createdAt)}</span>
        </div>

        <div className="card divide-y divide-[#f4f4f5]">
          {[
            { icon: <Phone size={13} />, label: "Phone", value: enquiry.phone },
            { icon: <Mail size={13} />, label: "Email", value: enquiry.email },
            { icon: <MapPin size={13} />, label: "City", value: enquiry.city },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[#a1a1aa]">{row.icon}</span>
              <span className="text-[11px] text-[#71717a] w-12 shrink-0">{row.label}</span>
              <span className="text-[13px] text-[#09090b] truncate">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="card divide-y divide-[#f4f4f5]">
          {[
            { icon: <Calendar size={13} />, label: "Event", value: enquiry.eventType },
            { icon: <Clock size={13} />, label: "Date", value: enquiry.eventDate },
            { icon: <Users size={13} />, label: "Guests", value: enquiry.guestCount },
            { icon: <Building2 size={13} />, label: "Venue", value: enquiry.venueName },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[#a1a1aa]">{row.icon}</span>
              <span className="text-[11px] text-[#71717a] w-12 shrink-0">{row.label}</span>
              <span className="text-[13px] text-[#09090b]">{row.value}</span>
            </div>
          ))}
        </div>

        {enquiry.message && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={13} className="text-[#a1a1aa]" />
              <span className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wide">Message</span>
            </div>
            <p className="text-[13px] text-[#3f3f46] leading-relaxed">{enquiry.message}</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-[#e4e4e7] bg-[#fafafa] space-y-2">
        {enquiry.status !== "replied" && (
          <button
            onClick={() => onStatusChange(enquiry.id, "replied")}
            disabled={actionLoading === enquiry.id}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#15803d] text-white text-[13px] font-semibold hover:bg-[#166534] transition-colors disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Mark as replied
          </button>
        )}
        {enquiry.status !== "archived" && (
          <button
            onClick={() => onStatusChange(enquiry.id, "archived")}
            disabled={actionLoading === enquiry.id}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#f4f4f5] text-[#71717a] text-[13px] font-medium hover:bg-[#e4e4e7] transition-colors disabled:opacity-50"
          >
            <Archive size={15} />
            Archive
          </button>
        )}
        <button
          onClick={() => onDelete(enquiry.id)}
          disabled={actionLoading === enquiry.id}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#fef2f2] text-[#b91c1c] text-[13px] font-medium hover:bg-[#fee2e2] transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} />
          Delete
        </button>
        {enquiry.email && (
          <a
            href={`mailto:${enquiry.email}?subject=Re: Your venue enquiry&body=Dear ${enquiry.name},%0D%0A%0D%0AThank you for your enquiry.`}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-[#e4e4e7] bg-white text-[#3f3f46] text-[13px] font-medium hover:bg-[#f4f4f5] transition-colors"
          >
            <Mail size={15} />
            Reply via email
          </a>
        )}
      </div>
    </div>
  );
}

export default function EnquiriesPage() {
  const toast = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, new: 0, replied: 0, archived: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await enquiriesApi.list(params);
      setEnquiries(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, toast]);

  const loadStats = useCallback(async () => {
    try {
      const [all, newE, repliedE, archivedE] = await Promise.all([
        enquiriesApi.list({ limit: "1" }),
        enquiriesApi.list({ status: "new", limit: "1" }),
        enquiriesApi.list({ status: "replied", limit: "1" }),
        enquiriesApi.list({ status: "archived", limit: "1" }),
      ]);
      setStats({ total: all.total ?? 0, new: newE.total ?? 0, replied: repliedE.total ?? 0, archived: archivedE.total ?? 0 });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleStatus = async (id: string, status: Enquiry["status"]) => {
    setActionLoading(id);
    try {
      await enquiriesApi.update(id, { status });
      toast.show(`Marked as ${status}`, "success");
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
      await Promise.all([load(), loadStats()]);
    } catch {
      toast.show("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await enquiriesApi.delete(id);
      toast.show("Deleted", "success");
      setDeleteTarget(null);
      if (selected?.id === id) setSelected(null);
      await Promise.all([load(), loadStats()]);
    } catch {
      toast.show("Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = async (enquiry: Enquiry) => {
    setSelected(enquiry);
    if (enquiry.status === "new") {
      await handleStatus(enquiry.id, "read");
    }
  };

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "", label: `All (${stats.total})` },
    { id: "new", label: `New${stats.new > 0 ? ` (${stats.new})` : ""}` },
    { id: "read", label: "Read" },
    { id: "replied", label: "Replied" },
    { id: "archived", label: "Archived" },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total" value={stats.total} color="#9b1239" icon={<Inbox size={16} />} />
        <StatTile label="New" value={stats.new} color="#1d4ed8" icon={<MailOpen size={16} />} />
        <StatTile label="Replied" value={stats.replied} color="#15803d" icon={<CheckCheck size={16} />} />
        <StatTile label="Archived" value={stats.archived} color="#b45309" icon={<Archive size={16} />} />
      </div>

      <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 240px)" }}>
        <div className={`flex flex-col bg-white rounded-xl border border-[#e4e4e7] overflow-hidden transition-all ${selected ? "hidden lg:flex lg:w-[380px] shrink-0" : "flex-1"}`}>
          <div className="px-4 py-3 border-b border-[#f4f4f5] space-y-2.5">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
              <input
                type="text"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-[#e4e4e7] bg-[#f9f9f9] pl-8 pr-3 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#9b1239] focus:bg-white transition-colors"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${statusFilter === f.id ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40"><Spinner size={24} /></div>
            ) : enquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#a1a1aa]">
                <Inbox size={36} className="mb-3 opacity-25" />
                <p className="text-[13px] font-medium">No enquiries</p>
                <p className="text-[11px] mt-1 text-center px-4">Submissions from the website will appear here</p>
              </div>
            ) : (
              enquiries.map(e => (
                <EnquiryRow key={e.id} enquiry={e} isSelected={selected?.id === e.id} onClick={() => openDetail(e)} />
              ))
            )}
          </div>

          {!loading && enquiries.length > 0 && (
            <div className="px-4 py-2 border-t border-[#f4f4f5] bg-[#fafafa]">
              <p className="text-[11px] text-[#a1a1aa]">{total} enquir{total === 1 ? "y" : "ies"}</p>
            </div>
          )}
        </div>

        {selected && (
          <div className="flex-1 bg-white rounded-xl border border-[#e4e4e7] overflow-hidden flex flex-col">
            <EnquiryDetail
              enquiry={selected}
              onClose={() => setSelected(null)}
              onStatusChange={handleStatus}
              onDelete={(id) => setDeleteTarget(id)}
              actionLoading={actionLoading}
            />
          </div>
        )}

        {!selected && (
          <div className="hidden lg:flex flex-1 items-center justify-center bg-white rounded-xl border border-[#e4e4e7] border-dashed text-[#a1a1aa]">
            <div className="text-center">
              <Inbox size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-[13px]">Select an enquiry to view details</p>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete enquiry?"
      >
        <p className="text-[13px] text-[#71717a]">This action cannot be undone.</p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => deleteTarget && handleDelete(deleteTarget)}
            disabled={deleting}
            className="flex-1 h-9 rounded-lg bg-[#b91c1c] text-white text-[13px] font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button onClick={() => setDeleteTarget(null)} className="flex-1 h-9 rounded-lg border border-[#e4e4e7] text-[13px] font-medium hover:bg-[#f4f4f5] transition-colors">
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
