"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";

interface CatalogFilterPanelProps {
  activeCount: number;
  resetHref: string;
  currentUrlKey: string;
  resultCount?: number;
  toolbarRightSlot?: React.ReactNode;
  children: React.ReactNode;
}

// ponytail: deliberate 2-copy HTML ceiling (`children` rendered once in PC sticky <aside> and once
// in SP/tablet native <dialog> with zero duplicate IDs and zero duplicated business logic to avoid
// manual DOM reparenting of React-owned nodes). Upgrade trigger: only refactor if measured SSR HTML
// payload size from filter options becomes a documented performance bottleneck.
export default function CatalogFilterPanel({
  activeCount,
  resetHref,
  resultCount,
  toolbarRightSlot,
  children,
}: CatalogFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeReasonRef = useRef<"user" | "resize" | "navigate">("user");

  const openDrawer = () => {
    closeReasonRef.current = "user";
    setIsOpen(true);
  };

  const closeDrawer = () => {
    closeReasonRef.current = "user";
    setIsOpen(false);
  };

  useEffect(() => {
    const node = dialogRef.current;
    if (!isOpen) {
      if (node?.open) node.close();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const opener = triggerRef.current;
    if (node && !node.open) {
      node.showModal();
    }
    closeButtonRef.current?.focus();

    const handleResize = () => {
      if (
        window.innerWidth >= 1024 ||
        (opener && window.getComputedStyle(opener).display === "none")
      ) {
        closeReasonRef.current = "resize";
        setIsOpen(false);
      }
    };

    const handlePopState = () => {
      closeReasonRef.current = "navigate";
      setIsOpen(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("popstate", handlePopState);
      if (node?.open) node.close();
      document.body.style.overflow = previousOverflow;
      if (
        closeReasonRef.current === "user" &&
        opener &&
        window.getComputedStyle(opener).display !== "none"
      ) {
        opener.focus();
      }
    };
  }, [isOpen]);

  return (
    <>
      <noscript>
        <style>{`@media (max-width: 1023.98px) { aside[data-catalog-sidebar="true"] { display: block !important; width: 100% !important; } }`}</style>
      </noscript>

      {/* SP (<768px) & Tablet (768–1023px): Unified 'Bộ lọc' + Sort/Count toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-xs lg:hidden">
        <div className="flex items-center gap-2">
          <button
            ref={triggerRef}
            type="button"
            onClick={openDrawer}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 transition cursor-pointer select-none shadow-2xs"
          >
            <SlidersHorizontal size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
            <span>Bộ lọc</span>
            {activeCount > 0 && (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-black text-white">
                {activeCount}
              </span>
            )}
          </button>

          {typeof resultCount === "number" && !toolbarRightSlot && (
            <span className="text-xs text-slate-600">
              <strong className="font-bold text-slate-900">{resultCount}</strong> sản phẩm
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {toolbarRightSlot ? (
            toolbarRightSlot
          ) : activeCount > 0 ? (
            <Link
              href={resetHref}
              scroll={false}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Xóa lọc</span>
            </Link>
          ) : null}
        </div>
      </div>

      {/* SP/Tablet Native Modal Drawer (<1024px) */}
      <dialog
        ref={dialogRef}
        data-filter-dialog="true"
        aria-modal="true"
        aria-label="Bộ lọc chi tiết"
        onCancel={(event) => {
          event.preventDefault();
          closeDrawer();
        }}
        onClose={() => {
          if (isOpen) {
            setIsOpen(false);
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDrawer();
          }
        }}
        className="fixed inset-0 z-50 m-0 hidden h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 overscroll-contain open:flex lg:open:hidden"
      >
        <div
          aria-hidden="true"
          onClick={closeDrawer}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        />

        <div className="relative z-10 ml-auto flex h-dvh max-h-dvh w-full max-w-[360px] sm:max-w-[400px] flex-col bg-white shadow-2xl pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-blue-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Bộ lọc chi tiết
                </h2>
                {activeCount > 0 && (
                  <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-black text-white">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Chọn nhiều tiêu chí rồi bấm Xem kết quả
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDrawer}
              aria-label="Đóng bộ lọc"
              className="inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3">
            {children}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3">
            {activeCount > 0 ? (
              <Link
                href={resetHref}
                scroll={false}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition shrink-0"
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>Thiết lập lại ({activeCount})</span>
              </Link>
            ) : (
              <span className="text-xs text-slate-500">
                Chưa chọn bộ lọc
              </span>
            )}

            <button
              type="button"
              onClick={closeDrawer}
              className="ml-auto inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
            >
              {typeof resultCount === "number"
                ? `Xem ${resultCount} sản phẩm`
                : "Xem kết quả"}
            </button>
          </div>
        </div>
      </dialog>

      {/* PC (>=1024px) Persistent 240px Left Sidebar — sticky on aside itself */}
      <aside
        data-catalog-sidebar="true"
        aria-label="Bộ lọc chi tiết"
        className="hidden lg:block lg:w-[240px] lg:shrink-0 lg:sticky lg:top-[calc(var(--storefront-header-height,4.5rem)+16px)] lg:max-h-[calc(100dvh-var(--storefront-header-height,4.5rem)-32px)] lg:overflow-y-auto overscroll-contain"
      >
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <SlidersHorizontal size={15} className="text-blue-600 shrink-0" aria-hidden="true" />
              <span>Bộ lọc chi tiết</span>
            </h2>
            {activeCount > 0 && (
              <Link
                href={resetHref}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
              >
                <RotateCcw size={12} aria-hidden="true" />
                <span>Xóa ({activeCount})</span>
              </Link>
            )}
          </div>

          {children}
        </div>
      </aside>
    </>
  );
}
