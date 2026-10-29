"use client";

/*
 * This landing page intentionally links to raw API endpoints (which return
 * JSON), not Next.js page routes, so plain <a> full navigations are correct.
 */
/* eslint-disable @next/next/no-html-link-for-pages */

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  Server,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

type HealthState = "loading" | "operational" | "degraded" | "unreachable";

interface HealthResult {
  state: HealthState;
  latencyMs?: number;
  checkedAt?: string;
}

const STATUS_META: Record<
  HealthState,
  { label: string; dot: string; ring: string; text: string; bg: string }
> = {
  loading: {
    label: "Checking status…",
    dot: "bg-slate-300",
    ring: "ring-slate-200",
    text: "text-slate-500",
    bg: "bg-slate-50",
  },
  operational: {
    label: "All systems operational",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  degraded: {
    label: "Degraded performance",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  unreachable: {
    label: "API unreachable",
    dot: "bg-rose-500",
    ring: "ring-rose-200",
    text: "text-rose-700",
    bg: "bg-rose-50",
  },
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/health",
    description: "Service liveness and database readiness probe.",
    icon: Activity,
  },
  {
    method: "GET",
    path: "/api/v1/public/venues?limit=5",
    description: "Published venue data powering the public platform.",
    icon: Database,
  },
];

export default function ApiLanding() {
  const [health, setHealth] = useState<HealthResult>({ state: "loading" });

  const checkHealth = useCallback(async () => {
    setHealth((prev) => ({ ...prev, state: "loading" }));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let body: { status?: string; database?: { latencyMs?: number } } = {};
      try {
        body = await res.json();
      } catch {
        /* non-JSON body — fall back to HTTP status below */
      }

      const ok = res.ok && body.status === "ok";
      setHealth({
        state: ok ? "operational" : "degraded",
        latencyMs: body.database?.latencyMs,
        checkedAt: new Date().toLocaleTimeString(),
      });
    } catch {
      setHealth({
        state: "unreachable",
        checkedAt: new Date().toLocaleTimeString(),
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const meta = STATUS_META[health.state];

  return (
    <div className="relative min-h-screen bg-white text-slate-900 antialiased">
      {/* subtle top accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/70 to-transparent"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Server size={18} aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-slate-900">
                VenueOnMyPlate
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-blue-600">
                Developer API
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2">
              {health.state === "operational" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
            </span>
            {meta.label}
          </span>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col">
          <section
            className="flex flex-col items-start pt-10 sm:pt-16"
            aria-labelledby="hero-title"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-medium text-slate-600 shadow-sm">
              <ShieldCheck size={13} className="text-blue-600" aria-hidden="true" />
              Secure · Versioned · Production-ready
            </span>

            <h1
              id="hero-title"
              className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl"
            >
              Simple. Reliable.
              <br />
              <span className="text-blue-600">Connected.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              The VenueOnMyPlate API powers our venue discovery platform — serving
              curated venue, city, and content data to the website and partner
              integrations through a fast, consistent, and well-structured interface.
            </p>

            {/* Actions */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/api/health"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Activity size={16} aria-hidden="true" />
                Check API Health
              </a>
              <a
                href="/api/v1/public/venues?limit=5"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Database size={16} className="text-blue-600" aria-hidden="true" />
                Explore Venue Data
                <ArrowUpRight
                  size={15}
                  className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </section>

          {/* Live status card */}
          <section aria-labelledby="status-title" className="mt-14">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="status-title"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
              >
                Live status
              </h2>
              <button
                type="button"
                onClick={checkHealth}
                disabled={health.state === "loading"}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Re-check API health"
              >
                <RefreshCw
                  size={13}
                  className={health.state === "loading" ? "animate-spin" : ""}
                  aria-hidden="true"
                />
                Re-check
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.bg} ${meta.ring}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                      aria-hidden="true"
                    />
                  </span>
                  <div>
                    <p className={`text-[14px] font-semibold ${meta.text}`}>{meta.label}</p>
                    <p className="text-[12px] text-slate-500">
                      {health.state === "loading"
                        ? "Contacting the health endpoint…"
                        : health.checkedAt
                          ? `Last checked at ${health.checkedAt}`
                          : "Health endpoint · GET /api/health"}
                    </p>
                  </div>
                </div>

                <dl className="flex items-center gap-6 sm:gap-8">
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Database
                    </dt>
                    <dd className="mt-0.5 text-[13px] font-semibold text-slate-800">
                      {health.state === "unreachable"
                        ? "—"
                        : health.latencyMs != null
                          ? `${health.latencyMs} ms`
                          : health.state === "loading"
                            ? "…"
                            : "Connected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Endpoint
                    </dt>
                    <dd className="mt-0.5 font-mono text-[13px] font-semibold text-slate-800">
                      /api/health
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          {/* Endpoints */}
          <section aria-labelledby="endpoints-title" className="mt-12 pb-4">
            <h2
              id="endpoints-title"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
            >
              Available endpoints
            </h2>

            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {ENDPOINTS.map(({ method, path, description, icon: Icon }) => (
                <li key={path}>
                  <a
                    href={path}
                    className="group flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          {method}
                        </span>
                        <code className="truncate font-mono text-[13px] font-medium text-slate-800">
                          {path}
                        </code>
                        <ArrowUpRight
                          size={14}
                          className="ml-auto shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
                        {description}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-slate-100 py-6 text-[12px] text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} VenueOnMyPlate. All rights reserved.</p>
          <p className="font-medium text-slate-500">VenueOnMyPlate API · v1</p>
        </footer>
      </div>
    </div>
  );
}
