import React from "react";

export interface AdminCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export default function AdminCard({
  children,
  title,
  subtitle,
  action,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footer,
}: AdminCardProps) {
  return (
    <div className={`admin-card bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {(title || action) && (
        <div
          className={`admin-card-header px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {typeof title === "string" ? (
              <h2 className="text-[13px] font-semibold text-slate-900 leading-tight">{title}</h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 leading-normal">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName || "p-4"}>{children}</div>
      {footer && (
        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex flex-wrap gap-3 items-center justify-between text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
