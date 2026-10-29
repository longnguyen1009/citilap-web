"use client";

import Image from "next/image";
import { X, Scale, Trash2 } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import { MAX_COMPARE_PRODUCTS } from "@/contracts/catalog/compare";

export default function CompareFloatingBar() {
  const { items, removeFromCompare, clearCompare, openCompare } = useCompare();

  if (items.length === 0) return null;

  return (
    <aside
      aria-label="Thanh so sánh sản phẩm"
      className="fixed bottom-28 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 sm:p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Product Slots */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 shrink-0">
            <Scale className="w-4 h-4" />
            <span>So sánh</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative group w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl p-1 shrink-0 border border-slate-600 shadow-xs"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    SP
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFromCompare(item.id)}
                  title={`Bỏ ${item.name} khỏi so sánh`}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs hover:bg-rose-700 transition cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Empty placeholders up to MAX_COMPARE_PRODUCTS */}
            {Array.from({ length: MAX_COMPARE_PRODUCTS - items.length }).map((_, idx) => (
              <button
                key={`empty-${idx}`}
                type="button"
                onClick={openCompare}
                title="Bấm để mở bảng so sánh và thêm sản phẩm khác"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-dashed border-slate-600 hover:border-blue-400 hover:text-blue-400 flex items-center justify-center text-slate-400 text-xs shrink-0 transition cursor-pointer"
              >
                +{idx + 1 + items.length}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-300 hidden md:block truncate">
            <span className="font-bold text-white">{items.length}</span> / {MAX_COMPARE_PRODUCTS} máy
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            title="Xóa tất cả"
            className="p-2 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={openCompare}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition shadow-md cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>So sánh ngay ({items.length})</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
