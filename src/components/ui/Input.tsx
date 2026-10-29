"use client";

import React from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: React.ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  prefix,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#3f3f46]">
          {label}
          {props.required && <span className="text-[#b91c1c] ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]">
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            "h-9 w-full rounded-lg border bg-white px-3 text-[13px]",
            "text-[#09090b] placeholder:text-[#a1a1aa]",
            "shadow-sm transition-all",
            "focus:outline-none focus:ring-2 focus:ring-[#9b1239] focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#f4f4f5]",
            prefix ? "pl-9" : "",
            error ? "border-[#b91c1c] focus:ring-[#b91c1c]" : "border-[#e4e4e7]",
            className,
          ].join(" ")}
        />
      </div>
      {error && <p className="text-[12px] text-[#b91c1c]">{error}</p>}
      {helperText && !error && <p className="text-[12px] text-[#71717a]">{helperText}</p>}
    </div>
  );
}
