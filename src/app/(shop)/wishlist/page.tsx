"use client";

import Link from "next/link";
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: typeof wishlist[0]) => {
    addToCart({
      id: item.productId,
      productId: item.productId,
      name: item.name,
      price: parseInt(item.price.replace(/\D/g, ""), 10) || 0,
      displayPrice: item.price,
      image: item.image,
      quantity: 1,
    });
  };

  if (wishlist.length === 0) {
    return (
      <div className="bg-[#f1f5f9] min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <Heart className="w-20 h-20 text-gray-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Danh sách yêu thích trống</h2>
          <p className="text-gray-500 mb-6">Bạn chưa lưu sản phẩm nào vào danh sách yêu thích.</p>
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center gap-2">
            Tiếp tục mua sắm <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      <Breadcrumb items={[
        { label: "Trang chủ", href: "/" },
        { label: `Yêu thích (${wishlist.length})`, href: "/wishlist" },
      ]} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase mb-6">
          Danh sách yêu thích ({wishlist.length})
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {wishlist.map((item) => (
            <div key={item.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition">
              {/* Image */}
              <Link href={`/product/${item.productId}`} className="relative aspect-square block bg-gray-50 p-4 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromWishlist(item.productId);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Link>

              {/* Content */}
              <div className="p-3">
                <Link href={`/product/${item.productId}`}>
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 hover:text-blue-600 transition min-h-[40px]">
                    {item.name}
                  </h3>
                </Link>
                <p className="text-lg font-black text-red-600 mb-3">{item.price}</p>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" /> Thêm vào giỏ
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
