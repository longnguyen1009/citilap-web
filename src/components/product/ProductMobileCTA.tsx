"use client";

import { Phone, MessageCircle, ShoppingCart, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

interface ProductMobileCTAProps {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  stock: number;
}

export default function ProductMobileCTA({
  productId,
  productName,
  productImage,
  price,
  stock,
}: ProductMobileCTAProps) {
  const { addToCart } = useCart();
  const router = useRouter();

  const handleAddToCart = () => {
    if (stock <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }
    addToCart({
      id: productId,
      productId: productId,
      name: productName,
      price: price,
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      image: productImage,
      quantity: 1,
      maxQuantity: stock,
    });
  };

  const handleBuyNow = () => {
    if (stock <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }
    addToCart({
      id: productId,
      productId: productId,
      name: productName,
      price: price,
      displayPrice: `${price.toLocaleString("vi-VN")}đ`,
      image: productImage,
      quantity: 1,
      maxQuantity: stock,
    });
    router.push("/checkout");
  };

  return (
    <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-3 z-40 md:hidden safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      <a
        href="tel:0853111999"
        className="flex items-center justify-center gap-1 border border-green-500 text-green-600 rounded-lg py-2.5 px-3 font-bold text-xs hover:bg-green-50 transition"
        aria-label="Gọi điện tư vấn"
      >
        <Phone className="w-4 h-4" /> Gọi
      </a>
      <a
        href="https://zalo.me/0853111999"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 border border-blue-500 text-blue-600 rounded-lg py-2.5 px-3 font-bold text-xs hover:bg-blue-50 transition"
        aria-label="Chat Zalo tư vấn"
      >
        <MessageCircle className="w-4 h-4" /> Zalo
      </a>
      <button
        onClick={handleAddToCart}
        disabled={stock <= 0}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg py-2.5 font-bold text-sm transition flex items-center justify-center gap-2"
        aria-label="Thêm vào giỏ hàng"
      >
        <ShoppingCart className="w-4 h-4" />
        {stock <= 0 ? "HẾT HÀNG" : "THÊM VÀO GIỎ"}
      </button>
      <button
        onClick={handleBuyNow}
        disabled={stock <= 0}
        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg py-2.5 font-bold text-sm transition flex items-center justify-center gap-2"
        aria-label="Mua ngay"
      >
        <Zap className="w-4 h-4" />
        {stock <= 0 ? "HẾT HÀNG" : "MUA NGAY"}
      </button>
    </div>
  );
}
