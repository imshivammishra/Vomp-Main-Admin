"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2, CheckCircle, MapPin, Globe,
  Plus, FileText, ArrowRight, Star, TrendingUp, Inbox, Bell, Mail,
  CalendarCheck, RefreshCw, Activity, Database,
} from "lucide-react";
import {
  dashboardApi, enquiriesApi, healthApi, syncApi,
  type DashboardStats, type HealthStatus,
} from "@/lib/api";
import type { Venue, Enquiry } from "@/types";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const STAT_CONFIG = [
  {
    key: "totalVenues" as const,
    label: "Total Venues",
    icon: Building2,
    accent: "stat-accent-brand",
    change: "All listed venues",
  },
  {
    key: "publishedVenues" as const,
    label: "Published",
    icon: CheckCircle,
    accent: "stat-accent-green",
    change: "Live on website",
  },
  {
    key: "totalBookings" as const,
    label: "Bookings",
    icon: CalendarCheck,
    accent: "stat-accent-purple",
    change: "All time",
  },
  {
    key: "totalCities" as const,
    label: "Cities",
    icon: MapPin,
    accent: "stat-accent-blue",
    change: "Curated destinations",
  },
  {
    key: "totalEnquiries" as const,
    label: "Total Enquiries",
    icon: Inbox,
    accent: "stat-accent-amber",
    change: "All time",
  },
  {
    key: "newEnquiries" as const,
    label: "New Enquiries",
    icon: Bell,
    accent: "stat-accent-brand",
    change: "Awaiting response",
  },
] as const;

