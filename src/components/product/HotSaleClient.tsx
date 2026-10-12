"use client";

import { useState, useMemo } from "react";
import ProductCard, { type ProductCardProduct } from "@/components/product/ProductCard";
import { SlidersHorizontal, FolderX } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export type HotSaleProductItem = ProductCardProduct & {
  categorySlug?: string;
  categoryName?: string;
  conditionLabel?: string;
};

interface HotSaleClientProps {
  products: HotSaleProductItem[];
}

const TABS = [
  { id: "all", label: "Tất cả ưu đãi" },
  { id: "gaming", label: "Laptop Gaming" },
  { id: "ultrabook", label: "Ultrabook Mỏng Nhẹ" },
  { id: "likenew", label: "Laptop Like-New 99%" },
  { id: "accessories", label: "Phụ kiện & Linh kiện" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const getNumeric = (val: number | string | null | undefined): number => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val.replace(/\D/g, "")) || 0;
  return 0;
};

export default function HotSaleClient({ products }: HotSaleClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [sortBy, setSortBy] = useState<"discount" | "price-asc" | "price-desc">("discount");

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by tab
    if (activeTab === "gaming") {
      list = list.filter(
        (p) =>
          p.categorySlug === "laptop-gaming" ||
          p.categoryName?.toLowerCase().includes("gaming") ||
          p.name.toLowerCase().includes("gaming") ||
          p.name.toLowerCase().includes("legion") ||
          p.name.toLowerCase().includes("rog") ||
          p.name.toLowerCase().includes("nitro") ||
          p.name.toLowerCase().includes("predator")
      );
    } else if (activeTab === "ultrabook") {
      list = list.filter(
        (p) =>
          p.categorySlug === "laptop-van-phong" ||
          p.categoryName?.toLowerCase().includes("văn phòng") ||
          p.name.toLowerCase().includes("xps") ||
          p.name.toLowerCase().includes("zenbook") ||
          p.name.toLowerCase().includes("macbook") ||
          p.name.toLowerCase().includes("spectre") ||
          p.name.toLowerCase().includes("swift")
      );
    } else if (activeTab === "likenew") {
      list = list.filter(
        (p) =>
          p.condition === "LIKE_NEW" ||
          p.condition === "USED" ||
          p.conditionLabel?.toLowerCase().includes("99") ||
          p.conditionLabel?.toLowerCase().includes("like new") ||
          p.name.toLowerCase().includes("cũ") ||
          p.name.toLowerCase().includes("like new")
      );
    } else if (activeTab === "accessories") {
      list = list.filter(
        (p) =>
          p.categorySlug === "linh-kien" ||
          p.categoryName?.toLowerCase().includes("phụ kiện") ||
          p.categoryName?.toLowerCase().includes("linh kiện")
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => getNumeric(a.price) - getNumeric(b.price));
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => getNumeric(b.price) - getNumeric(a.price));
    } else if (sortBy === "discount") {
      list.sort((a, b) => {
        const priceA = getNumeric(a.price);
        const origA = getNumeric(a.originalPrice);
        const discA = origA > priceA ? (origA - priceA) / origA : 0;

        const priceB = getNumeric(b.price);
        const origB = getNumeric(b.originalPrice);
        const discB = origB > priceB ? (origB - priceB) / origB : 0;

        return discB - discA;
      });
    }

    return list;
  }, [products, activeTab, sortBy]);

  return (
    <div>
      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-red-400 hover:text-red-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sắp xếp sản phẩm"
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500"
          >
            <option value="discount">Giảm giá sâu nhất</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<FolderX className="w-8 h-8 text-slate-400" />}
          title="Không có sản phẩm phù hợp"
          description="Hiện chưa có sản phẩm nào thuộc bộ lọc này trong chương trình Flash Sale. Quý khách vui lòng chọn danh mục khác!"
          action={
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition cursor-pointer"
            >
              Xem tất cả sản phẩm ưu đãi
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
          {filteredProducts.map((p, idx) => (
            <ProductCard
              key={`${p.id}-hotsale`}
              product={p}
              badgeColor="bg-red-600"
              rank={idx < 5 && activeTab === "all" ? idx + 1 : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
