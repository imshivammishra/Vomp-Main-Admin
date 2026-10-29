"use client";

import React from "react";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray" | "purple";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  "bg-[#f0fdf4] text-[#15803d] ring-1 ring-[#bbf7d0]",
  yellow: "bg-[#fffbeb] text-[#b45309] ring-1 ring-[#fde68a]",
  red:    "bg-[#fef2f2] text-[#b91c1c] ring-1 ring-[#fecaca]",
  blue:   "bg-[#eff6ff] text-[#1d4ed8] ring-1 ring-[#bfdbfe]",
  gray:   "bg-[#f4f4f5] text-[#71717a] ring-1 ring-[#e4e4e7]",
  purple: "bg-[#faf5ff] text-[#7c3aed] ring-1 ring-[#e9d5ff]",
};

const dotColors: Record<BadgeVariant, string> = {
  green:  "bg-[#16a34a]",
  yellow: "bg-[#d97706]",
  red:    "bg-[#dc2626]",
  blue:   "bg-[#2563eb]",
  gray:   "bg-[#71717a]",
  purple: "bg-[#7c3aed]",
};

export default function Badge({
  variant = "gray",
  dot = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {dot && <span className={["w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant]].join(" ")} />}
      {children}
    </span>
  );
}
