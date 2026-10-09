"use client";

import { useEffect } from "react";
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
}: MobileFilterDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bộ lọc sản phẩm"
      className="fixed inset-0 z-50 flex lg:hidden"
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
            onClick={onClose}
            className="p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition cursor-pointer"
            aria-label="Đóng bộ lọc"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters */}
        <div className="flex-1 overflow-y-auto p-5">
          <CategoryFilterSidebar facets={facets} onApplyMobile={onClose} />
        </div>
      </div>
    </div>
  );
}
