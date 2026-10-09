"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function CategoryPagination({
  currentPage,
  totalPages,
}: CategoryPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  // Generate page numbers with ellipsis
  const pages: (number | "ellipsis")[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Phân trang sản phẩm"
      className="flex items-center justify-center gap-1.5 mt-10"
    >
      {/* Prev Button */}
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-control border border-border-default bg-surface-card text-text-secondary hover:text-brand-primary hover:border-brand-primary transition text-body-sm font-medium"
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </Link>
      ) : (
        <span
          className="flex items-center gap-1 px-3 py-2 rounded-control border border-border-subtle bg-surface-subtle text-text-muted opacity-50 cursor-not-allowed text-body-sm font-medium"
          aria-disabled="true"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === "ellipsis") {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-text-muted">
                ...
              </span>
            );
          }
          const isCurrent = p === currentPage;
          return isCurrent ? (
            <span
              key={p}
              className="w-10 h-10 flex items-center justify-center rounded-control bg-brand-primary text-text-inverse font-bold text-body-sm shadow-xs"
              aria-current="page"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={createPageUrl(p)}
              className="w-10 h-10 flex items-center justify-center rounded-control border border-border-default bg-surface-card text-text-secondary hover:border-brand-primary hover:text-brand-primary transition font-medium text-body-sm"
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-control border border-border-default bg-surface-card text-text-secondary hover:text-brand-primary hover:border-brand-primary transition text-body-sm font-medium"
          aria-label="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span
          className="flex items-center gap-1 px-3 py-2 rounded-control border border-border-subtle bg-surface-subtle text-text-muted opacity-50 cursor-not-allowed text-body-sm font-medium"
          aria-disabled="true"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}
