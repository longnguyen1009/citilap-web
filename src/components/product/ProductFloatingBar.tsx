"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShoppingCart, X } from "lucide-react";

interface ProductFloatingBarProps {
  productName: string;
  image: string;
  variantLabel?: string;
  colorLabel?: string;
  totalPrice: number;
  onAddToCart?: () => void;
  onBuyNow: () => void;
}

export default function ProductFloatingBar({
  productName,
  image,
  variantLabel,
  colorLabel,
  totalPrice,
  onAddToCart,
  onBuyNow,
}: ProductFloatingBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show when scrolled down past 450px
      if (window.scrollY > 450) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isDismissed) {
    return null;
  }

  const specSummary = [variantLabel, colorLabel].filter(Boolean).join(" • ");

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 z-40 shadow-2xl transition-all duration-300 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="max-w-[1370px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Thumbnail & Selected Specs */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-11 w-11 rounded-lg border border-slate-200 bg-slate-50 shrink-0 p-0.5 overflow-hidden">
            <Image
              src={image || "/images/placeholder-laptop.svg"}
              alt={productName}
              fill
              className="object-contain"
              sizes="44px"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[160px] sm:max-w-md">
              {productName}
            </p>
            {specSummary && (
              <p className="text-[11px] text-blue-700 font-semibold truncate max-w-[150px] sm:max-w-sm mt-0.5">
                {specSummary}
              </p>
            )}
          </div>
        </div>

        {/* Right: Live Price & Actions + Close button */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Giá thanh toán:</span>
            <span className="text-base sm:text-xl font-black text-rose-600">
              {totalPrice.toLocaleString("vi-VN")}₫
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAddToCart && (
              <button
                type="button"
                onClick={onAddToCart}
                className="hidden sm:flex items-center justify-center p-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-800 transition font-bold text-xs cursor-pointer"
                title="Thêm vào giỏ"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onBuyNow}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
            >
              MUA NGAY
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Đóng thanh mua nhanh"
              title="Đóng thanh mua nhanh"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-semibold transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span className="hidden md:inline">Đóng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
