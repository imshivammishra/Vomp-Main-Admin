"use client";

import React, { useEffect, useState } from "react";
import { Save, Globe, Home, Search, Share2, AlignLeft, Lock } from "lucide-react";
import type { SiteSettings } from "@/types";
import { settingsApi, authApi } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

type Tab = "general" | "social" | "homepage" | "seo" | "footer" | "security";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general",  label: "General",  icon: <Globe size={14} /> },
  { id: "social",   label: "Social",   icon: <Share2 size={14} /> },
  { id: "homepage", label: "Homepage", icon: <Home size={14} /> },
  { id: "seo",      label: "SEO",      icon: <Search size={14} /> },
  { id: "footer",   label: "Footer",   icon: <AlignLeft size={14} /> },
  { id: "security", label: "Security", icon: <Lock size={14} /> },
];

const EMPTY: SiteSettings = {
  brandName: "", tagline: "", email: "", phone: "", whatsapp: "",
  address: "", hours: "", responseNote: "", footerNote: "",
  instagram: "", facebook: "", youtube: "", twitter: "",
  seoTitle: "", seoDescription: "", seoKeywords: "",
  heroTitle: "", heroSubtitle: "", heroTagline: "",
  featuredSectionTitle: "", featuredSectionSubtitle: "",
  ctaTitle: "", ctaCopy: "",
};

function FieldDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#f0f0f0]" />
    </div>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(EMPTY);
  const [saved, setSaved] = useState<SiteSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // Security / change-password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then((s) => { setSettings(s); setSaved(s); })
      .catch(() => toast.show("Could not load settings", "info"))
      .finally(() => setLoading(false));
  }, [toast]);

  const set = (key: keyof SiteSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const isDirty = (tab: Tab): boolean => {
    const keys = TAB_KEYS[tab];
    return keys.some((k) => settings[k] !== saved[k]);
  };

  const handleSave = async () => {
    if (activeTab === "security") return; // handled separately
    setSaving(true);
    try {
      const updated = await settingsApi.update(settings);
      setSaved(updated);
      toast.show("Settings saved", "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 10) {
      toast.show("Password must be at least 10 characters", "error");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.show("Password must include letters and numbers", "error");
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      // The server revokes every session for the account after a password change.
      toast.show("Password changed. Please sign in again.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.location.href = "/login?passwordChanged=1";
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to change password", "error");
      setChangingPassword(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2">
        {TABS.map((t) => <div key={t.id} className="h-8 w-24 bg-[#f4f4f5] rounded-full animate-pulse" />)}
      </div>
      <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5 animate-pulse">
            <div className="h-3 w-20 bg-[#e4e4e7] rounded" />
            <div className="h-9 w-full bg-[#f4f4f5] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Tab pills */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const dirty = isDirty(t.id);
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={[
                "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all",
                active
                  ? "bg-[#09090b] text-white shadow-sm"
                  : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#09090b]",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
              {dirty && (
                <span className={[
                  "w-1.5 h-1.5 rounded-full",
                  active ? "bg-[#f87171]" : "bg-[#9b1239]",
                ].join(" ")} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      {activeTab === "general" && (
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Brand" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Brand Name" value={settings.brandName} onChange={(e) => set("brandName", e.target.value)} required />
            <Input label="Tagline" value={settings.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <FieldDivider label="Contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" value={settings.email} onChange={(e) => set("email", e.target.value)} />
            <Input label="Phone" value={settings.phone} onChange={(e) => set("phone", e.target.value)} />
            <Input label="WhatsApp" value={settings.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <Textarea label="Address" value={settings.address} onChange={(e) => set("address", e.target.value)} rows={2} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Business Hours" value={settings.hours} onChange={(e) => set("hours", e.target.value)} />
            <Input label="Response Note" value={settings.responseNote} onChange={(e) => set("responseNote", e.target.value)} />
          </div>
        </div>
      )}

      {activeTab === "social" && (
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Social Media URLs" />
          <Input label="Instagram" value={settings.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/..." />
          <Input label="Facebook" value={settings.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/..." />
          <Input label="YouTube" value={settings.youtube} onChange={(e) => set("youtube", e.target.value)} placeholder="https://youtube.com/..." />
          <Input label="Twitter / X" value={settings.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="https://twitter.com/..." />
        </div>
      )}

      {activeTab === "homepage" && (
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Hero Section" />
          <Input label="Hero Title" value={settings.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
          <Input label="Hero Subtitle" value={settings.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
          <Input label="Hero Tagline" value={settings.heroTagline} onChange={(e) => set("heroTagline", e.target.value)} />
          <FieldDivider label="Featured Section" />
          <Input label="Featured Section Title" value={settings.featuredSectionTitle} onChange={(e) => set("featuredSectionTitle", e.target.value)} />
          <Input label="Featured Section Subtitle" value={settings.featuredSectionSubtitle} onChange={(e) => set("featuredSectionSubtitle", e.target.value)} />
          <FieldDivider label="CTA" />
          <Input label="CTA Title" value={settings.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
          <Textarea label="CTA Copy" value={settings.ctaCopy} onChange={(e) => set("ctaCopy", e.target.value)} rows={3} />
        </div>
      )}

      {activeTab === "seo" && (
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Search Engine Optimization" />
          <Input label="SEO Title" value={settings.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} helperText="Recommended: 50–60 characters" />
          <Textarea label="SEO Description" value={settings.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={3} helperText="Recommended: 150–160 characters" />
          <Textarea label="Keywords" value={settings.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} rows={2} helperText="Comma-separated keywords" />
        </div>
      )}

      {activeTab === "footer" && (
        <div className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Footer" />
          <Textarea label="Footer Note" value={settings.footerNote} onChange={(e) => set("footerNote", e.target.value)} rows={4} helperText="Shown in the website footer below the links" />
        </div>
      )}

      {activeTab === "security" && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-[#e4e4e7] p-5 space-y-4">
          <FieldDivider label="Change Password" />
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="At least 10 characters, including letters and numbers"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <div className="pt-1">
            <Button type="submit" loading={changingPassword} size="lg" icon={<Lock size={16} />}>
              Change Password
            </Button>
          </div>
        </form>
      )}

      {activeTab !== "security" && (
        <div className="pb-6">
          <Button type="button" onClick={handleSave} loading={saving} size="lg" icon={<Save size={16} />}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

const TAB_KEYS: Record<Tab, (keyof SiteSettings)[]> = {
  general:  ["brandName", "tagline", "email", "phone", "whatsapp", "address", "hours", "responseNote"],
  social:   ["instagram", "facebook", "youtube", "twitter"],
  homepage: ["heroTitle", "heroSubtitle", "heroTagline", "featuredSectionTitle", "featuredSectionSubtitle", "ctaTitle", "ctaCopy"],
  seo:      ["seoTitle", "seoDescription", "seoKeywords"],
  footer:   ["footerNote"],
  security: [],
};

