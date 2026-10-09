"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, Zap, Check, ShieldCheck, Truck, RefreshCw, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { PriceTag } from "@/components/ui/PriceTag";
import { StockBadge } from "@/components/ui/StockBadge";
import type { ProductDetailVariant } from "@/server/services/catalog.service";

interface ProductActionsProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  selectedVariant: ProductDetailVariant | null;
  warranty?: string | null;
}

export default function ProductActions({
  productId,
  productName,
  productImage,
  price,
  originalPrice,
  stock,
  selectedVariant,
  warranty,
}: ProductActionsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isOutOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);

  const handleIncrement = () => {
    if (quantity < maxQty) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    const cartItemId = selectedVariant ? `${productId}-${selectedVariant.id}` : productId;
    const variantLabel = selectedVariant ? selectedVariant.name : undefined;

    addToCart({
      id: cartItemId,
      productId,
      variantId: selectedVariant?.id,
      name: productName,
      price: price, // Integer VND
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      image: productImage || "/images/placeholder-laptop.svg",
      variantLabel,
      quantity,
      maxQuantity: stock,
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
    <div className="space-y-5">
      {/* 1. Price Box & Stock Status */}
      <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <PriceTag
            price={price}
            originalPrice={originalPrice}
            size="xl"
          />
          <StockBadge stock={stock} />
        </div>

        {warranty && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span><span className="font-semibold text-gray-900">Bảo hành:</span> {warranty}</span>
          </div>
        )}
      </div>

      {/* 2. Success Feedback Toast */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
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

      {/* 3. Quantity Stepper */}
      <div className="flex items-center gap-3">
        <label htmlFor="quantity-input" className="text-sm font-bold text-gray-700">
          Số lượng:
        </label>
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= 1 || isOutOfStock}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
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
            onClick={handleIncrement}
            disabled={quantity >= maxQty || isOutOfStock}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
            aria-label="Tăng số lượng"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {!isOutOfStock && stock <= 5 && (
          <span className="text-xs text-amber-600 font-semibold">
            (Chỉ còn {stock} máy trong kho)
          </span>
        )}
      </div>

      {/* 4. Action CTA Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-3.5 flex flex-col items-center justify-center transition shadow-md shadow-red-600/20 active:scale-[0.98]"
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
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl p-3.5 flex flex-col items-center justify-center transition shadow-md shadow-blue-600/20 active:scale-[0.98]"
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

      {/* 5. Trust and Service Policies */}
      <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50 space-y-2 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
          <span><strong>Giao hàng:</strong> Hỗ trợ giao tận nơi toàn quốc, kiểm tra máy trước khi nhận</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Bảo hành:</strong> Hỗ trợ kỹ thuật chu đáo, cam kết linh kiện chuẩn cấu hình</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>Cam kết:</strong> Máy chuẩn mô tả, tư vấn tận tâm đúng nhu cầu</span>
        </div>
      </div>
    </div>
  );
}
