"use client";

import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  className = "",
  id,
  ...props
}: SelectProps) {
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
      <select
        id={inputId}
        {...props}
        className={[
          "h-9 w-full rounded-lg border px-3 text-sm bg-white appearance-none",
          "text-[#1d1d1f]",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-[#7f0f2e] focus:border-transparent",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50",
          error
            ? "border-[#dc2626] focus:ring-[#dc2626]"
            : "border-[#e8e8ed]",
          className,
        ].join(" ")}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          paddingRight: "2rem",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#dc2626]">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-[#6e6e73]">{helperText}</p>
      )}
    </div>
  );
}
