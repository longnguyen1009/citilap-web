"use client";

import Image from "next/image";
import { Sparkles, Check } from "lucide-react";

export interface AccessoryItem {
  id: string;
  name: string;
  originalPrice: number;
  salePrice: number;
  image: string;
  variantId?: string;
}

interface ProductAccessoriesComboProps {
  accessories?: AccessoryItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export default function ProductAccessoriesCombo({
  accessories = [],
  selectedIds,
  onToggle,
}: ProductAccessoriesComboProps) {
  if (!accessories || accessories.length === 0) return null;

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
        <span className="flex items-center gap-1.5 text-blue-800">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Ưu đãi mua kèm tiết kiệm (Deal sốc)</span>
        </span>
        <span className="text-[11px] text-blue-600 font-semibold">Tự động cộng vào giá</span>
      </div>

      <div className="space-y-2">
        {accessories.map((acc) => {
          const isSelected = selectedIds.includes(acc.id);
          const saving = acc.originalPrice - acc.salePrice;

          return (
            <button
              type="button"
              aria-pressed={isSelected}
              key={acc.id}
              onClick={() => onToggle(acc.id)}
              className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer select-none ${
                isSelected
                  ? "border-blue-600 bg-white shadow-xs"
                  : "border-slate-200/80 bg-white/70 hover:border-blue-300 hover:bg-white"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <div className="relative h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                  <Image
                    src={acc.image}
                    alt={acc.name}
                    fill
                    className="object-contain p-0.5"
                    sizes="40px"
                  />
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 line-clamp-1 block">
                    {acc.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                    <span className="font-bold text-rose-600">
                      {acc.salePrice.toLocaleString("vi-VN")}₫
                    </span>
                    <span className="text-slate-400 line-through text-[10px]">
                      {acc.originalPrice.toLocaleString("vi-VN")}₫
                    </span>
                  </div>
                </div>
              </div>

              {saving > 0 && (
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 shrink-0">
                  Tiết kiệm {saving.toLocaleString("vi-VN")}₫
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
