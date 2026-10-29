"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, Bell } from "lucide-react";
import { fetchCurrentUser } from "@/lib/auth";
import type { AdminUser } from "@/types";

interface TopBarProps {
  onMenuClick?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/venues": "Venues",
  "/venues/new": "New Venue",
  "/cities": "Cities",
  "/cities/new": "New City",
  "/countries": "Countries",
  "/blogs": "Blog Posts",
  "/blogs/new": "New Blog Post",
  "/reviews": "Reviews",
  "/enquiries": "Enquiries",
  "/media": "Media Library",
  "/settings": "Site Settings",
  "/bookings": "Bookings",
  "/users": "Admin Users",
  "/audit": "Audit Log",
  "/content": "Homepage & Navigation",
  "/pages": "Website Pages",
  "/pages/new": "New Page",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/venues/")) return "Edit Venue";
  if (pathname.startsWith("/cities/")) return "Edit City";
  if (pathname.startsWith("/blogs/")) return "Edit Blog Post";
  if (pathname.startsWith("/pages/")) return "Edit Page";
  return "Admin";
}

function getBreadcrumb(pathname: string): { label: string; href: string } | null {
  if (pathname.startsWith("/venues/") && pathname !== "/venues/new") return { label: "Venues", href: "/venues" };
  if (pathname.startsWith("/cities/") && pathname !== "/cities/new") return { label: "Cities", href: "/cities" };
  if (pathname.startsWith("/blogs/") && pathname !== "/blogs/new") return { label: "Blog Posts", href: "/blogs" };
  if (pathname.startsWith("/pages/") && pathname !== "/pages/new") return { label: "Website Pages", href: "/pages" };
  return null;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const title = getTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);

  React.useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  return (
    <header className="h-[56px] bg-white border-b border-[#e4e4e7] px-5 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 p-1.5 rounded-lg hover:bg-[#f4f4f5] text-[#71717a] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb / title */}
        <div className="flex items-center gap-2 text-[13px] min-w-0">
          {breadcrumb ? (
            <>
              <Link href={breadcrumb.href} className="text-[#a1a1aa] hover:text-[#71717a] transition-colors truncate">
                {breadcrumb.label}
              </Link>
              <span className="text-[#d4d4d8]">/</span>
              <span className="font-semibold text-[#09090b] truncate">{title}</span>
            </>
          ) : (
            <span className="font-semibold text-[#09090b]">{title}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link
          href="/enquiries"
          className="p-2 rounded-lg hover:bg-[#f4f4f5] text-[#71717a] transition-colors relative"
          aria-label="Enquiries"
        >
          <Bell size={16} />
        </Link>

        {/* Add venue shortcut */}
        <Link
          href="/venues/new"
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#9b1239] text-white text-[12px] font-semibold hover:bg-[#7f0f2e] transition-colors"
        >
          <Plus size={14} />
          Add Venue
        </Link>

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#e4e4e7] ml-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#9b1239] to-[#7f0f2e] flex items-center justify-center text-white text-[11px] font-bold">
              {user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="text-[13px] font-medium text-[#3f3f46] hidden md:block max-w-[120px] truncate">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
