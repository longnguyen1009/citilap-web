'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ArrowRight, ShieldCheck, Gift, Phone, CreditCard } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { conditionLabels } from '@/contracts/cms/product-studio';
import type { ProductDetailVariant } from '@/server/services/catalog.service';
import { businessProfile } from '@/config/business-profile';
import ProductVariantSelector from './ProductVariantSelector';
import InstallmentCalculatorModal from './InstallmentCalculatorModal';

interface ProductPurchaseSectionProps {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  initialCondition: string;
  initialWarranty?: string | null;
  basePrice: number;
  baseOriginalPrice: number | null;
  baseStock: number;
  variants: ProductDetailVariant[];
  selectedVariantId: string | null;
  phone?: string;
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
  phone = businessProfile.displayPhone,
}: ProductPurchaseSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { addToCart } = useCart();
  const [message, setMessage] = useState('');
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);
  const [prevPropVariantId, setPrevPropVariantId] = useState(selectedVariantId);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);

  if (prevPropVariantId !== selectedVariantId) {
    setPrevPropVariantId(selectedVariantId);
    setUserSelectedVariantId(null);
  }

  const currentVariantId = userSelectedVariantId ?? selectedVariantId;
  const variant = variants.find((v) => v.id === currentVariantId);
  const price = variant?.price ?? basePrice;
  const originalPrice = variant ? variant.originalPrice : baseOriginalPrice;
  const stock = variant?.stock ?? baseStock;
  const canOrder = stock > 0 && (!variants.length || !!variant);

  const saving = originalPrice && originalPrice > price ? originalPrice - price : null;
  const installmentMonthly = Math.round(price / 12);
  const effectiveWarranty = initialWarranty || "Bảo hành 3 tháng tiêu chuẩn tại CitiLap";

  const add = (redirectCart = false) => {
    if (!canOrder) return;
    addToCart({
      slug: productSlug,
      template: pathname.startsWith('/phu-kien/') ? 'ACCESSORY' : 'LAPTOP',
      id: `${productId}-${variant?.id || 'base'}`,
      productId,
      variantId: variant?.id,
      name: productName,
      image: variant?.image || productImage || '/images/placeholder-laptop.svg',
      price,
      displayPrice: price.toLocaleString('vi-VN') + 'đ',
      variantLabel: variant?.name,
      quantity: 1,
      maxQuantity: stock,
    });
    if (redirectCart) {
      router.push('/cart');
    } else {
      setMessage('Đã thêm sản phẩm vào giỏ hàng thành công!');
    }
  };

  return (
    <section className="space-y-4">
      {/* 1. KHỐI GIÁ NẰM NGAY TRÊN ĐẦU, DỄ THEO DÕI NHẤT */}
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
                {price.toLocaleString('vi-VN')}₫
              </span>
              {originalPrice && originalPrice > price && (
                <span className="text-sm sm:text-base text-gray-400 line-through">
                  {originalPrice.toLocaleString('vi-VN')}₫
                </span>
              )}
              {saving && saving > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-xs">
                  Tiết kiệm {saving.toLocaleString('vi-VN')}₫
                </span>
              )}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-200">
            <span className="text-xs font-semibold text-gray-700 block">
              Trả góp 0% chỉ từ:
            </span>
            <span className="text-sm font-black text-blue-600 block">
              {installmentMonthly.toLocaleString('vi-VN')}₫ / tháng
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
              {variant?.name || conditionLabels[initialCondition as keyof typeof conditionLabels] || initialCondition}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {effectiveWarranty}
          </span>
        </div>
      </div>

      {/* 2. CHỌN CẤU HÌNH (DẠNG CARD 365, TỰ ĐỘNG ẨN NẾU <= 1 OPTION) */}
      <ProductVariantSelector
        variants={variants}
        selectedVariantId={currentVariantId}
        onSelectVariant={(v) => setUserSelectedVariantId(v.id)}
        productSlug={productSlug}
      />

      {/* 3. KHỐI QUÀ TẶNG & KHUYẾN MÃI ĐI KÈM */}
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

      {/* 4. CỤM NÚT HÀNH ĐỘNG MUA HÀNG */}
      <div className="space-y-2.5 pt-1">
        {/* Nút Hero Mua Ngay */}
        <button
          type="button"
          disabled={!canOrder}
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
            disabled={!canOrder}
            onClick={() => add(false)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800 transition cursor-pointer font-bold text-xs sm:text-sm disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            <span>THÊM VÀO GIỎ</span>
          </button>
        </div>

        {/* Thông báo thêm giỏ hàng thành công */}
        {message && (
          <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
            <span>{message}</span>
            <Link href="/cart" className="font-bold underline shrink-0 hover:text-emerald-900 inline-flex items-center gap-0.5">
              Xem giỏ hàng <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Hotline tư vấn */}
        <div className="flex items-center justify-center gap-2 pt-1 text-xs text-gray-500">
          <Phone className="w-4 h-4 text-emerald-600" />
          <span>Tư vấn kỹ thuật & cấu hình riêng: <a href={'tel:' + phone.replace(/\s+/g, '')} className="text-blue-600 font-bold hover:underline">{phone}</a> (Zalo / Miễn phí)</span>
        </div>
      </div>

      {/* Modal Trả Góp 0% */}
      <InstallmentCalculatorModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        productName={productName}
        price={price}
      />
    </section>
  );
}
