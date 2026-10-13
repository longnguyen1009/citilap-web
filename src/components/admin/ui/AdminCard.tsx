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
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${className}`}>
      {(title || action) && (
        <div
          className={`px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {typeof title === "string" ? (
              <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
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
      <div className={`p-5 sm:p-6 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className="px-5 py-3.5 sm:px-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}
