"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, KeyRound,
  ScrollText, Loader2, Check,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { clearAuthCache, fetchCurrentUser } from "@/lib/auth";

const FEATURES = [
  "Full venue CRUD with image upload",
  "Live enquiry inbox with instant reply",
  "India, Italy & international markets",
  "Real-time cache sync to the website",
];

const TRUST = [
  { icon: Lock, label: "Encrypted", sub: "Session-based" },
  { icon: KeyRound, label: "Role-based", sub: "Scoped access" },
  { icon: ScrollText, label: "Audited", sub: "Every action" },
];

function BrandMark({ size = 40 }: { size?: number }) {
  const inner = Math.round(size * 0.5);
  return (
    <span
      className="flex items-center justify-center rounded-[10px] shrink-0"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #9b1239, #5c0a20)" }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    // Only allow same-site relative paths to prevent open redirects.
    const target =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    setNextPath(target);

    // If a VALID session already exists, go straight into the app. This replaces
    // the old middleware /login → /dashboard redirect, which bounced on a stale
    // cookie and caused an endless refresh loop. fetchCurrentUser never throws,
    // so a stale/expired cookie simply leaves the user on the login form (and the
    // 401 clears that cookie server-side).
    let cancelled = false;
    fetchCurrentUser().then((user) => {
      if (!cancelled && user) router.replace(target);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email address is required.");
    if (!password) return setError("Password is required.");
    setLoading(true);
    try {
      await authApi.login(email.trim(), password, remember);
      clearAuthCache();
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ── Left panel — brand showcase ── */}
      <div
        className="relative hidden lg:flex flex-col shrink-0 overflow-hidden"
        style={{
          width: "clamp(440px, 42vw, 560px)",
          background:
            "radial-gradient(1200px 600px at 15% -10%, #2a0d15 0%, transparent 60%), linear-gradient(160deg, #15070a 0%, #22090f 45%, #140608 100%)",
        }}
      >
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(155,18,57,0.28) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-[-80px] right-[-60px] h-[380px] w-[380px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,164,55,0.12) 0%, transparent 70%)" }} />
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }} />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <BrandMark size={44} />
            <div>
              <p className="text-[15px] font-bold leading-none tracking-tight text-white">VenueOnMyPlate</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#d4a437]/80">Admin Console</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="animate-fade-in">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-[#d4a437]/50" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.45em] text-[#d4a437]/80">
                Content Management
              </p>
            </div>

            <h1
              className="text-[42px] xl:text-[54px] font-semibold leading-[1.04] text-white"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.01em" }}
            >
              Manage every<br />
              venue, city &amp;<br />
              <span style={{ color: "#d4a437" }}>destination.</span>
            </h1>

            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-white/50">
              Publish venues, respond to enquiries, and control your entire
              platform — from one elegant, secure console.
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[13px] text-white/60">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "rgba(212,164,55,0.14)" }}>
                    <Check size={12} className="text-[#d4a437]" strokeWidth={2.5} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Trust strip */}
          <div className="flex items-center gap-6">
            {TRUST.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                  <Icon size={14} className="text-[#d4a437]/80" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-white/70">{label}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/30">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex flex-1 items-center justify-center bg-[#fafafa] px-6 py-12 lg:px-12">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <BrandMark size={38} />
            <span className="text-[15px] font-bold text-[#09090b]">VenueOnMyPlate</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#09090b]">
              Welcome back
            </h2>
            <p className="mt-2 text-[14px] text-[#71717a]">
              Sign in to your admin console to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[13px] text-[#b91c1c]">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-[#3f3f46]">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@venueonmyplate.in"
                  autoComplete="email"
                  autoFocus
                  className="h-12 w-full rounded-xl border border-[#e4e4e7] bg-white pl-10 pr-4 text-[14px] text-[#09090b] shadow-sm transition-all placeholder:text-[#a1a1aa] focus:border-[#9b1239] focus:outline-none focus:ring-4 focus:ring-[#9b1239]/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-[#3f3f46]">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-[#e4e4e7] bg-white pl-10 pr-11 text-[14px] text-[#09090b] shadow-sm transition-all placeholder:text-[#a1a1aa] focus:border-[#9b1239] focus:outline-none focus:ring-4 focus:ring-[#9b1239]/10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a1a1aa] transition-colors hover:text-[#71717a]"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-[#3f3f46]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-[#d4d4d8] accent-[#9b1239]"
              />
              Keep me signed in for 7 days
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #9b1239 0%, #7f0f2e 100%)",
                boxShadow: loading ? "none" : "0 8px 22px -8px rgba(155,18,57,0.6)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to dashboard
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#e4e4e7]" />
            <p className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
              <ShieldCheck size={12} className="text-[#16a34a]" />
              Secured connection
            </p>
            <span className="h-px flex-1 bg-[#e4e4e7]" />
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2.5">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-[#e4e4e7] bg-white px-2 py-3 text-center">
                <Icon size={15} className="text-[#9b1239]" />
                <span className="text-[11px] font-medium text-[#3f3f46]">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-7 text-center text-[11px] text-[#a1a1aa]">
            © {new Date().getFullYear()} VenueOnMyPlate. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
