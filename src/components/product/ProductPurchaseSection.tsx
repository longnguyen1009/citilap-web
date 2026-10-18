'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { PriceTag } from '@/components/ui/PriceTag';
import { StockBadge } from '@/components/ui/StockBadge';
import { conditionLabels } from '@/contracts/cms/product-studio';
import type { ProductDetailVariant } from '@/server/services/catalog.service';
import { businessProfile } from '@/config/business-profile';
import ProductVariantSelector from './ProductVariantSelector';

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
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [userSelectedVariantId, setUserSelectedVariantId] = useState<string | null>(null);
  const [prevPropVariantId, setPrevPropVariantId] = useState(selectedVariantId);

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
  const actualQuantity = Math.min(quantity, Math.max(1, stock));

  const add = () => {
    if (!canOrder) return;
    addToCart({
      id: `${productId}-${variant?.id || 'base'}`,
      productId,
      variantId: variant?.id,
      name: productName,
      image: variant?.image || productImage || '/images/placeholder-laptop.svg',
      price,
      displayPrice: price.toLocaleString('vi-VN') + 'đ',
      variantLabel: variant?.name,
      quantity: actualQuantity,
      maxQuantity: stock,
    });
    setMessage('Đã thêm vào giỏ. Giá và khả dụng được kiểm tra lại trước khi đặt hàng.');
  };

  return (
    <section className="space-y-5">
      <p className="text-sm font-semibold text-gray-700">
        Tình trạng: <span className="text-gray-900 font-bold">{conditionLabels[initialCondition as keyof typeof conditionLabels] || initialCondition}</span>
      </p>

      <ProductVariantSelector
        variants={variants}
        selectedVariantId={currentVariantId}
        onSelectVariant={(v) => setUserSelectedVariantId(v.id)}
        productSlug={productSlug}
      />

      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
        <PriceTag price={price} originalPrice={originalPrice} size="xl" />
        <StockBadge stock={stock} />
        {initialWarranty && (
          <p className="text-sm text-gray-600">
            Bảo hành: <span className="font-semibold text-gray-900">{initialWarranty}</span>
          </p>
        )}
        <div>
          <Link href="/chinh-sach-bao-hanh" className="text-sm text-blue-600 hover:text-blue-700 underline">
            Chính sách bảo hành
          </Link>
        </div>
      </div>

      {/* Quantity Selector with Stepper Buttons */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Số lượng:</span>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs">
          <button
            type="button"
            aria-label="Giảm số lượng"
            disabled={!canOrder || actualQuantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            aria-label="Số lượng"
            type="number"
            min={1}
            max={Math.max(1, stock)}
            value={actualQuantity}
            disabled={!canOrder}
            onChange={(e) => setQuantity(Math.max(1, Math.min(Math.max(1, stock), Math.floor(Number(e.target.value) || 1))))}
            className="w-12 h-9 text-center font-bold text-gray-900 border-x border-gray-200 focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Tăng số lượng"
            disabled={!canOrder || actualQuantity >= stock}
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {stock > 0 && stock <= 5 && (
          <span className="text-xs text-amber-600 font-medium">Chỉ còn {stock} máy</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!canOrder}
          onClick={add}
          className="rounded-xl border-2 border-blue-600 p-3 font-bold text-blue-700 hover:bg-blue-50/50 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Thêm vào giỏ
        </button>
        <button
          type="button"
          disabled={!canOrder}
          onClick={() => {
            if (canOrder) {
              add();
              router.push('/cart');
            }
          }}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 p-3 font-bold text-white shadow-md disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
        >
          Mua ngay
        </button>
      </div>

      {!canOrder && (
        <p role="status" className="text-sm text-red-600 font-medium">
          Cấu hình này hiện chưa nhận đặt hàng. Liên hệ cửa hàng để được hỗ trợ.
        </p>
      )}

      {message && (
        <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center justify-between gap-2">
          <span>{message}</span>
          <Link href="/cart" className="font-bold underline shrink-0 hover:text-emerald-900 inline-flex items-center gap-0.5">
            Xem giỏ hàng <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <a
        href={'tel:' + phone.replace(/\s+/g, '')}
        className="block rounded-xl border border-blue-200 bg-blue-50/30 hover:bg-blue-50 p-3 text-center font-semibold text-blue-700 transition"
      >
        Hotline tư vấn: {phone}
      </a>
    </section>
  );
}
