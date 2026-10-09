"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { Check, Gift, Truck, CreditCard, ShieldCheck, Headphones } from "lucide-react";

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
  initialOldPrice,
  stock = 0,
  onAddToCart,
}: {
  productId: string;
  productName: string;
  productImage: string;
  variants: Variant[];
  initialPrice: string;
  initialOldPrice: string;
  stock?: number;
  onAddToCart?: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState(variants[0] || null);

  const currentPrice = selectedVariant ? selectedVariant.price : initialPrice;
  const currentOldPrice = selectedVariant ? selectedVariant.oldPrice : initialOldPrice;
  const numericPrice = parseInt(currentPrice.replace(/\D/g, ""), 10) || 0;

  const { addToCart } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    addToCart({
      id: selectedVariant ? `${productId}-${selectedVariant.id}` : productId,
      productId,
      variantId: selectedVariant?.id,
      name: productName,
      price: numericPrice,
      displayPrice: currentPrice,
      image: productImage,
      variantLabel: selectedVariant ? selectedVariant.label : undefined,
      quantity: 1,
    });
    onAddToCart?.();
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/cart");
  };

  return (
    <>
      {/* Price Box */}
      <div className="mb-4">
        <div className="flex items-end gap-4 mb-2">
          <span className="text-[32px] font-bold text-red-600 tracking-tight leading-none">{currentPrice}</span>
          <span className="text-sm text-gray-400 line-through mb-1">{currentOldPrice}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded text-[12px] text-gray-700">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
            <span><span className="font-bold text-gray-900">Bảo hành:</span> 12 tháng chính hãng</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50/50 border border-green-100 px-2.5 py-1 rounded text-[12px] text-green-700">
            <Check className="w-3.5 h-3.5" />
            <span className="font-bold">{stock > 0 ? "In stock" : "Out of stock"}</span>
          </div>
        </div>
      </div>

      {/* Options */}
      {variants && variants.length > 0 && (
        <div className="mb-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariant(v)}
                className={`border rounded p-2 text-center transition-all relative ${
                  selectedVariant?.id === v.id
                    ? 'border-red-500 bg-white'
                    : 'border-gray-200 hover:border-red-300 bg-white'
                }`}
              >
                {selectedVariant?.id === v.id && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 rounded-bl flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className={`text-[11px] leading-tight mb-1 ${selectedVariant?.id === v.id ? 'text-gray-900' : 'text-gray-700'}`}>
                  {v.label}
                </div>
                <div className="text-[13px] font-bold text-red-600">{v.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={handleBuyNow}
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-red-600/30"
        >
          <span className="font-black text-xl uppercase">MUA NGAY</span>
          <span className="text-xs opacity-90">Giao hàng tận nơi nhanh chóng</span>
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 flex flex-col items-center justify-center transition shadow-lg shadow-blue-600/30"
        >
          <span className="font-black text-xl uppercase">THÊM VÀO GIỎ</span>
          <span className="text-xs opacity-90">Có thể mua sau hoặc chọn trả góp</span>
        </button>
      </div>

      {/* Gift Box (Dashed Red Border) */}
      <div className="border border-red-500 border-dashed rounded-lg p-4 pt-6 relative mb-6">
        <div className="absolute -top-3.5 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-1 px-4 rounded-full flex items-center gap-2 text-sm shadow-sm">
          <Gift className="w-4 h-4" /> Quà tặng và Khuyến mãi
        </div>
        <ul className="space-y-3 text-sm text-gray-800 font-medium">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
            <div>
              Giảm tới <span className="text-red-600 font-bold">1.000.000 VNĐ</span> khi quý khách mua máy lần 2!
            </div>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
            <div>
              <span className="font-bold">{stock > 0 ? "In stock" : "Out of stock"}</span>
              <ul className="list-disc pl-5 mt-1 font-normal space-y-1">
                <li>Chuột không dây.</li>
                <li>Túi chống sốc Laptop.</li>
                <li>Bàn di chuột chuyên game.</li>
              </ul>
            </div>
          </li>
        </ul>
      </div>

      {/* Policies */}
      <div className="bg-[#f0f8ff] rounded-lg p-4 mt-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-600 p-1.5 rounded-full text-white shrink-0 shadow-sm mt-0.5">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">Miễn Phí Ship Nội Thành</h4>
              <p className="text-[12px] text-gray-600 leading-tight">Bán kính 10km từ cửa hàng.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-red-600 p-1.5 rounded-full text-white shrink-0 shadow-sm mt-0.5">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">Trả Góp Linh Động</h4>
              <p className="text-[12px] text-gray-600 leading-tight">Qua thẻ tín dụng, MPOS, HDsaison, Mcredit.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-red-600 p-1.5 rounded-full text-white shrink-0 shadow-sm mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">Cam Kết Chất Lượng</h4>
              <p className="text-[12px] text-gray-600 leading-tight">Bảo hành 1 năm. Miễn phí cài đặt trọn đời.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-red-600 p-1.5 rounded-full text-white shrink-0 shadow-sm mt-0.5">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5">Hỗ Trợ 24/7</h4>
              <p className="text-[12px] text-gray-600 leading-tight">Tư vấn tận tình, xử lý nhanh chóng.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
