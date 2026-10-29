"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, MapPin, Globe, FileText, Star, ImageIcon,
  Settings, LogOut, X, ChevronRight, Inbox, CalendarCheck, Users, ScrollText,
  LayoutTemplate, PanelsTopLeft,
} from "lucide-react";
import { fetchCurrentUser, signOut } from "@/lib/auth";
import { enquiriesApi } from "@/lib/api";
import type { AdminUser } from "@/types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  permission?: string;
};
type NavGroup = { label: string; items: NavItem[] };

function SidebarNav({ groups, isActive, onClose }: {
  groups: NavGroup[];
  isActive: (href: string) => boolean;
  onClose?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition-all group",
                    active
                      ? "bg-[#9b1239]/20 text-[#fca5a5]"
                      : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]",
                  ].join(" ")}
                >
                  <span className={active ? "text-[#f87171]" : "text-white/30 group-hover:text-white/60 transition-colors"}>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#9b1239] text-[10px] font-bold text-white leading-none">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                  {active && !item.badge && <ChevronRight size={12} className="ml-auto text-[#f87171]/60" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [newEnquiries, setNewEnquiries] = React.useState(0);

  React.useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  React.useEffect(() => {
    enquiriesApi
      .list({ status: "new", limit: "1" })
      .then((res) => setNewEnquiries(res.total ?? 0))
      .catch(() => { /* non-critical */ });
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const can = (permission?: string) => {
    if (!permission) return true;
    const permissions = user?.permissions;
    if (!permissions) return true; // still loading — do not flicker the menu
    return permissions.includes(permission);
  };

  const NAV_GROUPS: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
        { href: "/bookings", label: "Bookings", icon: <CalendarCheck size={16} />, permission: "bookings.view" },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/venues", label: "Venues", icon: <Building2 size={16} />, permission: "venues.view" },
        { href: "/cities", label: "Cities", icon: <MapPin size={16} />, permission: "geography.manage" },
        { href: "/countries", label: "Countries", icon: <Globe size={16} />, permission: "geography.manage" },
        { href: "/blogs", label: "Blog Posts", icon: <FileText size={16} />, permission: "content.view" },
        { href: "/reviews", label: "Reviews", icon: <Star size={16} />, permission: "content.view" },
        { href: "/pages", label: "Website Pages", icon: <PanelsTopLeft size={16} />, permission: "content.view" },
        { href: "/content", label: "Homepage & Nav", icon: <LayoutTemplate size={16} />, permission: "content.view" },
        { href: "/enquiries", label: "Enquiries", icon: <Inbox size={16} />, badge: newEnquiries, permission: "bookings.view" },
      ],
    },
    {
      label: "System",
      items: [
        { href: "/media", label: "Media", icon: <ImageIcon size={16} />, permission: "media.view" },
        { href: "/users", label: "Admin Users", icon: <Users size={16} />, permission: "users.view" },
        { href: "/audit", label: "Audit Log", icon: <ScrollText size={16} />, permission: "audit.view" },
        { href: "/settings", label: "Settings", icon: <Settings size={16} />, permission: "settings.view" },
      ],
    },
  ];

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  const content = (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center justify-between h-[56px] px-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-[#9b1239] flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-[13px] font-bold text-white tracking-tight">VenueOnMyPlate</p>
            <p className="text-[10px] text-white/35 mt-0.5">Admin Console</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded text-white/30 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <SidebarNav groups={groups} isActive={isActive} onClose={onClose} />

      {/* ── User + Sign out ── */}
      <div className="shrink-0 border-t border-white/[0.06] p-2.5">
        {user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-[8px]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9b1239] to-[#7f0f2e] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/80 truncate">{user.name}</p>
              <p className="text-[10px] text-white/30 truncate capitalize">{user.roleName ?? user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => { void signOut(); }}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-all"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-[216px] shrink-0 bg-[#09090b] h-screen sticky top-0 border-r border-white/[0.04]">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[216px] bg-[#09090b] flex flex-col z-10 animate-slide-in-left">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
