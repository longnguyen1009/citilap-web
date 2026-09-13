"use client";

import { useEffect, useState } from "react";
import { Star, Package } from "lucide-react";
import Link from "next/link";

type RecProduct = { id: string; name: string; slug?: string; price: number; originalPrice?: number | null; images: string[] | string; brand?: string | null; stock: number };

function formatPrice(n: number) { return `${n.toLocaleString("vi-VN")}đ`; }

function RecCard({ p }: { p: RecProduct }) {
  const img = Array.isArray(p.images) ? p.images[0] : (p.images || "").split(",")[0] || "";
  const discount = p.originalPrice && p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  return (
    <Link href={`/product/${p.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-3 group">
      <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3">
        {img ? <img src={img} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Star className="w-8 h-8" /></div>}
        {discount > 0 && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{discount}%</span>}
      </div>
      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1 group-hover:text-blue-600 transition">{p.name}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-base font-bold text-red-600">{formatPrice(p.price)}</span>
        {p.originalPrice && <span className="text-xs text-gray-400 line-through">{formatPrice(p.originalPrice)}</span>}
      </div>
    </Link>
  );
}

export default function ProductRecommendations({ productId }: { productId: string }) {
  const [related, setRelated] = useState<RecProduct[]>([]);
  const [bundles, setBundles] = useState<RecProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch(`/api/products/${productId}/recommendations`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch recommendations");
        return r.json();
      })
      .then((res) => {
        if (res.success) {
          setRelated(res.data.related || []);
          setBundles(res.data.bundles || []);
        }
      })
      .catch((err) => {
        console.error("Failed to load recommendations:", err);
        setError("Không thể tải gợi ý sản phẩm");
      })
      .finally(() => setIsLoading(false));
  }, [productId]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="h-6 w-48 bg-gray-200 rounded mb-6 skeleton" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3 skeleton" />
                <div className="h-4 bg-gray-200 rounded mb-2 skeleton" />
                <div className="h-4 w-24 bg-gray-200 rounded skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (related.length === 0 && bundles.length === 0) return null;

  return (
    <div className="space-y-8">
      {related.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" /> Sản phẩm tương tự
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {related.slice(0, 5).map((p) => <RecCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
      {bundles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold uppercase mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-500" /> Gợi ý mua kèm
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bundles.slice(0, 5).map((p) => <RecCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
