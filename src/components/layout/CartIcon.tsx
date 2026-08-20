"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartIcon() {
  const { cartCount } = useCart();

  return (
    <Link href="/cart" className="relative flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded w-16 h-10 transition">
      <ShoppingCart className="w-4 h-4 text-gray-300 mb-0.5" />
      <span className="text-[10px] text-gray-300">Giỏ hàng</span>
      {cartCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[#0b1221]">
          {cartCount}
        </span>
      )}
    </Link>
  );
}
