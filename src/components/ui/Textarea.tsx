"use client";

import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Textarea({
  label,
  error,
  helperText,
  className = "",
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#1d1d1f]"
        >
          {label}
          {props.required && <span className="text-[#dc2626] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        {...props}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm bg-white resize-y",
          "text-[#1d1d1f] placeholder:text-[#6e6e73]",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
          error
            ? "border-[#dc2626] focus:ring-[#dc2626]"
            : "border-[#e8e8ed]",
          className,
        ].join(" ")}
      />
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-[#6e6e73]">{helperText}</p>
      )}
    </div>
  );
}
