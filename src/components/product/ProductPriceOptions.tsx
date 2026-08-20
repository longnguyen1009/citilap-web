"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

type Variant = {
  id: string;
  label: string;
  price: string;
  oldPrice: string;
};

export default function ProductPriceOptions({ 
  productId,
  productName,
  productImage,
  variants, 
  initialPrice, 
  initialOldPrice 
}: { 
  productId: string,
  productName: string,
  productImage: string,
  variants: Variant[], 
  initialPrice: string, 
  initialOldPrice: string 
}) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0] || null);

  const currentPrice = selectedVariant ? selectedVariant.price : initialPrice;
  const currentOldPrice = selectedVariant ? selectedVariant.oldPrice : initialOldPrice;

  // Xử lý chuỗi giá thành số để tính toán
  const numericPrice = parseInt(currentPrice.replace(/\D/g, ""));

  const { addToCart } = useCart();
  const router = useRouter();

  const handleBuyNow = () => {
    addToCart({
      id: selectedVariant ? `${productId}-${selectedVariant.id}` : productId,
      productId: productId,
      name: productName,
      price: numericPrice,
      displayPrice: currentPrice,
      image: productImage,
      variantLabel: selectedVariant ? selectedVariant.label : undefined,
      quantity: 1
    });
    router.push("/cart");
  };

  return (
    <>
      {/* Options */}
      {variants && variants.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-800 mb-3 uppercase">Tuỳ chọn bộ nhớ (RAM/SSD)</h3>
          <div className="grid grid-cols-2 gap-3">
            {variants.map((v) => (
              <button 
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`border rounded-lg p-3 text-left transition-all ${
                  selectedVariant?.id === v.id 
                    ? 'border-red-600 bg-red-50 ring-1 ring-red-600' 
                    : 'border-gray-200 hover:border-red-400'
                }`}
              >
                <div className={`font-bold text-sm ${selectedVariant?.id === v.id ? 'text-red-700' : 'text-gray-800'}`}>
                  {v.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">{v.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Box */}
      <div className="bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-xl p-4 md:p-6 mb-6">
        <div className="flex items-end gap-4 mb-2">
          <span className="text-4xl font-black text-red-600 tracking-tight">{currentPrice}</span>
          <span className="text-lg text-gray-400 line-through mb-1">{currentOldPrice}</span>
        </div>
        <p className="text-sm text-gray-600">Giá đã bao gồm VAT. Bảo hành chính hãng 12 tháng.</p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
        <button 
          onClick={handleBuyNow}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30"
        >
          <span className="font-black text-xl uppercase">MUA NGAY</span>
          <span className="text-xs opacity-90">Giao hàng tận nơi nhanh chóng</span>
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-blue-600/30">
          <span className="font-black text-xl uppercase">TRẢ GÓP 0%</span>
          <span className="text-xs opacity-90">Thủ tục online đơn giản</span>
        </button>
      </div>
    </>
  );
}
