"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Phone, ShoppingCart, ShieldCheck, Scale, Gift, CreditCard, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCompare } from "@/context/CompareContext";
import { businessProfile } from "@/config/business-profile";
import type { ProductDocument } from "@/contracts/cms/product-studio";
import InstallmentCalculatorModal from "./InstallmentCalculatorModal";

type StudioPurchaseSectionProps = {
  studio: Omit<ProductDocument, "media"> & { canOrder: boolean };
  productId: string;
  image: string;
  selectedSku?: string;
  phone?: string;
};

const conditionNames: Record<ProductDocument["variants"][number]["condition"], string> = {
  NEW: "Mới 100%",
  LIKE_NEW: "Like New",
  USED: "Đã qua sử dụng",
  REFURBISHED: "Tân trang",
};

export default function StudioPurchaseSection({
  studio,
  productId,
  image,
  selectedSku,
  phone = businessProfile.displayPhone,
}: StudioPurchaseSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);

  const variantId =
    studio.variants.find((v) => v.sku === selectedSku || v.id === selectedSku)?.id ||
    (selectedSku ? "" : studio.variants[0]?.id || "");
  const [warrantyIndex, setWarrantyIndex] = useState(() =>
    Math.max(0, studio.warranties.findIndex((w) => w.recommended))
  );
  const [added, setAdded] = useState(false);

  const inCompare = isInCompare(productId);
  const toggleCompare = () => {
    if (inCompare) {
      removeFromCompare(productId);
    } else {
      const res = addToCompare({
        id: productId,
        name: studio.name,
        slug: studio.slug || productId,
        price: variant?.price ?? studio.price,
        image,
        kind: studio.template === "LAPTOP" ? "LAPTOP" : "ACCESSORY",
        template: studio.template,
      });
      if (!res.success && res.message) {
        alert(res.message);
      }
    }
  };

  const variant = studio.variants.find((v) => v.id === variantId);
  const warranty = studio.warranties[warrantyIndex];
  const conditions = Array.from(new Set(studio.variants.map((item) => item.condition)));
  const selectedCondition = variant?.condition || conditions[0];
  const conditionVariants = studio.variants.filter((item) => item.condition === selectedCondition);

  // Price calculations
  const price = Math.max(0, (variant?.price ?? studio.price) + (warranty?.adjustment ?? 0));
  const canAddToCart =
    studio.canOrder &&
    (!studio.variants.length || !!variant) &&
    (!variant?.availability || ["AVAILABLE", "PREORDER"].includes(variant.availability)) &&
    (!warranty || warranty.adjustment === 0);
  const originalPrice =
    studio.originalPrice !== null && !variant
      ? Math.max(price, studio.originalPrice + (warranty?.adjustment ?? 0))
      : variant?.originalPrice
      ? Math.max(price, variant.originalPrice + (warranty?.adjustment ?? 0))
      : null;

  const saving = originalPrice && originalPrice > price ? originalPrice - price : null;
  const installmentMonthly = Math.round(price / 12);
  const effectiveWarrantyName = warranty?.name || (studio.warranties[0]?.name) || "Bảo hành 3 tháng tiêu chuẩn";

  const selectVariant = (next: ProductDocument["variants"][number]) => {
    setAdded(false);
    const query = new URLSearchParams(searchParams.toString());
    query.set("sku", next.sku);
    query.delete("variant");
    router.replace(`${pathname}?${query}`, { scroll: false });
  };

  const selectCondition = (condition: ProductDocument["variants"][number]["condition"]) => {
    const firstVariant = studio.variants.find((item) => item.condition === condition);
    if (firstVariant) selectVariant(firstVariant);
  };

  const add = (redirectCart = false) => {
    if (!canAddToCart) return;
    addToCart({
      slug: studio.slug,
      template: studio.template,
      id: `${productId}-${variant?.id || "base"}-studio-w${warrantyIndex}`,
      productId,
      variantId: variant?.id,
      name: studio.name,
      image: image || "/images/placeholder-laptop.svg",
      price,
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      variantLabel: [
        variant?.name,
        variant && conditionNames[variant.condition],
        warranty?.name,
      ]
        .filter(Boolean)
        .join(" · "),
      quantity: 1,
    });
    if (redirectCart) {
      router.push("/cart");
    } else {
      setAdded(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. KHỐI GIÁ NẰM NGAY TRÊN ĐẦU, DỄ THEO DÕI NHẤT (CHUẨN THẾ GIỚI SỐ 365) */}
      <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/50 p-4 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                🔥 GIÁ KHUYẾN MÃI HÔM NAY
              </span>
              <span className="text-[11px] text-gray-500 font-medium">(Đã bao gồm VAT)</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {price.toLocaleString("vi-VN")}₫
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-sm sm:text-base text-gray-400 line-through">
                  {originalPrice.toLocaleString("vi-VN")}₫
                </span>
              )}
              {saving && saving > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs">
                  Tiết kiệm {saving.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
            <span className="text-xs font-semibold text-gray-700 block">
              Trả góp 0% chỉ từ:
            </span>
            <span className="text-sm font-black text-blue-600 block">
              {installmentMonthly.toLocaleString("vi-VN")}₫ / tháng
            </span>
            <button
              type="button"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="text-[11px] text-blue-600 hover:underline font-bold mt-0.5 inline-block cursor-pointer"
            >
              Bảng tính góp chi tiết →
            </button>
          </div>
        </div>

        {/* Tóm tắt cấu hình đang chọn */}
        <div className="mt-3 pt-3 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-700">
            <span className="font-bold text-gray-900">Đang chọn:</span>
            <span className="font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-gray-200">
              {variant?.name || studio.name}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {effectiveWarrantyName}
          </span>
        </div>
      </div>

      {/* 2. CHỌN TÌNH TRẠNG MÁY (CHỈ HIỆN KHI CÓ NHIỀU HƠN 1 TÌNH TRẠNG) */}
      {conditions.length > 1 && (
        <section aria-label="Tình trạng máy" className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-gray-900 block">
            CHỌN TÌNH TRẠNG MÁY:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {conditions.map((condition) => (
              <button
                key={condition}
                type="button"
                aria-pressed={condition === selectedCondition}
                onClick={() => selectCondition(condition)}
                className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition cursor-pointer ${
                  condition === selectedCondition
                    ? "border-blue-600 bg-blue-50/60 font-bold text-blue-900"
                    : "border-gray-200 text-gray-800 hover:border-gray-300"
                }`}
              >
                <span>{conditionNames[condition]}</span>
                {condition === selectedCondition && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. CHỌN CẤU HÌNH THEO DẠNG CARD 365 (CHỈ HIỆN KHI CÓ NHIỀU HƠN 1 CẤU HÌNH) */}
      {conditionVariants.length > 1 && (
        <section aria-label="Chọn cấu hình" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">1</span>
              <span>CHỌN CẤU HÌNH PHẦN CỨNG ({conditionVariants.length}):</span>
            </label>
            <span className="text-[11px] text-gray-400 font-medium">Bấm chọn đổi giá tức thì</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {conditionVariants.map((item) => {
              const isSelected = item.id === variantId;
              const optionValues = item.options
                ? Object.entries(item.options).map(([k, v]) => `${k}: ${v}`)
                : [];
              const specList = [item.ram, item.storage, item.gpu, ...optionValues].filter(Boolean);
              const specText = specList.length > 0 ? specList.join(" · ") : conditionNames[item.condition];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectVariant(item)}
                  aria-pressed={isSelected}
                  className={`relative text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/40 text-blue-950 shadow-xs ring-2 ring-blue-500/25"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50 text-gray-800"
                  }`}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <span
                      className="absolute top-2.5 right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-black shadow-2xs"
                      aria-hidden="true"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  <div>
                    <span
                      className={`text-xs sm:text-sm font-black uppercase tracking-tight block pr-6 ${
                        isSelected ? "text-blue-950" : "text-gray-900"
                      }`}
                    >
                      {item.name || item.sku}
                    </span>
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-medium">
                      {specText}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-gray-200/70 flex items-baseline justify-between">
                    <span className="text-xs sm:text-sm font-black text-rose-600">
                      {item.availability === "CONTACT"
                        ? "Liên hệ báo giá"
                        : `${item.price.toLocaleString("vi-VN")}₫`}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">
                        {item.originalPrice.toLocaleString("vi-VN")}₫
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. CHỌN GÓI BẢO HÀNH (CHỈ HIỆN KHI CÓ NHIỀU HƠN 1 GÓI ĐỂ CHỌN) */}
      {studio.warranties.length > 1 && (
        <section aria-label="Chọn bảo hành" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">2</span>
              <span>CHỌN GÓI BẢO HÀNH & AN TÂM SỬ DỤNG:</span>
            </label>
            <Link
              href="/chinh-sach-bao-hanh"
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Chi tiết điều khoản BH →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {studio.warranties.map((item, index) => {
              const isSelected = index === warrantyIndex;
              return (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setWarrantyIndex(index);
                    setAdded(false);
                  }}
                  className={`rounded-2xl border-2 text-left p-3 transition flex flex-col justify-between cursor-pointer select-none ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-2xs ring-2 ring-emerald-500/20"
                      : "border-gray-200 bg-white hover:border-emerald-400 text-gray-800"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className={`text-xs font-black ${isSelected ? "text-emerald-950" : "text-gray-900"}`}>
                        {item.name}
                      </span>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-black shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[10.5px] text-gray-500 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-200/70 flex items-center justify-between">
                    <span className={`text-xs font-bold ${item.adjustment <= 0 ? "text-emerald-700" : "text-gray-900"}`}>
                      {item.adjustment === 0
                        ? "Đã bao gồm"
                        : `${item.adjustment > 0 ? "+" : ""}${item.adjustment.toLocaleString("vi-VN")}₫`}
                    </span>
                    {item.recommended && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Khuyên dùng ⭐
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. KHỐI QUÀ TẶNG KÈM THEO MÁY */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 to-orange-50/30 p-4 space-y-2 relative">
        <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wide">
          <Gift className="w-4 h-4 text-rose-600" />
          <span>QUÀ TẶNG KÈM THEO MÁY (TRỊ GIÁ ĐẾN 1.250.000₫):</span>
        </div>
        <ul className="space-y-1.5 text-xs text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-rose-600 font-bold shrink-0">●</span>
            <span>Tặng <strong>Balo Gaming / Công sở cao cấp</strong> chống sốc chống nước (trị giá 450.000₫).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-600 font-bold shrink-0">●</span>
            <span>Tặng <strong>Chuột quang không dây Silent</strong> + Bàn di chuột Speed CitiLap (trị giá 250.000₫).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-600 font-bold shrink-0">●</span>
            <span>Tặng gói <strong>Cài đặt hệ điều hành, Office và vệ sinh, tra keo tản nhiệt</strong> trọn đời máy.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-600 font-bold shrink-0">●</span>
            <span className="text-rose-700 font-semibold">Giảm thêm 300.000₫ cho Học sinh - Sinh viên khi xuất trình thẻ HSSV tại cửa hàng.</span>
          </li>
        </ul>
      </div>

      {/* 6. CỤM NÚT HÀNH ĐỘNG MUA HÀNG (TO RÕ, RẤT DỄ BẤM TRÊN MỌI THIẾT BỊ) */}
      <div className="space-y-2.5 pt-1">
        {/* Nút Hero Mua Ngay */}
        <button
          type="button"
          disabled={!canAddToCart}
          onClick={() => add(true)}
          className="w-full flex flex-col items-center justify-center py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black shadow-lg shadow-rose-600/25 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex items-center gap-2 text-base sm:text-lg">
            <ShoppingCart className="w-5 h-5" />
            <span>MUA NGAY - GIAO TẬN NƠI HOẶC NHẬN TẠI SHOP</span>
          </div>
          <span className="text-[11px] font-normal text-rose-100 mt-0.5">
            Kiểm tra máy chuẩn 100%, hài lòng mới thanh toán
          </span>
        </button>

        {/* 2 Nút phụ: Trả góp & Thêm vào giỏ */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsInstallmentModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-100/70 text-blue-800 transition cursor-pointer"
          >
            <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" /> TRẢ GÓP 0% QUA THẺ
            </span>
            <span className="text-[10px] text-blue-600">Thủ tục chỉ mất 3 phút</span>
          </button>

          <button
            type="button"
            disabled={!canAddToCart}
            onClick={() => add(false)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 transition cursor-pointer font-bold text-xs sm:text-sm disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            <span>THÊM VÀO GIỎ</span>
          </button>
        </div>

        {/* Thông báo thêm giỏ hàng thành công */}
        {added && (
          <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
            <span>Đã thêm vào giỏ hàng thành công!</span>
            <Link href="/cart" className="font-bold underline shrink-0 hover:text-emerald-900">
              Xem giỏ hàng →
            </Link>
          </div>
        )}

        {/* Hàng nút So sánh & Hotline */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={toggleCompare}
            className={`flex items-center justify-center gap-2 flex-1 border-2 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
              inCompare
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-gray-200 hover:border-blue-600 text-gray-700 hover:text-blue-600"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{inCompare ? "Đang so sánh" : "So sánh máy"}</span>
          </button>

          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="flex items-center justify-center gap-2 flex-1 border-2 border-emerald-600 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-100/60 rounded-xl py-2.5 text-xs font-bold transition"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Tư vấn: {phone}</span>
          </a>
        </div>
      </div>

      {/* Modal Trả Góp 0% */}
      <InstallmentCalculatorModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        productName={studio.name}
        price={price}
      />
    </div>
  );
}
