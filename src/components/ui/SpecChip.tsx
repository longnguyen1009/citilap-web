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
      className={`bg-white/95 border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] rounded-md px-1.5 py-0.5 flex items-center justify-start gap-1 truncate text-[11px] sm:text-[12px] text-slate-800 ${className}`}
      {...props}
    >
      {icon && <span className="text-slate-400 shrink-0 inline-flex items-center">{icon}</span>}
      {label && (
        <span
          className={`text-[9.5px] sm:text-[10px] font-bold shrink-0 ${
            highlight ? "text-blue-600" : "text-slate-500"
          }`}
        >
          {label}
        </span>
      )}
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}
