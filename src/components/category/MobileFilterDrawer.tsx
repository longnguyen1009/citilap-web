"use client";

import { useEffect, useRef } from "react";
import { X, Filter } from "lucide-react";
import CategoryFilterSidebar, { CategoryFilterSidebarProps } from "./CategoryFilterSidebar";

interface MobileFilterDrawerProps extends CategoryFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeCount: number;
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  activeCount,
  facets,
  categorySlug,
}: MobileFilterDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!isOpen) {
      if (node?.open) node.close();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const active = document.activeElement as HTMLElement | null;
    const opener =
      active && active !== document.body && !node?.contains(active)
        ? active
        : document.querySelector<HTMLElement>('button[aria-label="Mở bộ lọc tìm kiếm"]');

    if (node && !node.open) {
      node.showModal();
    }
    if (!node?.contains(document.activeElement)) {
      closeButtonRef.current?.focus();
    }

    let closedByResize = false;
    const handleResize = () => {
      if (opener && window.getComputedStyle(opener).display === "none") {
        closedByResize = true;
        onClose();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (node?.open) node.close();
      document.body.style.overflow = previousOverflow;
      if (!closedByResize && opener && window.getComputedStyle(opener).display !== "none") {
        opener.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (isOpen) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      aria-modal="true"
      aria-label="Bộ lọc sản phẩm"
      className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 overscroll-contain open:flex"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-surface-card shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-primary" />
            <h2 className="text-title font-bold text-text-primary">Bộ lọc sản phẩm</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-pill bg-brand-primary text-text-inverse text-caption font-bold">
                {activeCount}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition cursor-pointer"
            aria-label="Đóng bộ lọc"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          <CategoryFilterSidebar
            categorySlug={categorySlug}
            facets={facets}
            onApplyMobile={onClose}
          />
        </div>
      </div>
    </dialog>
  );
}
