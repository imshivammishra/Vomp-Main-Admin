"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { clearAuthCache } from "@/lib/auth";

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
    if (next && next.startsWith("/") && !next.startsWith("//")) setNextPath(next);
  }, []);

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
    <div className="min-h-screen flex overflow-hidden">

      {/* ── Left panel — rich gradient background ── */}
      <div
        className="hidden lg:flex flex-col relative shrink-0"
        style={{
          width: "480px",
          minHeight: "100vh",
          overflow: "hidden",
          background: "linear-gradient(160deg, #140608 0%, #1e0a10 25%, #2a0d15 50%, #1a0a10 75%, #0e0507 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-120px", left: "-80px", width: "500px", height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(127,15,46,0.22) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-80px", right: "-60px", width: "400px", height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,164,55,0.10) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "40%", right: "10%", width: "280px", height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(92,10,32,0.18) 0%, transparent 65%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col justify-between h-full p-12 xl:p-16">

          {/* Logo mark */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #7f0f2e, #5c0a20)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold text-white tracking-tight leading-none">VenueOnMyPlate</p>
              <p className="text-[10px] text-white/40 mt-0.5 tracking-widest uppercase">Admin Console</p>
            </div>
          </div>

          {/* Hero copy */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="h-px w-8 bg-[#d4a437]/50" />
              <p className="text-[9px] font-semibold tracking-[0.45em] text-[#d4a437]/70 uppercase">Content Management</p>
            </div>

            <h1
              className="text-[40px] xl:text-[52px] font-semibold leading-[1.05] text-white"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.01em" }}
            >
              Manage every<br />
              venue, city &amp;<br />
              <span style={{ color: "#d4a437" }}>destination.</span>
            </h1>

            <p className="mt-5 text-[14px] leading-relaxed text-white/45 max-w-xs">
              Publish venues, handle enquiries, update settings and control
              your entire platform — from a single place.
            </p>

            {/* Feature chips */}
            <div className="mt-8 flex flex-col gap-2.5">
              {[
                "Full venue CRUD with image upload",
                "Live enquiry inbox with reply",
                "India, Italy & international markets",
                "Real-time cache sync to website",
              ].map((f) => (
                <div key={f} className="flex items-center gap-3 text-[12px] text-white/40">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#d4a437", opacity: 0.7 }}
                  />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom attribution */}
          <div className="flex items-center gap-2">
            <div className="h-px w-6 bg-white/15" />
            <p className="text-[10px] text-white/25 tracking-widest uppercase">
              venueonmyplate.in
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-[#f4f4f5] lg:px-12 min-h-screen">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7f0f2e, #5c0a20)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <span className="text-[15px] font-bold text-[#09090b]">VenueOnMyPlate</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-[#09090b] tracking-tight leading-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-[14px] text-[#71717a]">
              Sign in to your admin console.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[13px] text-[#b91c1c]">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-[13px] font-semibold text-[#3f3f46] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@venueonmyplate.in"
                autoComplete="email"
                autoFocus
                className="w-full h-11 rounded-xl border border-[#e4e4e7] bg-white px-4 text-[14px] text-[#09090b] placeholder:text-[#a1a1aa] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#9b1239]/25 focus:border-[#9b1239]"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-[#3f3f46]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-[#e4e4e7] bg-white px-4 pr-11 text-[14px] text-[#09090b] placeholder:text-[#a1a1aa] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#9b1239]/25 focus:border-[#9b1239]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#71717a] transition-colors p-1"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 text-[13px] text-[#3f3f46] cursor-pointer select-none">
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
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? "#9b1239"
                  : "linear-gradient(135deg, #9b1239 0%, #7f0f2e 100%)",
                boxShadow: loading ? "none" : "0 4px 16px -4px rgba(155,18,57,0.5)",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in to dashboard"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e4e4e7]" />
            <p className="text-[11px] text-[#a1a1aa]">secure access</p>
            <div className="flex-1 h-px bg-[#e4e4e7]" />
          </div>

          {/* Security note */}
          <div className="rounded-xl bg-white border border-[#e4e4e7] p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#09090b]">Secured connection</p>
                <p className="text-[11px] text-[#71717a] mt-0.5 leading-relaxed">
                  This admin console is protected. All data is encrypted and stored securely.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#a1a1aa] mt-6">
            © {new Date().getFullYear()} VenueOnMyPlate. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}