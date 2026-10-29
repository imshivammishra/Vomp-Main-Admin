"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { venuesApi, geoApi } from "@/lib/api";
import type { Venue, Country } from "@/types";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<string, { label: string; variant: "green" | "yellow" | "red" | "blue" | "gray" | "purple" }> = {
  published: { label: "Published", variant: "green" },
  pending: { label: "Pending", variant: "yellow" },
  draft: { label: "Draft", variant: "gray" },
  unpublished: { label: "Unpublished", variant: "yellow" },
  rejected: { label: "Rejected", variant: "red" },
  archived: { label: "Archived", variant: "purple" },
};

export default function VenuesPage() {
  const toast = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: sortKey,
        order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCountry) params.country = filterCountry;
      if (filterStatus) params.status = filterStatus;

      const res = await venuesApi.list(params);
      setVenues(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load venues", "error");
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortOrder, debouncedSearch, filterCountry, filterStatus, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    geoApi
      .countries()
      .then((res) => setCountries(res.data ?? []))
      .catch(() => { /* filter falls back to text only */ });
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("asc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === venues.length) setSelected(new Set());
    else setSelected(new Set(venues.map((v) => v.id)));
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await venuesApi.delete(id);
      toast.show("Venue deleted", "success");
      setDeleteTarget(null);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => venuesApi.delete(id)));
      toast.show(`Deleted ${selected.size} venues`, "success");
      setSelected(new Set());
      load();
    } catch {
      toast.show("Some deletes failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusToggle = async (id: string, current: string | undefined) => {
    const newStatus = current === "published" ? "draft" : "published";
    try {
      await venuesApi.update(id, { status: newStatus as "published" | "draft" });
      toast.show(`Venue ${newStatus}`, "success");
      load();
    } catch {
      toast.show("Status update failed", "error");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e73]" />
          <input
            value={search}
            onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setPage(1);
            clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
          }}
            placeholder="Search venues…"
            className="h-9 w-full pl-9 pr-4 rounded-lg border border-[#e8e8ed] text-sm focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent bg-white"
          />
        </div>

        <select
          value={filterCountry}
          onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg border border-[#e8e8ed] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7f0f2e]"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
          ))}
        </select>

        {/* Status pill tabs */}
        <div className="flex gap-1">
          {[{ id: "", label: "All" }, { id: "published", label: "Published" }, { id: "draft", label: "Draft" }].map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setFilterStatus(opt.id); setPage(1); }}
              className={[
                "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all",
                filterStatus === opt.id
                  ? "bg-[#09090b] text-white"
                  : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <Button variant="danger" size="sm" onClick={handleBulkDelete} loading={deleting}>
            Delete {selected.size} selected
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {total > 0 && (
            <span className="text-[12px] text-[#a1a1aa] hidden sm:block">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
          )}
          <Link href="/venues/new">
            <Button icon={<Plus size={15} />}>New Venue</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={venues.length > 0 && selected.size === venues.length}
                  onChange={toggleAll}
                  className="accent-[#7f0f2e]"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider w-10">
                Image
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                Name {sortKey === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Featured
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : venues.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[#6e6e73]">
                  No venues found
                </td>
              </tr>
            ) : (
              venues.map((venue) => {
                const flag = countries.find((c) => c.code === venue.countryCode)?.flag ?? "";
                const status = STATUS_BADGE[venue.status] ?? STATUS_BADGE.draft;
                return (
                  <tr key={venue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(venue.id)}
                        onChange={() => toggleSelect(venue.id)}
                        className="accent-[#7f0f2e]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {venue.image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={venue.image}
                            alt={venue.imageAlt || venue.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[#6e6e73] text-xs">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d1d1f]">{venue.name}</p>
                      <p className="text-xs text-[#6e6e73]">{venue.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">
                      <span>{flag} {venue.city}</span>
                      {venue.country && (
                        <span className="block text-xs">{venue.country}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73]">{venue.type}</td>
                    <td className="px-4 py-3 text-[#6e6e73] text-xs">
                      {venue.capacityMin}–{venue.capacityMax}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant} dot>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {venue.featured && (
                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/venues/${venue.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">
                            <Pencil size={15} />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleStatusToggle(venue.id, venue.status)}
                          title={venue.status === "published" ? "Unpublish" : "Publish"}
                          className={`p-1.5 rounded-lg text-[11px] font-medium transition ${
                            venue.status === "published"
                              ? "hover:bg-yellow-50 text-yellow-700"
                              : "hover:bg-green-50 text-green-700"
                          }`}
                        >
                          {venue.status === "published" ? "⊘" : "✓"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(venue.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#6e6e73] hover:text-[#dc2626] transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#6e6e73]">
            {total} venues · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={14} />}
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronRight size={14} />}
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
            />
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Venue"
      >
        <p className="text-sm text-[#6e6e73] mb-6">
          Are you sure you want to delete this venue? This action cannot be undone.
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