const QUICK_LINKS = [
  { href: "/venues/new", label: "Add Venue", icon: Building2, primary: true },
  { href: "/cities/new", label: "Add City", icon: MapPin, primary: false },
  { href: "/blogs/new", label: "Write Post", icon: FileText, primary: false },
  { href: "/reviews",   label: "Reviews",   icon: Star,     primary: false },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const ENQUIRY_STATUS: Record<string, { variant: "blue" | "gray" | "green" | "yellow"; label: string }> = {
  new:      { variant: "blue",   label: "New" },
  read:     { variant: "gray",   label: "Read" },
  replied:  { variant: "green",  label: "Replied" },
  archived: { variant: "yellow", label: "Archived" },
};

function StatCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 w-16 bg-[#e4e4e7] rounded mb-4" />
      <div className="h-8 w-12 bg-[#e4e4e7] rounded mb-1" />
      <div className="h-3 w-24 bg-[#f4f4f5] rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVenues, setRecentVenues] = useState<Venue[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<Enquiry[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, v, eq] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.recentVenues(),
          enquiriesApi.list({ limit: "3", sort: "createdAt", order: "desc" }),
        ]);
        setStats(s);
        setRecentVenues(v.data ?? []);
        setRecentEnquiries(eq.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
    healthApi
      .check()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.run();
      toast.show("Public website cache purged — content will refresh", "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const platformRows = [
    {
      label: "Main website",
      status: process.env.NEXT_PUBLIC_MAIN_SITE_URL ? "Configured" : "Configured on server",
      ok: Boolean(process.env.NEXT_PUBLIC_MAIN_SITE_URL),
    },
    { label: "Admin panel", status: "Active", ok: true },
    {
      label: "API backend",
      status: health ? (health.database.ok ? "Connected" : "Degraded") : "Checking…",
      ok: health?.database.ok ?? false,
    },
    {
      label: `Database (${health?.database.driver ?? "—"})`,
      status: health ? (health.database.ok ? `${health.database.latencyMs} ms` : "Unavailable") : "Checking…",
      ok: health?.database.ok ?? false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#09090b] tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-[#71717a] mt-0.5">
            Overview of your platform&apos;s content and performance.
          </p>
        </div>
        <Link
          href="/venues/new"
          className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#9b1239] text-white text-[13px] font-semibold hover:bg-[#7f0f2e] transition-colors shadow-sm"
        >
          <Plus size={15} /> Add Venue
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_CONFIG.map((cfg) => {
              const Icon = cfg.icon;
              const value = stats?.[cfg.key] ?? 0;
              return (
                <div key={cfg.key} className="card overflow-hidden">
                  <div className={["h-1 w-full", cfg.accent].join(" ")} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">
                        {cfg.label}
                      </p>
                      <div className="w-8 h-8 rounded-lg bg-[#f4f4f5] flex items-center justify-center text-[#71717a]">
                        <Icon size={15} />
                      </div>
                    </div>
                    <p className="text-[32px] font-bold text-[#09090b] leading-none">
                      {value.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#a1a1aa] mt-1.5 flex items-center gap-1">
                      <TrendingUp size={11} className="text-[#16a34a]" />
                      {cfg.change}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>

      {error && (
        <div className="card p-4 bg-[#fef2f2] border-[#fecaca] text-[13px] text-[#b91c1c]">
          {error} &mdash;{" "}
          <button onClick={() => window.location.reload()} className="underline font-medium">
            Retry
          </button>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid xl:grid-cols-[1fr_300px] gap-6">

        {/* Recent venues table */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e4e7]">
            <div>
              <h2 className="text-[14px] font-semibold text-[#09090b]">Recent Venues</h2>
              <p className="text-[12px] text-[#a1a1aa] mt-0.5">Latest additions to the platform</p>
            </div>
            <Link
              href="/venues"
              className="flex items-center gap-1 text-[12px] font-medium text-[#9b1239] hover:text-[#7f0f2e] transition-colors"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-[#f4f4f5]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-[#f4f4f5] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-[#e4e4e7] rounded" />
                    <div className="h-3 w-24 bg-[#f4f4f5] rounded" />
                  </div>
                  <div className="h-5 w-16 bg-[#f4f4f5] rounded-full" />
                </div>
              ))}
            </div>
          ) : recentVenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#a1a1aa]">
              <Building2 size={36} className="mb-3 opacity-30" />
              <p className="text-[13px]">No venues yet</p>
              <Link href="/venues/new" className="mt-3 text-[12px] text-[#9b1239] font-medium hover:underline">
                Add your first venue →
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recentVenues.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/venues/${v.id}`} className="font-semibold text-[#09090b] hover:text-[#9b1239] transition-colors">
                        {v.name}
                      </Link>
                    </td>
                    <td className="text-[#71717a]">
                      {v.city}{v.country && v.country !== "India" ? `, ${v.country}` : ""}
                    </td>
                    <td className="text-[#71717a]">{v.type}</td>
                    <td>
                      <Badge variant={v.status === "published" ? "green" : "yellow"} dot>
                        {v.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="text-[#a1a1aa]">{formatDate(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick actions sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-[13px] font-semibold text-[#09090b] mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all",
                      item.primary
                        ? "bg-[#9b1239] text-white hover:bg-[#7f0f2e]"
                        : "bg-[#f4f4f5] text-[#3f3f46] hover:bg-[#e4e4e7]",
                    ].join(" ")}
                  >
                    <Icon size={15} />
                    {item.label}
                    <ArrowRight size={13} className="ml-auto opacity-50" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Enquiries */}
          {recentEnquiries.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold text-[#09090b]">Recent Enquiries</h2>
                <Link href="/enquiries" className="flex items-center gap-0.5 text-[11px] text-[#9b1239] font-medium hover:text-[#7f0f2e]">
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-3">
                {recentEnquiries.map((eq) => {
                  const cfg = ENQUIRY_STATUS[eq.status] ?? ENQUIRY_STATUS.read;
                  return (
                    <div key={eq.id} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#9b1239]/10 flex items-center justify-center text-[#9b1239] font-bold text-[11px] shrink-0 mt-0.5">
                        {eq.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#09090b] truncate">{eq.name}</p>
                        <p className="text-[11px] text-[#71717a] truncate">{eq.eventType || "Enquiry"}{eq.city ? ` · ${eq.city}` : ""}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        <span className="text-[10px] text-[#a1a1aa]">{timeAgo(eq.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/enquiries"
                className="mt-3 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border border-[#e4e4e7] text-[11px] text-[#71717a] font-medium hover:bg-[#f4f4f5] transition-colors"
              >
                <Mail size={12} />
                Open inbox
              </Link>
            </div>
          )}

          {/* Platform status */}
          <div className="card p-5">
            <h2 className="text-[13px] font-semibold text-[#09090b] mb-4">Platform</h2>
            <div className="space-y-3">
              {platformRows.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#3f3f46]">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={["w-1.5 h-1.5 rounded-full", s.ok ? "bg-[#16a34a]" : "bg-[#d97706]"].join(" ")} />
                    <span className="text-[11px] text-[#71717a]">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e4e4e7] bg-white py-2 text-[12px] font-medium text-[#71717a] hover:text-[#09090b] hover:border-[#d4d4d8] transition-colors mt-3 disabled:opacity-60"
            >
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync main site"}
            </button>
          </div>

          {/* Recent activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-semibold text-[#09090b]">Recent Activity</h2>
                <Link href="/audit" className="flex items-center gap-0.5 text-[11px] text-[#9b1239] font-medium hover:text-[#7f0f2e]">
                  Audit <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-[#a1a1aa]">
                      {entry.outcome === "failed" ? <Database size={13} /> : <Activity size={13} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[#3f3f46] truncate">{entry.action}</p>
                      <p className="text-[10px] text-[#a1a1aa] truncate">{entry.actorEmail || "system"}</p>
                    </div>
                    <span className="text-[10px] text-[#a1a1aa] shrink-0">{timeAgo(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && stats.activeCountries > 0 && !stats.recentActivity?.length && (
            <div className="card p-5">
              <div className="flex items-center gap-2 text-[12px] text-[#71717a]">
                <Globe size={14} />
                {stats.activeCountries} active market{stats.activeCountries === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
