"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import {
  Check,
  Gift,
  Phone,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Heart,
  Scale,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useOptionalWishlist } from "@/context/WishlistContext";
import { useOptionalCompare } from "@/context/CompareContext";
import { businessProfile } from "@/config/business-profile";
import ProductGallery from "./ProductGallery";
import ProductTrustBadges from "./ProductTrustBadges";
import ProductAccessoriesCombo, {
  type AccessoryItem,
} from "./ProductAccessoriesCombo";
import ProductQuickCheckoutModal from "./ProductQuickCheckoutModal";
import ProductFloatingBar from "./ProductFloatingBar";
import InstallmentCalculatorModal from "./InstallmentCalculatorModal";
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';

export interface HeroVariantItem {
  id: string;
  sku: string;
  name: string;
  subSpecs?: string;
  price: number;
  originalPrice?: number | null;
  tag?: string;
  condition?: string;
  conditionLabel?: string;
  cpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  gpu?: string | null;
  display?: string | null;
  canOrder?: boolean;
  color?: string;
  colorHex?: string;
}

export interface HeroColorItem {
  id: string;
  name: string;
  hex: string;
  priceDiff: number;
  previewImg?: string;
}

export interface HeroWarrantyItem {
  id: string;
  name: string;
  desc?: string;
  priceDiff: number;
  tag?: string;
  isDefault?: boolean;
}

export interface ProductHeroSectionProps {
  productId: string;
  productSlug: string;
  productName: string;
  modelCode: string;
  brandName: string;
  images: Array<{ url: string; alt?: string | null; isPrimary?: boolean; variantId?: string | null }>;
  coverImage: string;
  discountBadge?: string;
  conditionLabel?: string;
  basePrice: number;
  baseOriginalPrice?: number | null;
  variants: HeroVariantItem[];
  selectedSku?: string;
  colors?: HeroColorItem[];
  warranties?: HeroWarrantyItem[];
  phone?: string;
  canOrder?: boolean;
  accessories?: AccessoryItem[];
  gifts?: string[];
  settings?: PublicStorefrontSettings | null;
  reviewCount?: number;
  averageRating?: string;
}

