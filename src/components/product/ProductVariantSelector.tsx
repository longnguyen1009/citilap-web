"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import type { ProductDetailVariant } from "@/server/services/catalog.service";

interface ProductVariantSelectorProps {
  variants: ProductDetailVariant[];
  selectedVariantId: string | null;
  onSelectVariant?: (variant: ProductDetailVariant) => void;
  productSlug: string;
}

export default function ProductVariantSelector({
  variants,
  selectedVariantId,
  onSelectVariant,
  productSlug,
}: ProductVariantSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (!variants || variants.length === 0) {
    return null;
  }

  const handleSelect = (variant: ProductDetailVariant) => {
    onSelectVariant?.(variant);

    // Update URL query parameter shallowly
    startTransition(() => {
      const current = new URLSearchParams(Array.from(searchParams?.entries() || []));
      current.set("sku", variant.sku);
      // Remove legacy variantId if present to favor clean sku
      current.delete("variant");
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${pathname || `/product/${productSlug}`}${query}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          Chọn cấu hình / Phiên bản ({variants.length})
        </label>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label="Tùy chọn cấu hình laptop"
      >
        {variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;
          const isOutOfStock = variant.stock <= 0;
          const formattedPrice = `${variant.price.toLocaleString("vi-VN")}đ`;
          const formattedOldPrice = variant.originalPrice
            ? `${variant.originalPrice.toLocaleString("vi-VN")}đ`
            : null;

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isOutOfStock}
              onClick={() => handleSelect(variant)}
              className={`relative text-left p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                isOutOfStock
                  ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <div
                  className="absolute top-0 right-0 bg-blue-600 text-white w-5 h-5 rounded-bl-lg rounded-tr-md flex items-center justify-center shadow-xs"
                  aria-hidden="true"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Variant Name */}
              <div>
                <div className="flex items-center justify-between pr-4 mb-2">
                  <span
                    className={`text-sm font-bold leading-snug line-clamp-2 ${
                      isSelected ? "text-blue-900" : "text-gray-900"
                    }`}
                  >
                    {variant.name}
                  </span>
                </div>

                {/* Micro spec pills if variant has custom specs */}
                {(variant.ram || variant.storage || variant.gpu) && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {variant.ram && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {variant.ram}
                      </span>
                    )}
                    {variant.storage && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {variant.storage}
                      </span>
                    )}
                    {variant.gpu && (
                      <span className="text-[10px] font-medium bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {variant.gpu}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Price & Stock */}
              <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between mt-auto">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-red-600">
                    {formattedPrice}
                  </span>
                  {formattedOldPrice && (
                    <span className="text-xs text-gray-400 line-through">
                      {formattedOldPrice}
                    </span>
                  )}
                </div>

                {isOutOfStock ? (
                  <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-500" /> Hết hàng
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-600">
                    Còn {variant.stock} máy
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
