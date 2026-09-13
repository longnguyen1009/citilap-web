"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

type ProductCardProduct = {
  id: string;
  name: string;
  price: string;
  oldPrice?: string | null;
  discount?: string;
  image: string;
  specs: {
    cpu: string;
    ram: string;
    ssd: string;
    gpu: string;
    display: string;
  };
};

const SPEC_ROWS: { key: keyof ProductCardProduct["specs"]; label: string }[] = [
  { key: "cpu",     label: "CPU" },
  { key: "ram",     label: "RAM" },
  { key: "ssd",     label: "SSD" },
  { key: "gpu",     label: "GPU" },
  { key: "display", label: "Màn hình" },
];

export default function ProductCard({ product, badgeColor = "bg-red-600", rank }: { product: ProductCardProduct; badgeColor?: string; rank?: number }) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const liked = isInWishlist(product.id);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation
    e.stopPropagation();
    if (liked) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      });
    }
  };

  return (
    <Link
      href={`/product/${product.id}`}
      className="group relative flex flex-col bg-white border-2 border-orange-500 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_-6px_rgba(234,88,12,0.35)]"
    >
      {/* Wishlist button */}
      <button
        onClick={toggleWishlist}
        className={`absolute top-2 right-12 z-30 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
          liked
            ? "bg-red-50 text-red-500"
            : "bg-white/80 text-gray-400 hover:text-red-500 hover:bg-red-50"
        } shadow-sm`}
        aria-label={liked ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      >
        <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} />
      </button>

      {/* Deal Sốc ribbon - only show when discount is present */}
      {product.discount && product.discount.includes("Deal") && (
        <div className="absolute top-0 right-0 z-20 bg-gradient-to-r from-red-600 to-orange-500 text-yellow-300 text-[11px] font-black px-2.5 py-1 rounded-bl-xl shadow-sm">
          Deal Sốc
        </div>
      )}

      {/* Rank badge */}
      {rank !== undefined && (
        <div className={`absolute top-2 left-0 z-20 ${rank <= 3 ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white" : "bg-gray-700 text-white"} text-[11px] font-black px-2.5 py-0.5 rounded-r-full shadow-sm`}>
          #{rank}
        </div>
      )}

      {/* Discount badge */}
      {product.discount && (
        <div className={`absolute left-0 z-20 ${rank !== undefined ? "top-8" : "top-2"} ${badgeColor} text-[11px] font-black px-2 py-0.5 rounded-r-full shadow-sm`}>
          {product.discount.startsWith("-") ? `Giảm ${product.discount.replace("-", "")}` : product.discount}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[4/3] bg-white px-4 pt-4 pb-2 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-3.5 pb-3.5">
        <h3 className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 min-h-[36px] mb-2 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="text-[17px] font-black text-red-600 leading-none">{product.price}</span>
          {product.oldPrice && (
            <span className="text-[11px] text-gray-400 line-through">{product.oldPrice}</span>
          )}
        </div>

        {/* Specs */}
        <div className="mt-auto bg-orange-50/60 rounded-lg px-2.5 py-2 space-y-[3px]">
          {SPEC_ROWS.map(({ key, label }) => (
            <div key={key} className="flex text-[11px] leading-[1.5] text-gray-700">
              <span className="font-bold text-gray-900 w-[62px] shrink-0">{label}:</span>
              <span className="truncate">{product.specs[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