export default function ProductHeroSection({
  productId,
  productSlug,
  productName,
  modelCode,
  brandName,
  images,
  coverImage,
  discountBadge,
  conditionLabel = "Mới 100% Fullbox",
  basePrice,
  baseOriginalPrice,
  variants,
  selectedSku,
  colors = [],
  warranties = [],
  phone = businessProfile.displayPhone,
  canOrder = true,
  accessories = [],
  gifts = [],
  settings,
  reviewCount = 32,
  averageRating = "4.9",
}: ProductHeroSectionProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const wishlistCtx = useOptionalWishlist();
  const compareCtx = useOptionalCompare();
  const isLiked = wishlistCtx?.isInWishlist(productId) ?? false;
  const isInCompare = compareCtx?.isInCompare(productId) ?? false;

  // 1. Variant state
  const initialVariant =
    variants.find((v) => v.sku === selectedSku || v.id === selectedSku) ||
    variants[0] ||
    null;
  const [selectedVariant, setSelectedVariant] = useState<HeroVariantItem | null>(initialVariant);

  // 2. Color state
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const variantColors: HeroColorItem[] = variants.filter(v => v.color).filter((v,index,list) => list.findIndex(item => item.color === v.color) === index).map(v => ({id:v.id,name:v.color!,hex:v.colorHex || '#94a3b8',priceDiff:0}));
  const colorOptions = variantColors.length ? variantColors : colors;
  const selectedColor = variantColors.length ? colorOptions.find(color => color.name === selectedVariant?.color) || null : colorOptions[selectedColorIndex] || null;

  // 3. Warranty state
  const [selectedWarrantyIndex, setSelectedWarrantyIndex] = useState(() => {
    const defaultIdx = warranties.findIndex((w) => w.isDefault);
    return defaultIdx >= 0 ? defaultIdx : 0;
  });
  const selectedWarranty = warranties.length > 0 ? warranties[selectedWarrantyIndex] : null;

  // 4. Deal accessories state
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const toggleAccessory = (accId: string) => {
    setSelectedAccessoryIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  // 5. Modals & Notifications
  const [isQuickCheckoutOpen, setIsQuickCheckoutOpen] = useState(false);
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [cartSuccessMsg, setCartSuccessMsg] = useState("");

  // Price calculations
  const variantPrice = selectedVariant?.price ?? basePrice;
  const variantOriginalPrice = selectedVariant ? selectedVariant.originalPrice ?? null : baseOriginalPrice ?? null;
  const colorDiff = selectedColor?.priceDiff ?? 0;
  const warrantyDiff = selectedWarranty?.priceDiff ?? 0;
  const accessoriesTotal = selectedAccessoryIds.reduce((sum, id) => {
    const item = accessories.find((a) => a.id === id);
    return sum + (item?.salePrice ?? 0);
  }, 0);

  const totalPrice = variantPrice + colorDiff + warrantyDiff + accessoriesTotal;
  const totalOriginalPrice = variantOriginalPrice
    ? variantOriginalPrice + colorDiff + warrantyDiff + accessoriesTotal
    : null;
  const saving = totalOriginalPrice && totalOriginalPrice > totalPrice ? totalOriginalPrice - totalPrice : null;
  const orderable = canOrder && selectedVariant?.canOrder !== false;

  // Display Image (swaps if color has previewImg)
  const activeImage = selectedColor?.previewImg || images.find(image => image.variantId && image.variantId === selectedVariant?.id)?.url || coverImage || images[0]?.url || "";

  // Switch Variant
  const handleSelectVariant = (v: HeroVariantItem) => {
    setSelectedVariant(v);
    setCartSuccessMsg("");
    if (v.sku) {
      const url = new URL(window.location.href);
      url.searchParams.set("sku", v.sku);
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
  };

  // Add to Cart handler
  const handleAddToCart = (redirect = false) => {
    if (!orderable) return;

    addToCart({
      slug: productSlug,
      template: "LAPTOP",
      id: `${productId}-${selectedVariant?.id || "base"}-c${selectedColorIndex}-w${selectedWarrantyIndex}`,
      productId,
      variantId: selectedVariant?.id,
      warrantyName: selectedWarranty?.name,
      name: productName,
      image: activeImage,
      price: variantPrice + warrantyDiff,
      displayPrice: `${(variantPrice + warrantyDiff).toLocaleString("vi-VN")}₫`,
      variantLabel: [
        selectedVariant?.name,
        selectedColor?.name,
        selectedWarranty?.name,
      ]
        .filter(Boolean)
        .join(" | "),
      quantity: 1,
      maxQuantity: 5,
    });
    for (const accessory of accessories.filter(item => selectedAccessoryIds.includes(item.id))) {
      addToCart({id:JSON.stringify([accessory.id,accessory.variantId || '']),productId:accessory.id,variantId:accessory.variantId,name:accessory.name,image:accessory.image,price:accessory.salePrice,displayPrice:accessory.salePrice.toLocaleString('vi-VN')+'₫',quantity:1,maxQuantity:5});
    }

    if (redirect) {
      router.push('/cart');
    } else {
      setCartSuccessMsg("Đã thêm sản phẩm vào giỏ hàng thành công!");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* ========================================================= */}
        {/* CỘT TRÁI (COL 6): GALLERY ẢNH, ĐẶC QUYỀN AN TÂM, DEAL SỐC */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Gallery */}
          <ProductGallery
            images={images}
            productName={productName}
            discount={discountBadge}
            conditionLabel={selectedVariant?.conditionLabel || conditionLabel}
            inStock={orderable}
            selectedImage={activeImage}
          />

          {/* Đặc quyền an tâm khi mua tại CitiLap */}
          <ProductTrustBadges items={settings?.productTrustItems} />

          {/* Mua kèm Deal sốc (Cross-sell combo - TÍNH TIỀN THẬT VÀO TỔNG) */}
          <ProductAccessoriesCombo
            accessories={accessories}
            selectedIds={selectedAccessoryIds}
            onToggle={toggleAccessory}
          />
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI (COL 6): TIÊU ĐỀ, GIÁ, CARD 365 CẤU HÌNH, MÀU, BH, CTA */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          {/* 1. TIÊU ĐỀ SẢN PHẨM & METADATA (ĐÁNH GIÁ, MODEL, THƯƠNG HIỆU) */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
              {productName}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-slate-600">
              <a
                href="#danh-gia-khach-hang"
                className="flex items-center gap-1 text-amber-500 font-bold hover:underline"
              >
                <span>★★★★★</span>
                <span className="text-slate-800 ml-0.5">{averageRating}</span>
                <span className="text-slate-500 font-normal">({reviewCount} đánh giá)</span>
              </a>
              <span className="text-slate-300">•</span>
              <span>
                Mã model:{" "}
                <strong className="text-slate-800 font-semibold font-mono">
                  {modelCode}
                </strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Thương hiệu:{" "}
                <strong className="text-blue-600 font-semibold">{brandName}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <a
                href="#thong-so-ky-thuat"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("citilap:open-full-specs"));
                  }
                }}
                className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Xem cấu hình chi tiết
              </a>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!wishlistCtx) return;
                    if (isLiked) wishlistCtx.removeFromWishlist(productId);
                    else wishlistCtx.addToWishlist({ productId });
                  }}
                  aria-pressed={isLiked}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition cursor-pointer ${
                    isLiked
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} />
                  <span>{isLiked ? "Đã lưu" : "Yêu thích"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!compareCtx) return;
                    if (isInCompare) {
                      compareCtx.removeFromCompare(productId);
                    } else {
                      const res = compareCtx.addToCompare({
                        id: productId,
                        name: productName,
                        slug: productSlug || productId,
                        price: totalPrice,
                        image: activeImage,
                      });
                      if (!res.success && res.message) alert(res.message);
                    }
                  }}
                  aria-pressed={isInCompare}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold transition cursor-pointer ${
                    isInCompare
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-500 hover:text-blue-600"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isInCompare ? "Đang so sánh" : "So sánh"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. KHỐI GIÁ NẰM TRÊN ĐẦU (DỄ THEO DÕI NHẤT) */}
          <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/50 p-4 shadow-xs relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-xs font-black uppercase tracking-wider animate-pulse">
                  {saving ? 'GIÁ ƯU ĐÃI' : 'GIÁ BÁN'}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                  {totalPrice.toLocaleString("vi-VN")}₫
                </span>
                {totalOriginalPrice && totalOriginalPrice > totalPrice && (
                  <span className="text-sm sm:text-base text-slate-400 line-through">
                    {totalOriginalPrice.toLocaleString("vi-VN")}₫
                  </span>
                )}
                {saving && saving > 0 && (
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs whitespace-nowrap">
                    Tiết kiệm {saving.toLocaleString("vi-VN")}₫
                  </span>
                )}
              </div>
            </div>

            {/* Tóm tắt cấu hình đang chọn */}
            <div className="mt-3 pt-3 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 text-slate-700 flex-wrap">
                <span className="font-bold text-slate-900">Đang chọn:</span>
                <span className="font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  {selectedVariant?.name || productName}
                </span>
                {selectedColor && (
                  <span className="font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    {selectedColor.name}
                  </span>
                )}
              </div>
              {selectedWarranty && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {selectedWarranty.name}
                </span>
              )}
            </div>
          </div>

          {/* 3. CHỌN CẤU HÌNH CARD 365 (ẨN NẾU <= 1 OPTION) */}
          {variants.length > 1 && (
            <section aria-label="Chọn cấu hình" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
                  <span>CHỌN CẤU HÌNH PHẦN CỨNG ({variants.length}):</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">Bấm chọn đổi giá tức thì</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {variants.map((item) => {
                  const isSelected = item.id === selectedVariant?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectVariant(item)}
                      aria-pressed={isSelected}
                      className={`relative text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/40 text-blue-950 shadow-xs ring-2 ring-blue-500/25"
                          : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/60 text-slate-800"
                      }`}
                    >
                      {/* Checkmark badge */}
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-black shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}

                      {/* Tag badge */}
                      {item.tag && (
                        <span className="absolute -top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-bold shadow-xs">
                          {item.tag}
                        </span>
                      )}

                      <div>
                        <span className={`text-xs sm:text-sm font-black uppercase tracking-tight block pr-6 ${
                          isSelected ? "text-blue-950" : "text-slate-900"
                        }`}>
                          {item.name}
                        </span>
                        {item.subSpecs && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium">
                            {item.subSpecs}
                          </p>
                        )}
                      </div>

                      <div className="pt-2.5 mt-2.5 border-t border-slate-200/70 flex items-baseline justify-between">
                        <span className="text-sm font-black text-rose-600">
                          {item.price.toLocaleString("vi-VN")}₫
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-slate-400 line-through">
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

          {/* 4. CHỌN MÀU SẮC CARD 365 (ẨN NẾU <= 1 OPTION) */}
          {colorOptions.length > 1 && (
            <section aria-label="Chọn màu sắc" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold">2</span>
                  <span>CHỌN MÀU SẮC PHIÊN BẢN ({colorOptions.length}):</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">Đổi hình ảnh & phối màu</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {colorOptions.map((c, idx) => {
                  const isSelected = c.name === selectedColor?.name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {const variant = variants.find(v => v.color === c.name && v.subSpecs === selectedVariant?.subSpecs) || variants.find(v => v.color === c.name);if (variantColors.length && variant) handleSelectVariant(variant);else setSelectedColorIndex(idx);}}
                      className={`relative flex items-center justify-between p-3 rounded-2xl border-2 transition cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 font-bold text-blue-950 ring-2 ring-blue-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs sm:text-sm font-semibold truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.priceDiff > 0 && (
                          <span className="text-xs font-bold text-rose-600">
                            +{c.priceDiff.toLocaleString("vi-VN")}₫
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. CHỌN GÓI BẢO HÀNH CARD 365 (ẨN NẾU <= 1 OPTION) */}
          {warranties.length > 1 && (
            <section aria-label="Chọn bảo hành" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">3</span>
                  <span>CHỌN GÓI BẢO HÀNH & AN TÂM SỬ DỤNG:</span>
                </label>
                <Link
                  href="/chinh-sach-bao-hanh"
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Chi tiết điều khoản BH →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {warranties.map((w, idx) => {
                  const isSelected = idx === selectedWarrantyIndex;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWarrantyIndex(idx)}
                      className={`relative rounded-2xl border-2 text-left p-3 transition flex flex-col justify-between cursor-pointer select-none ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-2xs ring-2 ring-emerald-500/20"
                          : "border-slate-200 bg-white hover:border-emerald-400 text-slate-800"
                      }`}
                    >
                      {/* Tag badge */}
                      {w.tag && (
                        <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                          {w.tag}
                        </span>
                      )}

                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className={`text-xs sm:text-sm font-black ${isSelected ? "text-emerald-950" : "text-slate-900"}`}>
                            {w.name}
                          </span>
                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        {w.desc && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-tight">
                            {w.desc}
                          </p>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                        <span className={`text-xs sm:text-sm font-bold ${w.priceDiff <= 0 ? "text-emerald-700" : "text-slate-900"}`}>
                          {w.priceDiff === 0 ? "Mặc định (0₫)" : `${w.priceDiff > 0 ? '+' : ''}${w.priceDiff.toLocaleString("vi-VN")}₫`}
                        </span>
                        {isSelected && (
                          <span className="text-xs text-emerald-700 font-bold">Đã chọn</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 6. KHỐI QUÀ TẶNG KÈM THEO MÁY */}
          {gifts.length > 0 && <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 to-orange-50/30 p-4 space-y-2 relative">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
              <Gift className="w-4 h-4 text-rose-600" />
              <span>QUÀ TẶNG KÈM THEO MÁY:</span>
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700">
              {gifts.map((gift, index) => <li key={index} className="flex items-start gap-2"><span className="text-rose-600 font-bold shrink-0">●</span><span>{gift}</span></li>)}
            </ul>
          </div>}

          {/* 7. CỤM NÚT HÀNH ĐỘNG MUA HÀNG */}
          <div className="space-y-2.5 pt-1">
            {/* Nút Hero Mua Ngay (MỞ MODAL ĐẶT HÀNG NHANH) */}
            <button
              type="button"
              onClick={() => orderable && setIsQuickCheckoutOpen(true)}
              disabled={!orderable}
              className="w-full flex flex-col items-center justify-center py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black shadow-lg shadow-rose-600/25 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5" />
                <span>{orderable ? 'MUA NGAY - GIAO TẬN NƠI HOẶC NHẬN TẠI SHOP' : 'LIÊN HỆ ĐỂ ĐƯỢC TƯ VẤN'}</span>
              </div>
              <span className="text-xs font-normal text-rose-100 mt-0.5">
                Kiểm tra máy chuẩn 100%, hài lòng mới thanh toán
              </span>
            </button>

            {/* 2 Nút phụ: Trả góp & Thêm vào giỏ */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsInstallmentOpen(true)}
                className="flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-100/70 text-blue-800 transition cursor-pointer"
              >
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> TƯ VẤN TRẢ GÓP
                </span>
                <span className="text-xs text-blue-600">Xem dự toán và gửi yêu cầu</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddToCart(false)}
                disabled={!orderable}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 transition cursor-pointer font-bold text-xs sm:text-sm"
              >
                <ShoppingCart className="w-4 h-4 text-slate-600" />
                <span>THÊM VÀO GIỎ</span>
              </button>
            </div>

            {/* Thông báo thêm giỏ hàng thành công */}
            {cartSuccessMsg && (
              <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between gap-2">
                <span>{cartSuccessMsg}</span>
                <Link href="/cart" className="font-bold underline shrink-0 hover:text-emerald-900 inline-flex items-center gap-0.5">
                  Xem giỏ hàng <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Hotline tư vấn */}
            <div className="flex items-center justify-center gap-2 pt-1 text-xs sm:text-sm text-slate-600">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>
                Tư vấn kỹ thuật & cấu hình riêng:{" "}
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="text-blue-600 font-bold hover:underline">
                  {phone}
                </a>{" "}
                (Zalo / Miễn phí)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FLOATING BOTTOM PURCHASE BAR (KHI CUỘN XUỐNG DƯỚI)        */}
      {/* ========================================================= */}
      {orderable && <ProductFloatingBar
        productName={productName}
        image={activeImage}
        variantLabel={selectedVariant?.name}
        colorLabel={selectedColor?.name}
        totalPrice={totalPrice}
        onAddToCart={() => handleAddToCart(false)}
        onBuyNow={() => setIsQuickCheckoutOpen(true)}
      />}

      {/* ========================================================= */}
      {/* MODAL 1: ĐẶT HÀNG NHANH 1 PHÚT                             */}
      {/* ========================================================= */}
      {isQuickCheckoutOpen && <ProductQuickCheckoutModal
        isOpen={isQuickCheckoutOpen}
        onClose={() => setIsQuickCheckoutOpen(false)}
        productInfo={{
          id: productId,
          items: [{productId,variantId:selectedVariant?.id || null,warrantyName:selectedWarranty?.name || null,quantity:1}, ...accessories.filter(item => selectedAccessoryIds.includes(item.id)).map(item => ({productId:item.id,variantId:item.variantId || null,quantity:1}))],
          name: productName,
          image: activeImage,
          variantLabel: selectedVariant?.name,
          colorLabel: selectedColor?.name,
          warrantyLabel: selectedWarranty?.name,
          accessoriesLabels: selectedAccessoryIds
            .map((id) => accessories.find((a) => a.id === id)?.name)
            .filter(Boolean) as string[],
          totalPrice,
        }}
      />}

      {/* ========================================================= */}
      {/* MODAL 2: BẢNG TÍNH TRẢ GÓP 0% TƯƠNG TÁC                    */}
      {/* ========================================================= */}
      {isInstallmentOpen && <InstallmentCalculatorModal
        isOpen={isInstallmentOpen}
        onClose={() => setIsInstallmentOpen(false)}
        price={totalPrice}
        productName={productName}
      />}
    </section>
  );
}
