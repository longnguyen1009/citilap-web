"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Phone, ShoppingCart, ShieldCheck, Scale } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCompare } from "@/context/CompareContext";
import { businessProfile } from "@/config/business-profile";
import type { ProductDocument } from "@/contracts/cms/product-studio";

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

const availabilityNames: Record<ProductDocument["availability"], string> = {
  AVAILABLE: "Nhận yêu cầu mua",
  PREORDER: "Nhận đặt trước",
  CONTACT: "Liên hệ tư vấn",
  UNAVAILABLE: "Tạm ngừng nhận đơn",
};

export default function StudioPurchaseSection({ studio, productId, image, selectedSku, phone=businessProfile.displayPhone }: StudioPurchaseSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const variantId = studio.variants.find((v) => v.sku === selectedSku || v.id === selectedSku)?.id || (selectedSku ? '' : studio.variants[0]?.id || '');
  const [warrantyIndex, setWarrantyIndex] = useState(() => Math.max(0, studio.warranties.findIndex((w) => w.recommended)));
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
  const price = Math.max(0, (variant?.price ?? studio.price) + (warranty?.adjustment ?? 0));
  // Order intake re-prices from Product/ProductVariant in D1 and has no warranty line item.
  // Keep an adjusted CMS warranty as a consultation request until that contract exists.
  const canAddToCart = studio.canOrder && (!studio.variants.length || !!variant) && (!variant?.availability || ['AVAILABLE','PREORDER'].includes(variant.availability)) && (!warranty || warranty.adjustment === 0);
  const originalPrice = studio.originalPrice !== null && !variant
    ? Math.max(price, studio.originalPrice + (warranty?.adjustment ?? 0))
    : null;

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

  const add = () => {
    if (!canAddToCart) return;
    addToCart({
      id: `${productId}-${variant?.id || "base"}-studio-w${warrantyIndex}`,
      productId,
      variantId: variant?.id,
      name: studio.name,
      image: image || "/images/placeholder-laptop.svg",
      price,
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      variantLabel: [variant?.name, variant && conditionNames[variant.condition], warranty?.name].filter(Boolean).join(" · "),
      quantity: 1,
    });
    setAdded(true);
  };

  return (
    <div className="space-y-6 pt-1">
      {conditions.length > 1 && <section aria-label="Tình trạng máy">
        <h2 className="text-sm font-bold text-slate-900 mb-3">1. TÌNH TRẠNG MÁY</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {conditions.map((condition) => <button key={condition} type="button"
            aria-pressed={condition === selectedCondition} onClick={() => selectCondition(condition)}
            className={`flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left font-semibold transition ${condition === selectedCondition ? "border-blue-600 bg-blue-50/40 text-blue-800" : "border-slate-200 text-slate-800 hover:border-blue-300"}`}>
            {conditionNames[condition]}
            {condition === selectedCondition && <Check className="w-4 h-4 shrink-0 text-blue-600" />}
          </button>)}
        </div>
      </section>}
      {studio.variants.length > 0 && <section aria-label="Chọn cấu hình">
        <h2 className="text-sm font-bold text-slate-900 mb-3">{conditions.length > 1 ? "2." : "1."} CHỌN CẤU HÌNH ({conditionVariants.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {conditionVariants.map((item) => {
            const optionValues = item.options ? Object.entries(item.options).map(([k, v]) => `${k}: ${v}`) : [];
            const specList = [item.ram, item.storage, item.gpu, ...optionValues].filter(Boolean);
            const specText = specList.length > 0 ? specList.join(" · ") : conditionNames[item.condition];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectVariant(item)}
                aria-pressed={item.id === variantId}
                className={`relative text-left rounded-xl border-2 p-4 transition ${
                  item.id === variantId ? "border-blue-600 bg-blue-50/40" : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm text-slate-900">{item.name || item.sku}</strong>
                  {item.id === variantId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">{specText}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-bold text-red-600">{item.availability === 'CONTACT' ? 'Liên hệ báo giá' : `${item.price.toLocaleString("vi-VN")}đ`}</span>
                  {item.availability && item.availability !== "AVAILABLE" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {availabilityNames[item.availability]}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>}

      {studio.warranties.length > 0 && <section aria-label="Chọn bảo hành">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />{(conditions.length > 1 ? 1 : 0) + (studio.variants.length ? 1 : 0) + 1}. CHỌN GÓI BẢO HÀNH</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {studio.warranties.map((item, index) => <button key={`${item.name}-${index}`} type="button" aria-pressed={index === warrantyIndex} onClick={() => { setWarrantyIndex(index); setAdded(false); }}
            className={`rounded-xl border-2 text-left p-4 transition ${index === warrantyIndex ? "border-blue-600 bg-blue-50/40" : "border-slate-200 hover:border-blue-300"}`}>
            <span className="flex justify-between items-center gap-2 text-sm font-bold text-slate-900">{item.name}{index === warrantyIndex && <Check className="w-4 h-4 text-blue-600" />}</span>
            {item.description && <p className="text-xs text-slate-500 mt-2">{item.description}</p>}
            <p className={`mt-3 text-sm font-semibold ${item.adjustment <= 0 ? "text-emerald-600" : "text-slate-700"}`}>
              {item.adjustment === 0 ? "Đã bao gồm" : `${item.adjustment > 0 ? "+" : ""}${item.adjustment.toLocaleString("vi-VN")}đ`}
            </p>
            {item.recommended && <span className="inline-block mt-2 text-[10px] font-semibold text-blue-700">Khuyên dùng</span>}
          </button>)}
        </div>
        <div className="mt-2 text-right">
          <Link
            href="/chinh-sach-bao-hanh"
            className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
          >
            Xem quy định & chính sách bảo hành chi tiết →
          </Link>
        </div>
      </section>}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <strong className="text-2xl font-black text-red-600">{studio.availability === 'CONTACT' && price === 0 ? 'Liên hệ báo giá' : `${price.toLocaleString("vi-VN")}đ`}</strong>
          {originalPrice !== null && originalPrice > price && <span className="text-sm text-slate-400 line-through">{originalPrice.toLocaleString("vi-VN")}đ</span>}
        </div>
        {studio.availability === 'CONTACT' && price > 0 && <p className="mt-2 text-sm text-slate-600">Giá tham khảo; xác nhận giá và hàng trước khi mua.</p>}
        <p className="text-sm mt-2 text-slate-600" role="status">{availabilityNames[studio.availability]}</p>
      </div>

      {studio.canOrder && warranty && warranty.adjustment !== 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Gói bảo hành này có điều chỉnh giá. Vui lòng liên hệ CitiLap để xác nhận tổng giá trước khi gửi yêu cầu mua.
      </p>}
      {canAddToCart ? <div className="space-y-2">
        <button type="button" onClick={add} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold transition cursor-pointer">
          <ShoppingCart className="w-5 h-5" />{studio.availability === "PREORDER" ? "Thêm yêu cầu đặt trước" : "Thêm vào giỏ yêu cầu"}
        </button>
        {added && <p role="status" className="text-sm text-emerald-700">Đã thêm vào giỏ. <Link href="/cart" className="font-semibold underline">Xem giỏ hàng</Link></p>}
      </div> : !studio.canOrder ? <p className="text-sm text-slate-600">Sản phẩm hiện chỉ tiếp nhận tư vấn hoặc đang tạm ngừng nhận đơn.</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggleCompare}
          className={`flex items-center justify-center gap-2 flex-1 border-2 py-3 font-semibold rounded-xl transition cursor-pointer ${
            inCompare
              ? "border-blue-600 bg-blue-50 text-blue-800"
              : "border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{inCompare ? "Đang so sánh" : "Thêm vào so sánh"}</span>
        </button>
        <a
          href={`tel:${phone.replace(/\s+/g,'')}`}
          className="flex items-center justify-center gap-2 flex-1 border-2 border-blue-600 text-blue-700 hover:bg-blue-50 rounded-xl py-3 font-semibold"
        >
          <Phone className="w-4 h-4" />
          <span>Tư vấn: {phone}</span>
        </a>
      </div>
    </div>
  );
}
