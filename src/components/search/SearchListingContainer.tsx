"use client";

import { useEffect, useRef, useState } from "react";
import { trackStorefront } from '@/lib/storefront-metrics';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Inbox, Sparkles } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategoryFilterSidebar from "@/components/category/CategoryFilterSidebar";
import ActiveFilterChips from "@/components/category/ActiveFilterChips";
import CategorySortSelect, { type SortOptionItem } from "@/components/category/CategorySortSelect";
import CategoryPagination from "@/components/category/CategoryPagination";
import MobileFilterDrawer from "@/components/category/MobileFilterDrawer";
import SearchAutocomplete from "./SearchAutocomplete";
import type { SearchResult } from "@/server/services/search.service";

interface SearchListingContainerProps {
  initialData: SearchResult;
}

const SEARCH_SORT_OPTIONS: SortOptionItem[] = [
  { value: "relevance", label: "Phù hợp nhất" },
  { value: "price-asc", label: "Giá: Thấp đến cao" },
  { value: "price-desc", label: "Giá: Cao đến thấp" },
  { value: "newest", label: "Mới nhất" },
];

const POPULAR_KEYWORDS = [
  "Lenovo Legion",
  "RTX 4060",
  "Dell XPS",
  "MacBook Air",
  "Laptop Gaming",
  "32GB RAM",
  "Asus ROG",
];

export default function SearchListingContainer({
  initialData,
}: SearchListingContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const query = initialData.query;
  const lastSearch = useRef('');
  useEffect(() => {
    if (!query || query === lastSearch.current) return;
    lastSearch.current = query;
    trackStorefront('search');
    if (initialData.totalCount === 0) trackStorefront('search_empty');
  }, [query, initialData.totalCount]);
  const activeCategories = searchParams.getAll("category");
  const activeBrands = searchParams.getAll("brand");
  const activePricePreset = searchParams.get("pricePreset");
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram");
  const activeStorage = searchParams.getAll("storage");
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");

  const totalActiveFilters =
    activeCategories.length +
    activeBrands.length +
    (activePricePreset ? 1 : 0) +
    activeConditions.length +
    activeRams.length +
    activeStorage.length +
    activeCpus.length +
    activeGpus.length;

  return (
    <div className="space-y-6">
      {/* Top Search Input Box */}
      <div className="bg-surface-card border border-border-default rounded-card p-4 sm:p-6 shadow-xs">
        <div className="max-w-2xl mx-auto space-y-3">
          <h1 className="text-body-lg sm:text-title font-bold text-text-primary text-center">
            Tìm kiếm laptop & linh kiện chính hãng
          </h1>

          <SearchAutocomplete
            initialQuery={query}
            placeholder="Nhập tên laptop, CPU, GPU, thương hiệu (VD: Legion 4060)..."
            size="lg"
            className="w-full"
          />

          {/* Quick popular keyword tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-caption text-text-muted flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span>Gợi ý:</span>
            </span>
            {POPULAR_KEYWORDS.map((kw) => (
              <button
                key={kw}
                onClick={() => router.push(`/search?q=${encodeURIComponent(kw)}`)}
                className="px-2.5 py-1 rounded-pill bg-surface-subtle hover:bg-brand-primary-subtle hover:text-brand-primary text-text-secondary text-caption font-medium transition cursor-pointer border border-border-subtle hover:border-brand-primary/30"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterChips facets={initialData.facets} />

      {/* Main Grid: Left Filters + Right Products */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar (1 col) */}
        <aside className="hidden lg:block lg:col-span-1 bg-surface-card border border-border-default rounded-card p-5 sticky top-24 shadow-xs">
          <CategoryFilterSidebar facets={initialData.facets} />
        </aside>

        {/* Right Content Area (3 cols) */}
        <section className="lg:col-span-3">
          {/* Top Bar: Results Count + Mobile Filter Trigger + Sort Select */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border-subtle">
            <div className="text-body-sm text-text-secondary">
              {query ? (
                <>
                  Tìm thấy{" "}
                  <span className="font-bold text-text-primary">{initialData.totalCount}</span> sản
                  phẩm cho từ khóa &quot;
                  <span className="font-bold text-brand-primary">{query}</span>&quot;
                </>
              ) : (
                <>
                  Tìm thấy{" "}
                  <span className="font-bold text-text-primary">{initialData.totalCount}</span> sản
                  phẩm trong toàn hệ thống
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-surface-card border border-border-default hover:border-brand-primary text-text-primary rounded-control text-body-sm font-semibold transition cursor-pointer shadow-xs"
                aria-label="Mở bộ lọc tìm kiếm"
              >
                <Filter className="w-4 h-4 text-brand-primary" />
                <span>Bộ lọc</span>
                {totalActiveFilters > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-primary text-text-inverse text-[11px] font-bold">
                    {totalActiveFilters}
                  </span>
                )}
              </button>

              {/* Sort Select */}
              <CategorySortSelect
                options={SEARCH_SORT_OPTIONS}
                defaultSort={query ? "relevance" : "newest"}
              />
            </div>
          </div>

          {/* Products Grid or Empty State */}
          {initialData.products.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-card p-8 sm:p-12 text-center">
              <EmptyState
                icon={<Inbox className="w-8 h-8 stroke-1.5" aria-hidden="true" />}
                title="Không tìm thấy sản phẩm phù hợp"
                description={
                  query
                    ? `Rất tiếc, không có sản phẩm nào khớp với từ khóa "${query}". Bạn có thể thử tìm kiếm bằng từ khóa ngắn hơn hoặc kiểm tra lỗi chính tả.`
                    : "Không tìm thấy sản phẩm nào với các bộ lọc bạn đã chọn."
                }
                action={
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                    {totalActiveFilters > 0 && (
                      <Link
                        href={`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                        className="px-5 py-2.5 rounded-control bg-brand-primary text-text-inverse font-bold text-body-sm hover:bg-brand-primary-hover transition"
                      >
                        Xóa tất cả bộ lọc
                      </Link>
                    )}
                    <Link
                      href="/category"
                      className="px-5 py-2.5 rounded-control border border-border-default bg-surface text-text-primary font-bold text-body-sm hover:border-brand-primary transition"
                    >
                      Khám phá tất cả danh mục
                    </Link>
                  </div>
                }
              />

              {/* Suggestions keywords */}
              <div className="mt-8 pt-6 border-t border-border-subtle max-w-md mx-auto">
                <p className="text-body-sm font-semibold text-text-secondary mb-3">
                  Từ khóa tìm kiếm phổ biến:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {POPULAR_KEYWORDS.map((k) => (
                    <button
                      key={k}
                      onClick={() => router.push(`/search?q=${encodeURIComponent(k)}`)}
                      className="px-3 py-1.5 bg-surface-subtle hover:bg-brand-primary-subtle hover:text-brand-primary text-text-secondary text-caption font-semibold rounded-pill transition border border-border-subtle cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Product Grid: 2 cols mobile, 3 cols desktop */}
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {initialData.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Server-side Pagination */}
              <CategoryPagination
                currentPage={initialData.page}
                totalPages={initialData.totalPages}
              />
            </>
          )}
        </section>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeCount={totalActiveFilters}
        facets={initialData.facets}
      />
    </div>
  );
}
