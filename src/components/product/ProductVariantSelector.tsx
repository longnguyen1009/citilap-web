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

  // ĐIỀU KIỆN ẨN: Nếu sản phẩm không có lựa chọn option cấu hình (0 hoặc 1 cấu hình duy nhất) thì không cần hiển thị
  if (!variants || variants.length <= 1) {
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
      router.replace(`${pathname || `/laptop/${productSlug}`}${query}`, { scroll: false });
    });
  };

  return (
    <section className="space-y-2.5" aria-label="Tùy chọn cấu hình laptop">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">1</span>
          <span>CHỌN CẤU HÌNH (CPU / RAM / SSD / VGA):</span>
        </label>
        <span className="text-[11px] text-gray-400 font-medium">Bấm chọn đổi giá tức thì</span>
      </div>

      {/* DẠNG CARD 365: Thẻ to rõ, thông số rõ ràng, giá đỏ nổi bật, giá niêm yết mờ */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
        role="radiogroup"
        aria-label="Tùy chọn cấu hình laptop"
      >
        {variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;
          const isOutOfStock = variant.stock <= 0;
          const formattedPrice = `${variant.price.toLocaleString("vi-VN")}₫`;
          const formattedOldPrice = variant.originalPrice && variant.originalPrice > variant.price
            ? `${variant.originalPrice.toLocaleString("vi-VN")}₫`
            : null;

          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isOutOfStock}
              onClick={() => handleSelect(variant)}
              className={`relative text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none ${
                isOutOfStock
                  ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  : isSelected
                  ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/40 text-blue-950 shadow-xs ring-2 ring-blue-500/25"
                  : "border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50 text-gray-800"
              }`}
            >
              {/* Selected Checkmark Badge */}
              {isSelected && (
                <span
                  className="absolute top-2.5 right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black shadow-2xs"
                  aria-hidden="true"
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}

              {/* Variant Name & Specs */}
              <div>
                <span
                  className={`text-xs sm:text-sm font-black uppercase tracking-tight block pr-6 ${
                    isSelected ? "text-blue-950" : "text-gray-900"
                  }`}
                >
                  {variant.name}
                </span>

                {/* Micro spec pills */}
                {(variant.ram || variant.storage || variant.gpu) && (
                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-medium">
                    {[variant.ram, variant.storage, variant.gpu].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              {/* Price & Stock */}
              <div className="pt-2.5 mt-2.5 border-t border-gray-200/70 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs sm:text-sm font-black text-rose-600">
                    {formattedPrice}
                  </span>
                  {formattedOldPrice && (
                    <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">
                      {formattedOldPrice}
                    </span>
                  )}
                </div>

                {isOutOfStock ? (
                  <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Hết hàng
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                    Còn hàng
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
