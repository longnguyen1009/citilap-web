"use client";

import { Phone, MessageCircle, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { businessProfile } from "@/config/business-profile";

interface ProductMobileCTAProps {
  productId: string;
  variantId?: string | null;
  variantLabel?: string | null;
  productName: string;
  productImage: string;
  price: number;
  stock: number;
}

export default function ProductMobileCTA({
  productId,
  variantId,
  variantLabel,
  productName,
  productImage,
  price,
  stock,
}: ProductMobileCTAProps) {
  const { addToCart } = useCart();
  const router = useRouter();

  const isOutOfStock = stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const id = variantId ? `${productId}-${variantId}` : productId;
    addToCart({
      id,
      productId,
      variantId: variantId || undefined,
      variantLabel: variantLabel || undefined,
      name: productName,
      price,
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      image: productImage || "/images/placeholder-laptop.svg",
      quantity: 1,
      maxQuantity: stock,
    });
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    router.push("/cart");
  };

  return (
    <aside
      className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-2.5 flex items-center gap-2 z-40 md:hidden safe-area-bottom shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      aria-label="Thanh tác vụ mua hàng di động"
    >
      <a
        href={businessProfile.telHref}
        className="flex flex-col items-center justify-center border border-gray-200 text-gray-700 rounded-lg py-1 px-2.5 hover:bg-gray-50 transition shrink-0"
        aria-label={`Gọi điện hotline tư vấn ${businessProfile.displayPhone}`}
      >
        <Phone className="w-4 h-4 text-emerald-600" />
        <span className="text-[10px] font-bold mt-0.5">Gọi</span>
      </a>
      <a
        href={businessProfile.socialProfiles.zalo}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center border border-gray-200 text-gray-700 rounded-lg py-1 px-2.5 hover:bg-gray-50 transition shrink-0"
        aria-label={`Chat Zalo tư vấn ${businessProfile.displayPhone}`}
      >
        <MessageCircle className="w-4 h-4 text-blue-600" />
        <span className="text-[10px] font-bold mt-0.5">Zalo</span>
      </a>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
        aria-label="Thêm sản phẩm vào giỏ hàng"
      >
        <ShoppingCart className="w-4 h-4" />
        {isOutOfStock ? "HẾT HÀNG" : "THÊM GIỎ"}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={isOutOfStock}
        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg py-2.5 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
        aria-label="Mua ngay sản phẩm"
      >
        <Zap className="w-4 h-4" />
        {isOutOfStock ? "HẾT HÀNG" : "MUA NGAY"}
      </button>
    </aside>
  );
}
