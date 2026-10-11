"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ShieldCheck,
  Zap,
  ShoppingCart,
  Plus,
  Minus,
  ArrowRight,
  Phone,
  MessageCircle,
  Truck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { PriceTag } from "@/components/ui/PriceTag";
import { StockBadge } from "@/components/ui/StockBadge";
import type { ProductDetailVariant } from "@/server/services/catalog.service";
import { businessProfile } from "@/config/business-profile";

export interface WarrantyOption {
  id: string;
  name: string;
  durationMonths: number;
  surcharge: number; // Phụ phí VND (0 nếu đã bao gồm)
  isRecommended?: boolean;
  description: string;
}

interface ProductPurchaseSectionProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  initialCondition: string; // "NEW" | "LIKE_NEW"
  initialWarranty?: string | null;
  basePrice: number;
  baseOriginalPrice: number | null;
  baseStock: number;
  variants: ProductDetailVariant[];
  selectedVariantId: string | null;
}

export default function ProductPurchaseSection({
  productId,
  productName,
  productSlug,
  productImage,
  initialCondition,
  initialWarranty,
  basePrice,
  baseOriginalPrice,
  baseStock,
  variants,
  selectedVariantId,
}: ProductPurchaseSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { addToCart, cartCount } = useCart();

  // 1. TÌNH TRẠNG MÁY (Condition): "NEW" (Mới 100%) hoặc "LIKE_NEW" (Like New 99%)
  const isInitiallyLikeNew =
    initialCondition?.toUpperCase().includes("LIKE") ||
    initialCondition?.includes("99") ||
    initialCondition?.toUpperCase().includes("USED");

  const [selectedCondition, setSelectedCondition] = useState<"NEW" | "LIKE_NEW">(
    isInitiallyLikeNew ? "LIKE_NEW" : "NEW"
  );

  // 2. BIẾN THỂ CẤU HÌNH (Variant)
  const [selectedVariant, setSelectedVariant] = useState<ProductDetailVariant | null>(() => {
    if (variants && variants.length > 0) {
      const found = variants.find((v) => v.id === selectedVariantId);
      return found || variants[0];
    }
    return null;
  });

  // 3. DANH SÁCH GÓI BẢO HÀNH THEO TÌNH TRẠNG MÁY
  // Máy New thường có gói 6T và 12T
  // Máy Like New thường có gói 3T, 6T và 12T
  const warrantyPackages = useMemo<WarrantyOption[]>(() => {
    if (selectedCondition === "NEW") {
      return [
        {
          id: "w-new-6m",
          name: "Bảo hành 6 tháng",
          durationMonths: 6,
          surcharge: -400000, // Gói tiết kiệm chi phí
          description: "Bảo hành phần cứng 6 tháng, 1 đổi 1 trong 15 ngày",
        },
        {
          id: "w-new-12m",
          name: "Bảo hành 12 tháng",
          durationMonths: 12,
          surcharge: 0, // Mặc định tiêu chuẩn máy mới
          isRecommended: true,
          description: "Bảo hành toàn diện 1 năm chính hãng tại CitiLap",
        },
      ];
    } else {
      return [
        {
          id: "w-ln-3m",
          name: "Bảo hành 3 tháng",
          durationMonths: 3,
          surcharge: 0, // Gói tiêu chuẩn máy lướt giá tốt nhất
          description: "Bảo hành phần cứng 3 tháng, 1 đổi 1 trong 15 ngày",
        },
        {
          id: "w-ln-6m",
          name: "Bảo hành 6 tháng",
          durationMonths: 6,
          surcharge: 400000,
          description: "Bảo hành phần cứng 6 tháng, an tâm sử dụng",
        },
        {
          id: "w-ln-12m",
          name: "Bảo hành 12 tháng",
          durationMonths: 12,
          surcharge: 800000,
          isRecommended: true,
          description: "Bảo hành toàn diện 1 năm như máy mới, yên tâm tối đa",
        },
      ];
    }
  }, [selectedCondition]);

  // Gói bảo hành đang được chọn (ưu tiên theo cấu hình admin initialWarranty nếu có)
  const [selectedWarrantyId, setSelectedWarrantyId] = useState<string>(() => {
    if (initialWarranty) {
      if (initialWarranty.includes("3") && isInitiallyLikeNew) return "w-ln-3m";
      if (initialWarranty.includes("6") && isInitiallyLikeNew) return "w-ln-6m";
      if (initialWarranty.includes("12") && isInitiallyLikeNew) return "w-ln-12m";
      if (initialWarranty.includes("6") && !isInitiallyLikeNew) return "w-new-6m";
      if (initialWarranty.includes("12") && !isInitiallyLikeNew) return "w-new-12m";
    }
    // Mặc định chọn gói khuyên dùng
    return isInitiallyLikeNew ? "w-ln-6m" : "w-new-12m";
  });

  // Tự động điều chỉnh warrantyId khi đổi condition nếu gói trước đó không thuộc list mới
  const currentWarranty = useMemo(() => {
    const found = warrantyPackages.find((w) => w.id === selectedWarrantyId);
    if (found) return found;
    const recommended = warrantyPackages.find((w) => w.isRecommended);
    return recommended || warrantyPackages[0];
  }, [warrantyPackages, selectedWarrantyId]);

  // 4. TÍNH TOÁN GIÁ TRỰC TIẾP (LIVE DYNAMIC PRICE)
  // Giá cơ sở của cấu hình đang chọn
  const rawVariantPrice = selectedVariant ? selectedVariant.price : basePrice;
  const rawVariantOriginalPrice = selectedVariant
    ? selectedVariant.originalPrice
    : baseOriginalPrice;

  // Chênh lệch giá theo tình trạng máy (Máy Like New tiết kiệm hơn máy New)
  const conditionPriceDiff = useMemo(() => {
    if (selectedCondition === "LIKE_NEW" && !isInitiallyLikeNew) {
      // Khách chọn bản Like New trong khi máy gốc là New -> Tiết kiệm 2.500.000đ (hoặc 8%)
      return -Math.max(2000000, Math.round((rawVariantPrice * 0.08) / 100000) * 100000);
    }
    if (selectedCondition === "NEW" && isInitiallyLikeNew) {
      // Khách chọn bản New trong khi máy gốc là Like New -> Thêm 2.500.000đ
      return Math.max(2500000, Math.round((rawVariantPrice * 0.09) / 100000) * 100000);
    }
    return 0;
  }, [selectedCondition, isInitiallyLikeNew, rawVariantPrice]);

  // Giá tổng cộng cuối cùng sau khi cộng gói bảo hành và tình trạng máy
  const finalPrice = Math.max(
    0,
    rawVariantPrice + conditionPriceDiff + (currentWarranty?.surcharge || 0)
  );

  const finalOriginalPrice = rawVariantOriginalPrice
    ? Math.max(
        finalPrice,
        rawVariantOriginalPrice + conditionPriceDiff + (currentWarranty?.surcharge || 0)
      )
    : null;

  // Số lượng mua & Tồn kho
  const currentStock = selectedVariant ? selectedVariant.stock : baseStock;
  const isOutOfStock = currentStock <= 0;
  const maxQty = Math.max(1, currentStock);
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Xử lý chọn biến thể (Variant)
  const handleSelectVariant = (variant: ProductDetailVariant) => {
    setSelectedVariant(variant);

    // Cập nhật URL shallowly qua ?sku=...
    startTransition(() => {
      const current = new URLSearchParams(Array.from(searchParams?.entries() || []));
      current.set("sku", variant.sku);
      current.delete("variant");
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${pathname || `/product/${productSlug}`}${query}`, { scroll: false });
    });
  };

  // Xử lý chọn tình trạng máy (Condition)
  const handleSelectCondition = (cond: "NEW" | "LIKE_NEW") => {
    setSelectedCondition(cond);
    // Tự động gán lại gói bảo hành phù hợp
    if (cond === "NEW") {
      setSelectedWarrantyId("w-new-12m");
    } else {
      setSelectedWarrantyId("w-ln-6m");
    }
  };

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = () => {
    if (isOutOfStock) return;

    const conditionText = selectedCondition === "NEW" ? "Mới 100%" : "Like New 99%";
    const variantText = selectedVariant ? selectedVariant.name : "";
    const warrantyText = currentWarranty ? currentWarranty.name : "";
    const fullLabel = [variantText, conditionText, warrantyText].filter(Boolean).join(" • ");

    addToCart({
      id: `${productId}-${selectedVariant?.id || "base"}-${selectedCondition}-${currentWarranty?.id || "def"}`,
      productId,
      variantId: selectedVariant?.id,
      name: productName,
      price: finalPrice,
      displayPrice: `${finalPrice.toLocaleString("vi-VN")}đ`,
      image: productImage || "/images/placeholder-laptop.svg",
      variantLabel: fullLabel,
      quantity,
      maxQuantity: currentStock,
    });

    setToastMessage(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    router.push("/cart");
  };

  return (
    <div className="space-y-6 pt-1">
      {/* 1. CHỌN TÌNH TRẠNG MÁY (CONDITION) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
            1
          </span>
          <label className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide">
            Tình trạng máy
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Chọn tình trạng máy">
          {/* Option: Mới 100% */}
          <button
            type="button"
            role="radio"
            aria-checked={selectedCondition === "NEW"}
            onClick={() => handleSelectCondition("NEW")}
            className={`relative p-3 sm:p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
              selectedCondition === "NEW"
                ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
            }`}
          >
            {selectedCondition === "NEW" && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white w-5 h-5 rounded-bl-lg rounded-tr-md flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-bold text-gray-900">Mới 100%</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Nguyên seal, xuất xưởng chính hãng
            </p>
          </button>

          {/* Option: Like New 99% */}
          <button
            type="button"
            role="radio"
            aria-checked={selectedCondition === "LIKE_NEW"}
            onClick={() => handleSelectCondition("LIKE_NEW")}
            className={`relative p-3 sm:p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
              selectedCondition === "LIKE_NEW"
                ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
            }`}
          >
            {selectedCondition === "LIKE_NEW" && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white w-5 h-5 rounded-bl-lg rounded-tr-md flex items-center justify-center shadow-xs">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1">
              <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold text-gray-900">Like New 99%</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-tight">
              Đẹp như mới, nguyên zin, tiết kiệm chi phí
            </p>
          </button>
        </div>
      </div>

      {/* 2. CHỌN CẤU HÌNH / PHIÊN BẢN (VARIANTS) */}
      {variants && variants.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
              2
            </span>
            <label className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide">
              Chọn cấu hình ({variants.length})
            </label>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            role="radiogroup"
            aria-label="Tùy chọn cấu hình laptop"
          >
            {variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isVariantOutOfStock = variant.stock <= 0;

              // Giá ước tính của variant theo condition đang chọn
              const displayVariantPrice = Math.max(0, variant.price + conditionPriceDiff);

              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isVariantOutOfStock}
                  onClick={() => handleSelectVariant(variant)}
                  className={`relative text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                    isVariantOutOfStock
                      ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
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

                  {/* Variant Name & Specs */}
                  <div>
                    <span
                      className={`text-sm font-bold leading-snug line-clamp-2 mb-1.5 block ${
                        isSelected ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {variant.name}
                    </span>

                    {/* Spec tags */}
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

                  {/* Variant Price & Stock */}
                  <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between mt-auto">
                    <span className="text-sm font-black text-red-600">
                      {displayVariantPrice.toLocaleString("vi-VN")}đ
                    </span>

                    {isVariantOutOfStock ? (
                      <span className="text-[11px] font-semibold text-gray-400">Hết hàng</span>
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
      )}

      {/* 3. CHỌN GÓI BẢO HÀNH (WARRANTY PACKAGES) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
              3
            </span>
            <label className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Chọn gói bảo hành
            </label>
          </div>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            Cam kết 1 đổi 1 trong 15 ngày
          </span>
        </div>

        <div
          className={`grid gap-2.5 ${
            warrantyPackages.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"
          }`}
          role="radiogroup"
          aria-label="Chọn thời gian bảo hành"
        >
          {warrantyPackages.map((pkg) => {
            const isSelected = currentWarranty?.id === pkg.id;

            return (
              <button
                key={pkg.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedWarrantyId(pkg.id)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
                }`}
              >
                {/* Badge Khuyên dùng nếu có */}
                {pkg.isRecommended && (
                  <span className="absolute -top-2.5 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs uppercase tracking-tight">
                    Khuyên dùng
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isSelected ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {pkg.name}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-500 leading-tight mb-2 line-clamp-2">
                    {pkg.description}
                  </p>
                </div>

                <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs mt-auto">
                  <span
                    className={`font-bold ${
                      pkg.surcharge > 0
                        ? "text-red-600"
                        : pkg.surcharge < 0
                        ? "text-emerald-600"
                        : "text-blue-600"
                    }`}
                  >
                    {pkg.surcharge === 0
                      ? "Đã bao gồm"
                      : pkg.surcharge > 0
                      ? `+${pkg.surcharge.toLocaleString("vi-VN")}đ`
                      : `${pkg.surcharge.toLocaleString("vi-VN")}đ`}
                  </span>

                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. HỘP GIÁ TỔNG CỘNG & TÌNH TRẠNG KHO HÀNG */}
      <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <PriceTag price={finalPrice} originalPrice={finalOriginalPrice} size="xl" />
          <StockBadge stock={currentStock} />
        </div>

        {/* Tóm tắt cấu hình đang chọn */}
        <div className="text-xs text-slate-700 bg-white/80 rounded-xl p-2.5 border border-slate-200/60 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-900">Đang chọn:</span>
          <span>{selectedVariant ? selectedVariant.name : productName}</span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-blue-700">
            {selectedCondition === "NEW" ? "Mới 100%" : "Like New 99%"}
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-emerald-700">{currentWarranty.name}</span>
        </div>
      </div>

      {/* 5. THÔNG BÁO TOAST KHI THÊM VÀO GIỎ */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-sm flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <Link
            href="/cart"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
          >
            Xem giỏ hàng <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* 6. CHỌN SỐ LƯỢNG */}
      <div className="flex items-center gap-3">
        <label htmlFor="quantity-input" className="text-sm font-bold text-gray-700">
          Số lượng:
        </label>
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-2xs">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
            aria-label="Giảm số lượng"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            id="quantity-input"
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= maxQty) {
                setQuantity(val);
              }
            }}
            disabled={isOutOfStock}
            className="w-12 h-9 text-center text-sm font-bold text-gray-900 border-x border-gray-300 outline-none"
            aria-label="Số lượng sản phẩm"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty || isOutOfStock}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition cursor-pointer"
            aria-label="Tăng số lượng"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {!isOutOfStock && currentStock <= 5 && (
          <span className="text-xs text-amber-600 font-semibold">
            (Chỉ còn {currentStock} máy trong kho)
          </span>
        )}
      </div>

      {/* 7. NÚT HÀNH ĐỘNG MUA HÀNG (CTA BUTTONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-3.5 flex flex-col items-center justify-center transition shadow-md shadow-red-600/20 active:scale-[0.98] cursor-pointer"
        >
          <span className="font-black text-base uppercase flex items-center gap-1.5">
            <Zap className="w-4 h-4 fill-white" />
            {isOutOfStock ? "HẾT HÀNG" : "MUA NGAY"}
          </span>
          <span className="text-[11px] opacity-90 mt-0.5">
            {isOutOfStock ? "Tạm ngưng đặt hàng" : "Hỗ trợ giao hàng & kiểm tra máy"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-3.5 flex flex-col items-center justify-center transition shadow-md shadow-blue-600/20 active:scale-[0.98] cursor-pointer"
        >
          <span className="font-black text-base uppercase flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4" />
            {isOutOfStock ? "HẾT HÀNG" : "THÊM VÀO GIỎ"}
          </span>
          <span className="text-[11px] opacity-90 mt-0.5">
            {isOutOfStock ? "Vui lòng chọn cấu hình khác" : "Thêm vào giỏ và xem tiếp"}
          </span>
        </button>
      </div>

      {/* 8. HOTLINE & ZALO TƯ VẤN NHANH */}
      <div className="pt-2 flex gap-3">
        <a
          href={businessProfile.telHref}
          className="flex-1 flex items-center justify-center gap-2 border border-emerald-500/80 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl py-2.5 font-bold text-xs sm:text-sm transition shadow-2xs"
        >
          <Phone className="w-4 h-4 text-emerald-600" />
          <span>Hotline: {businessProfile.displayPhone}</span>
        </a>
        <a
          href={businessProfile.socialProfiles.zalo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 border border-blue-500/80 text-blue-700 bg-blue-50/40 hover:bg-blue-50 rounded-xl py-2.5 font-bold text-xs sm:text-sm transition shadow-2xs"
        >
          <MessageCircle className="w-4 h-4 text-blue-600" />
          <span>Chat Zalo tư vấn</span>
        </a>
      </div>

      {/* 9. CAM KẾT VẬN HÀNH & BẢO HÀNH */}
      <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60 space-y-2 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Giao hàng:</strong> Miễn phí nội thành 10km quanh Hà Nội, ship COD toàn quốc
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Đổi trả:</strong> Lỗi 1 đổi 1 trong 15 ngày đầu tiên nếu phát sinh lỗi phần cứng
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Bảo dưỡng:</strong> Vệ sinh, tra keo tản nhiệt và cài phần mềm trọn đời máy
          </span>
        </div>
      </div>

      {/* 10. STICKY MOBILE CTA BAR (Chỉ hiển thị trên Mobile, đồng bộ 100% với lựa chọn người dùng) */}
      <aside
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 z-40 md:hidden safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        aria-label="Thanh mua hàng di động"
      >
        <div className="flex items-center gap-2">
          {/* Nút Gọi Hotline */}
          <a
            href={businessProfile.telHref}
            className="flex flex-col items-center justify-center w-11 h-11 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition shrink-0 active:scale-95"
            aria-label={`Gọi điện hotline ${businessProfile.displayPhone}`}
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="text-[9px] font-bold mt-0.5">Gọi</span>
          </a>

          {/* Nút Chat Zalo */}
          <a
            href={businessProfile.socialProfiles.zalo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center w-11 h-11 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition shrink-0 active:scale-95"
            aria-label="Chat Zalo tư vấn"
          >
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="text-[9px] font-bold mt-0.5">Zalo</span>
          </a>

          {/* Nút Giỏ Hàng mini có Badge */}
          <Link
            href="/cart"
            className="relative flex flex-col items-center justify-center w-11 h-11 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition shrink-0 active:scale-95"
            aria-label="Xem giỏ hàng"
          >
            <ShoppingCart className="w-4 h-4 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-xs">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
            <span className="text-[9px] font-bold mt-0.5">Giỏ</span>
          </Link>

          {/* Nút THÊM VÀO GIỎ */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl h-11 font-bold text-xs transition flex flex-col items-center justify-center shadow-xs active:scale-95 cursor-pointer"
            aria-label="Thêm vào giỏ hàng"
          >
            <span className="leading-none uppercase font-extrabold text-[11px]">Thêm giỏ</span>
            <span className="text-[9px] opacity-85 mt-0.5 leading-none font-medium">
              {finalPrice.toLocaleString("vi-VN")}đ
            </span>
          </button>

          {/* Nút MUA NGAY */}
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl h-11 font-bold text-xs transition flex flex-col items-center justify-center shadow-xs active:scale-95 cursor-pointer"
            aria-label="Mua ngay sản phẩm"
          >
            <span className="leading-none uppercase font-extrabold text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 fill-white" />
              {isOutOfStock ? "HẾT HÀNG" : "MUA NGAY"}
            </span>
            <span className="text-[9px] opacity-85 mt-0.5 leading-none font-medium">
              Giao tận nơi
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
