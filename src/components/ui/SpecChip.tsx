import React from "react";

export interface SpecChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  title?: string;
}

export function SpecChip({
  label,
  value,
  icon,
  highlight = false,
  title,
  className = "",
  ...props
}: SpecChipProps) {
  return (
    <div
      title={title}
      className={`bg-slate-50 border border-slate-200/70 rounded px-1 sm:px-1.5 py-0.5 flex items-center justify-center sm:justify-start gap-0.5 sm:gap-1 truncate text-[9px] sm:text-[11px] text-slate-700 ${className}`}
      {...props}
    >
      {icon && <span className="text-slate-400 shrink-0 hidden sm:inline-flex">{icon}</span>}
      {label && (
        <span
          className={`text-[9px] sm:text-[9.5px] font-bold shrink-0 ${
            highlight ? "text-blue-600" : "text-slate-500"
          }`}
        >
          {label}
        </span>
      )}
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
