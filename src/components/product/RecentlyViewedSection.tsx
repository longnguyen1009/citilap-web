"use client";

import { useEffect, useState } from "react";
import { History, Trash2 } from "lucide-react";
import ProductCard, { type ProductCardProduct } from "@/components/product/ProductCard";

const STORAGE_KEY = "citilap_recently_viewed_v1";
const MAX_STORED = 8;

interface RecentlyViewedSectionProps {
  currentProduct?: ProductCardProduct;
  excludeIds?: string[];
  maxDisplay?: number;
  title?: string;
  subtitle?: string;
}

function readStoredProducts(): ProductCardProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ProductCardProduct =>
        Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string")
    );
  } catch {
    return [];
  }
}

export default function RecentlyViewedSection({
  currentProduct,
  excludeIds = [],
  maxDisplay = 4,
  title = "Sản phẩm bạn vừa xem",
  subtitle = "Tiếp tục tham khảo và so sánh các mẫu máy bạn đã quan tâm trên thiết bị này",
}: RecentlyViewedSectionProps) {
  const [items, setItems] = useState<ProductCardProduct[]>([]);

  useEffect(() => {
    const existing = readStoredProducts();

    if (currentProduct && currentProduct.id) {
      const next = [
        currentProduct,
        ...existing.filter((item) => item.id !== currentProduct.id),
      ].slice(0, MAX_STORED);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota or private mode errors
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate client-only localStorage history after mount
      setItems(existing.filter((item) => item.id !== currentProduct.id));
    } else {
      setItems(existing);
    }
  }, [currentProduct]);

  const excluded = new Set([
    ...(currentProduct?.id ? [currentProduct.id] : []),
    ...excludeIds,
  ]);
  const visible = items.filter((item) => !excluded.has(item.id)).slice(0, maxDisplay);

  if (visible.length === 0) return null;

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setItems([]);
  };

  return (
    <section className="mt-12" aria-label={title}>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-semibold text-gray-500 hover:text-red-600 transition inline-flex items-center gap-1 shrink-0 cursor-pointer"
          title="Xóa lịch sử sản phẩm đã xem"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xóa lịch sử</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

