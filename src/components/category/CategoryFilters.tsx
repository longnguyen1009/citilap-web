"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, ChevronDown, X } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

type Product = {
  id: string; name: string; price: string; oldPrice: string; discount: string; image: string; brand: string;
  specs: { cpu: string; ram: string; ssd: string; gpu: string; display: string };
};

const ITEMS_PER_PAGE = 8;

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "best-selling", label: "Bán chạy" },
  { value: "price-asc", label: "Giá thấp đến cao" },
  { value: "price-desc", label: "Giá cao đến thấp" },
];

const PRICE_RANGES = [
  { value: "under-15", label: "Dưới 15 triệu", min: 0, max: 15_000_000 },
  { value: "15-20", label: "15 - 20 triệu", min: 15_000_000, max: 20_000_000 },
  { value: "20-30", label: "20 - 30 triệu", min: 20_000_000, max: 30_000_000 },
  { value: "over-30", label: "Trên 30 triệu", min: 30_000_000, max: Infinity },
];

const RAM_OPTIONS = ["8GB", "16GB", "32GB", "64GB"];

function parsePrice(price: string): number {
  return parseInt(price.replace(/\D/g, ""), 10);
}

export default function CategoryFilters({
  products, availableBrands, currentBrand, currentSort, currentPage, categorySlug, categoryName,
}: {
  products: Product[];
  availableBrands: string[];
  currentBrand?: string;
  currentSort?: string;
  currentPage?: string;
  categorySlug: string;
  categoryName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedBrand, setSelectedBrand] = useState<string | null>(currentBrand || null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [selectedRam, setSelectedRam] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(currentSort || "newest");
  const [page, setPage] = useState(parseInt(currentPage || "1", 10));
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...products];

    if (selectedBrand) {
      result = result.filter((p) => p.brand === selectedBrand);
    }
    if (selectedPriceRange) {
      const range = PRICE_RANGES.find((r) => r.value === selectedPriceRange);
      if (range) result = result.filter((p) => { const price = parsePrice(p.price); return price >= range.min && price < range.max; });
    }
    if (selectedRam) {
      result = result.filter((p) => p.specs.ram === selectedRam);
    }

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price)); break;
      case "price-desc": result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price)); break;
      case "best-selling": result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price)); break;
      default: break; // newest = default order
    }

    return result;
  }, [products, selectedBrand, selectedPriceRange, selectedRam, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const updateURL = (brand: string | null, sort: string) => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (sort && sort !== "newest") params.set("sort", sort);
    router.push(`/category/${categorySlug}?${params.toString()}`, { scroll: false });
  };

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    setPage(1);
    updateURL(brand, sortBy);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setPage(1);
    updateURL(selectedBrand, sort);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => {
    setSelectedBrand(null);
    setSelectedPriceRange(null);
    setSelectedRam(null);
    setSortBy("newest");
    setPage(1);
    router.push(`/category/${categorySlug}`, { scroll: false });
  };

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = selectedBrand || selectedPriceRange || selectedRam;

  // Sidebar content (reused in desktop and mobile drawer)
  const FilterSidebar = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-6">
      {/* Close button for mobile */}
      {onClose && (
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 uppercase flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" /> Bộ lọc
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
      )}

      {/* Brand filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">Hãng sản xuất</h3>
        <div className="space-y-2.5 text-sm">
          {availableBrands.map((b) => (
            <label key={b} className="flex items-center gap-3 cursor-pointer hover:text-blue-600 transition">
              <input
                type="checkbox"
                checked={selectedBrand === b}
                onChange={() => handleBrandChange(selectedBrand === b ? null : b)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className={selectedBrand === b ? "font-bold text-blue-600" : "text-gray-700"}>{b}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">Mức giá</h3>
        <div className="space-y-2.5 text-sm">
          {PRICE_RANGES.map((range) => (
            <label key={range.value} className="flex items-center gap-3 cursor-pointer hover:text-blue-600 transition">
              <input
                type="checkbox"
                checked={selectedPriceRange === range.value}
                onChange={() => { setSelectedPriceRange(selectedPriceRange === range.value ? null : range.value); setPage(1); }}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className={selectedPriceRange === range.value ? "font-bold text-blue-600" : "text-gray-700"}>{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* RAM filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm border-b pb-2">RAM</h3>
        <div className="flex flex-wrap gap-2">
          {RAM_OPTIONS.map((ram) => (
            <button
              key={ram}
              onClick={() => { setSelectedRam(selectedRam === ram ? null : ram); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                selectedRam === ram
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
              }`}
            >
              {ram}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <button onClick={clearFilters} className="w-full py-2.5 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
          Xoá tất cả bộ lọc
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Desktop Sidebar */}
        <div className="lg:col-span-1 hidden lg:block">
          <FilterSidebar />
        </div>

        {/* Products Area */}
        <div className="lg:col-span-3">
          {/* Top bar: sort + mobile filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileFilter(true)}
                className="lg:hidden bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
              >
                <Filter className="w-4 h-4" /> Lọc
                {hasActiveFilters && <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">!</span>}
              </button>
              <span className="text-sm text-gray-500">
                Hiển thị <span className="font-bold text-gray-800">{paged.length}</span> / {filtered.length} sản phẩm
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition border ${
                    sortBy === opt.value
                      ? "bg-blue-50 text-blue-600 border-blue-200 font-bold"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-500">Đang lọc:</span>
              {selectedBrand && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {selectedBrand} <button onClick={() => handleBrandChange(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedPriceRange && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {PRICE_RANGES.find((r) => r.value === selectedPriceRange)?.label}{" "}
                  <button onClick={() => { setSelectedPriceRange(null); setPage(1); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedRam && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  RAM {selectedRam} <button onClick={() => { setSelectedRam(null); setPage(1); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-red-500 font-bold hover:underline ml-1">Xoá tất cả</button>
            </div>
          )}

          {/* Product Grid */}
          {paged.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {paged.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-500 text-lg font-medium">Không tìm thấy sản phẩm phù hợp.</p>
              <button onClick={clearFilters} className="mt-4 text-blue-600 font-bold hover:underline">Xoá bộ lọc</button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Trang <span className="font-bold text-gray-800">{page}</span> / {totalPages}
              </p>
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition border ${
                      p === page
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40"
                >
                  ›
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilter(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-gray-50 shadow-xl overflow-y-auto p-5">
            <FilterSidebar onClose={() => setShowMobileFilter(false)} />
            <button
              onClick={() => setShowMobileFilter(false)}
              className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Xem kết quả ({filtered.length})
            </button>
          </div>
        </div>
      )}
    </>
  );
}
