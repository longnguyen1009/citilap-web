'use client';

import { Plus, Check } from 'lucide-react';

export interface AccessoryItem {
  id: string;
  variantId?: string;
  name: string;
  slug?: string;
  image: string;
  salePrice: number;
  originalPrice?: number;
}

export type AccessoryComboItem = AccessoryItem;

interface ProductAccessoriesComboProps {
  accessories?: AccessoryItem[];
  items?: AccessoryItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function ProductAccessoriesCombo({
  accessories,
  items,
  selectedIds,
  onToggle,
}: ProductAccessoriesComboProps) {
  const list = accessories ?? items ?? [];
  if (list.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Plus className="h-4 w-4 text-[#2563EB] stroke-[2.5]" />
          <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Ưu đãi mua kèm tiết kiệm (Deal sốc)
          </h4>
        </div>
        <span className="text-xs font-semibold text-[#2563EB]">
          Tự động cộng vào giá
        </span>
      </div>

      <div className="space-y-2.5">
        {list.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const fallbackOriginalPrice =
            item.originalPrice && item.originalPrice > item.salePrice
              ? item.originalPrice
              : Math.round((item.salePrice * 1.25) / 10000) * 10000;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border p-2.5 sm:p-3 text-left transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-blue-100'
                  : 'border-slate-200 bg-slate-50/40 hover:border-blue-400 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? 'border-[#2563EB] bg-[#2563EB] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>

                <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                  <img
                    src={item.image || '/images/placeholder-laptop.svg'}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                </div>

                <span className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1">
                  {item.name}
                </span>
              </div>

              <div className="shrink-0 text-right pl-2">
                <div className="text-xs sm:text-sm font-extrabold text-rose-600 tabular-nums">
                  +{item.salePrice.toLocaleString('vi-VN')}₫
                </div>
                {fallbackOriginalPrice > item.salePrice && (
                  <div className="text-[11px] sm:text-xs text-slate-400 line-through tabular-nums">
                    {fallbackOriginalPrice.toLocaleString('vi-VN')}₫
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProductAccessoriesCombo;
