import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminBreadcrumbs, { type BreadcrumbItem } from "./AdminBreadcrumbs";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  backHref,
  backLabel = "Quay lại",
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`admin-page-header mb-5 space-y-2 ${className}`}>
      {/* Top row: Breadcrumbs & Back link */}
      {(breadcrumbs?.length || backHref) && <div className="flex items-center justify-between gap-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <AdminBreadcrumbs items={breadcrumbs} />
        ) : backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
        ) : null}
      </div>}

      {/* Main row: Title, Badge and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight" title={description}>
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
