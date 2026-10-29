"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { auditApi } from "@/lib/api";
import type { AuditLogEntry } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 40;

const RESOURCE_TYPES = [
  "venue", "city", "country", "blog", "review", "enquiry", "media", "settings",
  "page", "homepage_section", "navigation_item", "faq", "announcement",
  "booking", "admin_user", "session", "public_site",
];

export default function AuditPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedAction(action.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [action]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({
        page,
        limit: PAGE_SIZE,
        action: debouncedAction || undefined,
        resourceType: resourceType || undefined,
      });
      setEntries(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load the audit log", "error");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedAction, resourceType, toast]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#09090b] tracking-tight">Audit Log</h1>
          <p className="text-[12px] text-[#71717a] mt-0.5">
            Immutable record of every administrative action ({total.toLocaleString()} entries).
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[190px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action (e.g. venue.update)…"
            className="h-9 w-full pl-9 pr-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent"
          />
        </div>
        <select
          value={resourceType}
          onChange={(e) => { setResourceType(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239]"
        >
          <option value="">All resources</option>
          {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["When", "Actor", "Action", "Resource", "Outcome", "IP", ""].map((h, i) => (
                <th key={`${h}-${i}`} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3.5 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-[#6e6e73]">
                  <ScrollText size={34} className="mx-auto mb-2 opacity-30" />
                  No audit entries match these filters
                </td>
              </tr>
            ) : entries.map((entry) => {
              const hasSummary = entry.summary && Object.keys(entry.summary).length > 0;
              const isOpen = expanded === entry.id;
              return (
                <React.Fragment key={entry.id}>
                  <tr className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-[12px] text-[#71717a] whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#3f3f46]">{entry.actorEmail || "system"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#1d1d1f]">{entry.action}</td>
                    <td className="px-4 py-3 text-[12px] text-[#71717a]">
                      {entry.resourceType}
                      {entry.resourceId ? <span className="text-[#a1a1aa]"> #{entry.resourceId}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={entry.outcome === "failure" || entry.outcome === "failed" ? "red" : "green"} dot>
                        {entry.outcome || "success"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#a1a1aa]">{entry.ip || "—"}</td>
                    <td className="px-2 py-3">
                      {hasSummary && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : entry.id)}
                          className="p-1 rounded text-[#a1a1aa] hover:bg-gray-100 hover:text-[#3f3f46]"
                          aria-label={isOpen ? "Hide details" : "Show details"}
                        >
                          <ChevronDown size={14} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && hasSummary && (
                    <tr className="bg-[#fafafa]">
                      <td colSpan={7} className="px-4 py-3">
                        <pre className="max-h-48 overflow-auto rounded-lg bg-[#09090b] p-3 text-[11px] leading-relaxed text-[#d4d4d8]">
                          {JSON.stringify(entry.summary, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#71717a]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft size={13} />} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
            <Button variant="secondary" size="sm" icon={<ChevronRight size={13} />} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
          </div>
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="flex justify-center py-2"><Spinner size={20} /></div>
      )}
    </div>
  );
}
