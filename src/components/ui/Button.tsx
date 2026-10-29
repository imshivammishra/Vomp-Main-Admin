"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#9b1239] text-white hover:bg-[#7f0f2e] active:scale-[0.98] border border-transparent shadow-sm",
  secondary:
    "bg-white text-[#3f3f46] hover:bg-[#f4f4f5] active:scale-[0.98] border border-[#e4e4e7] shadow-sm",
  danger:
    "bg-[#b91c1c] text-white hover:bg-red-800 active:scale-[0.98] border border-transparent shadow-sm",
  ghost:
    "bg-transparent text-[#71717a] hover:text-[#3f3f46] hover:bg-[#f4f4f5] border border-transparent",
  outline:
    "bg-transparent text-[#9b1239] hover:bg-[#fef2f2] border border-[#9b1239]",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1 rounded-md",
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-lg",
  md: "h-9 px-4 text-[13px] gap-2 rounded-lg",
  lg: "h-10 px-5 text-[13px] gap-2 rounded-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b1239] focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {loading ? (
        <Loader2 size={size === "xs" || size === "sm" ? 13 : 15} className="animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
