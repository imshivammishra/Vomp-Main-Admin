"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck, Plus, Search, Users, MapPin, Phone, Mail, Clock,
  IndianRupee, X, AlertTriangle,
} from "lucide-react";
import { bookingsApi, venuesApi } from "@/lib/api";
import type { Booking, Venue, AdminUser } from "@/types";
import { fetchCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const STATUSES = ["enquiry", "pending", "confirmed", "completed", "cancelled", "no_show"] as const;

const STATUS_BADGE: Record<string, { label: string; variant: "green" | "yellow" | "red" | "blue" | "gray" | "purple" }> = {
  enquiry: { label: "Enquiry", variant: "gray" },
  pending: { label: "Pending", variant: "yellow" },
  confirmed: { label: "Confirmed", variant: "green" },
  completed: { label: "Completed", variant: "blue" },
  cancelled: { label: "Cancelled", variant: "red" },
  no_show: { label: "No show", variant: "purple" },
};

const PAGE_SIZE = 20;

interface NewBooking {
  venueId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: string;
  currency: string;
  subtotal: string;
  taxes: string;
  total: string;
  internalNotes: string;
}

const EMPTY_BOOKING: NewBooking = {
  venueId: "", customerName: "", customerEmail: "", customerPhone: "",
  eventType: "", eventDate: "", startTime: "", endTime: "", guestCount: "0",
  currency: "INR", subtotal: "0", taxes: "0", total: "0", internalNotes: "",
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

export default function BookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [detail, setDetail] = useState<Booking | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState<NewBooking>(EMPTY_BOOKING);
  const [venues, setVenues] = useState<Venue[]>([]);

  const canCreate = user?.permissions?.includes("bookings.create") ?? false;
  const canEdit = user?.permissions?.includes("bookings.edit") ?? false;
  const canCancel = user?.permissions?.includes("bookings.cancel") ?? false;
  const canViewFinance = user?.permissions?.includes("finance.view") ?? false;

  useEffect(() => { void fetchCurrentUser().then(setUser); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setBookings(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to load bookings", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, fromDate, toDate, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!canCreate) return;
    venuesApi
      .list({ limit: 200, sort: "name", order: "asc" })
      .then((res) => setVenues(res.data ?? []))
      .catch(() => { /* surfaced when the modal is opened */ });
  }, [canCreate]);

  const openDetail = (booking: Booking) => {
    setDetail(booking);
    setNextStatus(booking.status);
    setStatusNote("");
  };

  const handleStatusUpdate = async () => {
    if (!detail) return;
    if (nextStatus === detail.status && !statusNote.trim()) {
      toast.show("Choose a new status or add a note", "info");
      return;
    }
    if (nextStatus === "cancelled" && !canCancel) {
      toast.show("You do not have permission to cancel bookings", "error");
      return;
    }
    setUpdating(true);
    try {
      const updated = await bookingsApi.setStatus(detail.id, nextStatus, statusNote.trim());
      setDetail(updated);
      setStatusNote("");
      toast.show("Booking updated", "success");
      void load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!form.venueId) return setCreateError("Choose a venue");
    if (!form.customerName.trim()) return setCreateError("Customer name is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate)) return setCreateError("Choose a valid event date");
    setSaving(true);
    try {
      await bookingsApi.create({
        venueId: form.venueId,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        eventType: form.eventType.trim(),
        eventDate: form.eventDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        guestCount: Number(form.guestCount) || 0,
        currency: form.currency.toUpperCase().slice(0, 3) || "INR",
        subtotal: Number(form.subtotal) || 0,
        taxes: Number(form.taxes) || 0,
        total: Number(form.total) || 0,
        internalNotes: form.internalNotes.trim(),
      });
      toast.show("Booking created", "success");
      setCreating(false);
      setForm(EMPTY_BOOKING);
      setPage(1);
      void load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create the booking");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof NewBooking, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const summary = useMemo(() => {
    const revenue = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + b.total, 0);
    return { revenue };
  }, [bookings]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#09090b] tracking-tight">Bookings</h1>
          <p className="text-[12px] text-[#71717a] mt-0.5">
            {total} booking{total === 1 ? "" : "s"} · {money(summary.revenue, "INR")} on this page
          </p>
        </div>
        {canCreate && (
          <Button icon={<Plus size={15} />} onClick={() => { setCreateError(""); setCreating(true); }}>
            New Booking
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[190px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, name or email…"
            className="h-9 w-full pl-9 pr-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_BADGE[s].label}</option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          aria-label="From date"
          className="h-9 px-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239]"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          aria-label="To date"
          className="h-9 px-3 rounded-lg border border-[#e4e4e7] text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#9b1239]"
        />
        {(statusFilter || fromDate || toDate || search) && (
          <button
            onClick={() => { setStatusFilter(""); setFromDate(""); setToDate(""); setSearch(""); }}
            className="flex items-center gap-1 text-[12px] text-[#71717a] hover:text-[#9b1239]"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e8e8ed] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e8e8ed] bg-gray-50">
              {["Reference", "Customer", "Venue", "Event date", "Guests", "Status", "Total"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6e6e73] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e8ed]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-[#6e6e73]">
                  <CalendarCheck size={34} className="mx-auto mb-2 opacity-30" />
                  No bookings match these filters
                </td>
              </tr>
            ) : (
              bookings.map((booking) => {
                const badge = STATUS_BADGE[booking.status] ?? STATUS_BADGE.enquiry;
                return (
                  <tr
                    key={booking.id}
                    onClick={() => openDetail(booking)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-[#9b1239] whitespace-nowrap">
                      {booking.reference}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1d1d1f]">{booking.customerName}</p>
                      <p className="text-[11px] text-[#6e6e73]">{booking.customerEmail || booking.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-[#3f3f46]">{booking.venueName ?? `#${booking.venueId}`}</td>
                    <td className="px-4 py-3 text-[#3f3f46] whitespace-nowrap">
                      {formatDate(booking.eventDate)}
                      {booking.startTime ? (
                        <span className="block text-[11px] text-[#a1a1aa]">{booking.startTime.slice(0, 5)}{booking.endTime ? `–${booking.endTime.slice(0, 5)}` : ""}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[#3f3f46]">{booking.guestCount}</td>
                    <td className="px-4 py-3"><Badge variant={badge.variant} dot>{badge.label}</Badge></td>
                    <td className="px-4 py-3 text-[#3f3f46] whitespace-nowrap">
                      {canViewFinance ? money(booking.total, booking.currency) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#71717a]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Booking details" maxWidth="max-w-xl">
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-[#9b1239]">{detail.reference}</span>
              <Badge variant={(STATUS_BADGE[detail.status] ?? STATUS_BADGE.enquiry).variant} dot>
                {(STATUS_BADGE[detail.status] ?? STATUS_BADGE.enquiry).label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div className="flex items-start gap-2"><Users size={14} className="mt-0.5 text-[#a1a1aa]" /><div><p className="font-medium text-[#1d1d1f]">{detail.customerName}</p><p className="text-[12px] text-[#71717a]">{detail.guestCount} guests</p></div></div>
              <div className="flex items-start gap-2"><CalendarCheck size={14} className="mt-0.5 text-[#a1a1aa]" /><div><p className="text-[#1d1d1f]">{formatDate(detail.eventDate)}</p><p className="text-[12px] text-[#71717a]">{detail.eventType || "Event"}</p></div></div>
              <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 text-[#a1a1aa]" /><p className="text-[#1d1d1f]">{detail.venueName ?? `Venue #${detail.venueId}`}</p></div>
              <div className="flex items-start gap-2"><Clock size={14} className="mt-0.5 text-[#a1a1aa]" /><p className="text-[#1d1d1f]">{detail.startTime ? `${detail.startTime.slice(0, 5)}${detail.endTime ? ` – ${detail.endTime.slice(0, 5)}` : ""}` : "Time not set"} <span className="text-[#a1a1aa]">({detail.timezone})</span></p></div>
              {detail.customerEmail && <div className="flex items-start gap-2"><Mail size={14} className="mt-0.5 text-[#a1a1aa]" /><a href={`mailto:${detail.customerEmail}`} className="text-[#9b1239] hover:underline break-all">{detail.customerEmail}</a></div>}
              {detail.customerPhone && <div className="flex items-start gap-2"><Phone size={14} className="mt-0.5 text-[#a1a1aa]" /><a href={`tel:${detail.customerPhone}`} className="text-[#1d1d1f]">{detail.customerPhone}</a></div>}
            </div>

            {canViewFinance && (
              <div className="rounded-lg border border-[#e8e8ed] p-3 space-y-1.5 text-[13px]">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]"><IndianRupee size={12} /> Financials</div>
                <div className="flex justify-between"><span className="text-[#71717a]">Subtotal</span><span>{money(detail.subtotal, detail.currency)}</span></div>
                <div className="flex justify-between"><span className="text-[#71717a]">Taxes</span><span>{money(detail.taxes, detail.currency)}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{money(detail.total, detail.currency)}</span></div>
                <div className="flex justify-between"><span className="text-[#71717a]">Deposit paid</span><span>{money(detail.depositPaid, detail.currency)}</span></div>
                <div className="flex justify-between"><span className="text-[#71717a]">Payment status</span><span className="capitalize">{detail.paymentStatus}</span></div>
              </div>
            )}

            {detail.internalNotes && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa] mb-1">Internal notes</p>
                <p className="text-[13px] text-[#3f3f46] whitespace-pre-wrap">{detail.internalNotes}</p>
              </div>
            )}

            {(canEdit || canCancel) && (
              <div className="border-t border-[#e8e8ed] pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Change status"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    options={STATUSES.filter((s) => s !== "cancelled" || canCancel).map((s) => ({
                      value: s, label: STATUS_BADGE[s].label,
                    }))}
                  />
                  <Input
                    label="Note (optional)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Reason or internal comment"
                  />
                </div>
                {nextStatus === "cancelled" && (
                  <p className="flex items-center gap-1.5 text-[12px] text-[#b45309]">
                    <AlertTriangle size={13} /> Cancelling frees this date for other bookings.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
                  <Button onClick={handleStatusUpdate} loading={updating}>Save status</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New booking" maxWidth="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-3">
          <Select
            label="Venue *"
            value={form.venueId}
            onChange={(e) => set("venueId", e.target.value)}
            placeholder="Select a venue"
            options={venues.map((v) => ({ value: v.id, label: `${v.name} — ${v.city}` }))}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Customer name *" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            <Input label="Customer email" type="email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Customer phone" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} />
            <Input label="Event type" value={form.eventType} onChange={(e) => set("eventType", e.target.value)} placeholder="Wedding, corporate…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Event date *" type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} required />
            <Input label="Start time" type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            <Input label="End time" type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input label="Guests" type="number" min={0} value={form.guestCount} onChange={(e) => set("guestCount", e.target.value)} />
            <Input label="Currency" value={form.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
            <Input label="Subtotal" type="number" min={0} value={form.subtotal} onChange={(e) => set("subtotal", e.target.value)} />
            <Input label="Taxes" type="number" min={0} value={form.taxes} onChange={(e) => set("taxes", e.target.value)} />
          </div>
          <Input label="Total" type="number" min={0} value={form.total} onChange={(e) => set("total", e.target.value)} />
          <Textarea label="Internal notes" value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} rows={2} />
          {createError && <p className="text-[12px] text-[#b91c1c]">{createError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create booking</Button>
          </div>
        </form>
      </Modal>

      {loading && (
        <div className="flex justify-center py-2"><Spinner size={20} /></div>
      )}
    </div>
  );
}
