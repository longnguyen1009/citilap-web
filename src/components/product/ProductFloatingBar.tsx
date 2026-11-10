"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Phone, ShoppingCart, X } from "lucide-react";
import { businessProfile } from "@/config/business-profile";

interface ProductFloatingBarProps {
  productName: string;
  image: string;
  variantLabel?: string;
  colorLabel?: string;
  totalPrice: number;
  phone?: string;
  orderable?: boolean;
  onAddToCart?: () => void;
  onBuyNow: () => void;
}

export default function ProductFloatingBar({
  productName,
  image,
  variantLabel,
  colorLabel,
  totalPrice,
  phone = businessProfile.displayPhone,
  orderable = true,
  onAddToCart,
  onBuyNow,
}: ProductFloatingBarProps) {
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const updateLayout = () => {
      const mobile = mq.matches || window.innerWidth < 768;
      setIsMobileViewport(mobile);
      setIsScrolledPast(window.scrollY > 450);
      // Resizing a PC-dismissed bar to SP (<768px) resets dismiss so SP critical actions are never inaccessible
      if (mobile) {
        setIsDismissed(false);
      }
    };

    updateLayout();
    window.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout, { passive: true });
    mq.addEventListener("change", updateLayout);
    return () => {
      window.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      mq.removeEventListener("change", updateLayout);
    };
  }, []);

  const active = isMobileViewport || (isScrolledPast && !isDismissed);

  useEffect(() => {
    if (active) {
      document.documentElement.dataset.pdpBar = "visible";
    } else {
      delete document.documentElement.dataset.pdpBar;
    }
    window.dispatchEvent(new CustomEvent("citilap:pdp-bar", { detail: { visible: active } }));
    return () => {
      delete document.documentElement.dataset.pdpBar;
      window.dispatchEvent(new CustomEvent("citilap:pdp-bar", { detail: { visible: false } }));
    };
  }, [active]);

  if (isDismissed && !isMobileViewport) {
    return null;
  }

  const specSummary = [variantLabel, colorLabel].filter(Boolean).join(" • ");
  const resolvedPhone = (phone || businessProfile.displayPhone).trim();
  const telHref = resolvedPhone
    ? `tel:${resolvedPhone.replace(/\s+/g, "")}`
    : businessProfile.telHref;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 md:px-6 py-2 md:py-2.5 safe-area-bottom z-40 shadow-[0_-8px_24px_-4px_rgba(15,23,42,0.12)] transition-all duration-300 motion-reduce:transition-none ease-out max-md:translate-y-0 max-md:opacity-100 max-md:pointer-events-auto ${
        isScrolledPast
          ? "md:translate-y-0 md:opacity-100 md:pointer-events-auto"
          : "md:translate-y-full md:opacity-0 md:pointer-events-none"
      }`}
    >
      <div className="w-full min-w-0 max-w-7xl mx-auto flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Top on SP / Left on Tablet+PC: Thumbnail, Selected Specs & Full Price */}
        <div className="flex items-center justify-between md:justify-start gap-2.5 md:gap-3 min-w-0 md:flex-1">
          <div className="relative hidden md:block h-11 w-11 rounded-lg border border-slate-200 bg-slate-50 shrink-0 p-0.5 overflow-hidden">
            <Image
              src={image || "/images/placeholder-laptop.svg"}
              alt={productName}
              fill
              className="object-contain"
              sizes="44px"
            />
          </div>
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2 md:block">
            <div className="min-w-0 flex-1">
              <p className="hidden md:block text-sm font-bold text-slate-900 truncate">
                {productName}
              </p>
              <p className="text-[11px] md:text-xs text-blue-700 font-semibold truncate">
                {specSummary || productName}
              </p>
            </div>
            <span className="md:hidden text-sm font-black text-rose-600 shrink-0 tabular-nums whitespace-nowrap">
              {totalPrice.toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>

        {/* Bottom on SP / Right on Tablet+PC: Live Price & Actions + Close button */}
        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 shrink-0">
          <div className="hidden md:block text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Giá thanh toán:</span>
            <span className="text-base lg:text-xl font-black text-rose-600 tabular-nums whitespace-nowrap">
              {totalPrice.toLocaleString("vi-VN")}₫
            </span>
          </div>

          <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] md:flex items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <a
              href={telHref}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 font-bold text-xs transition shrink-0"
              title={`Gọi tư vấn ${resolvedPhone}`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Tư vấn</span>
            </a>

            {onAddToCart && (
              <button
                type="button"
                onClick={onAddToCart}
                disabled={!orderable}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 transition font-bold text-xs cursor-pointer shrink-0"
                title="Thêm vào giỏ"
              >
                <ShoppingCart className="w-4 h-4 shrink-0" />
                <span>Thêm giỏ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBuyNow}
              disabled={!orderable}
              className="min-h-11 min-w-11 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-600 disabled:shadow-none disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap text-center"
            >
              {orderable ? "MUA NGAY" : "TẠM HẾT HÀNG"}
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Đóng thanh mua nhanh"
              title="Đóng thanh mua nhanh"
              className="hidden md:inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="hidden lg:inline">Đóng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
