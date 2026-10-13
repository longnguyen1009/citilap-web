import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function AdminBreadcrumbs({ items, className = "" }: AdminBreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Đường dẫn trang" className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      <Link
        href="/admin/dashboard"
        className="hover:text-slate-800 transition text-slate-500 font-medium"
      >
        Admin
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {isLast || !item.href ? (
              <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-none" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-slate-800 transition font-medium">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
