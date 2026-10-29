"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Inbox } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategoryFilterSidebar from "./CategoryFilterSidebar";
import ActiveFilterChips from "./ActiveFilterChips";
import CategorySortSelect from "./CategorySortSelect";
import CategoryPagination from "./CategoryPagination";
import MobileFilterDrawer from "./MobileFilterDrawer";
import type { CategoryFilteredResult } from "@/server/services/catalog.service";

interface CategoryListingContainerProps {
  initialData: CategoryFilteredResult;
}

export default function CategoryListingContainer({
  initialData,
}: CategoryListingContainerProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type");
  const activeBrands = searchParams.getAll("brand");
  const activePricePreset = searchParams.get("pricePreset");
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram");
  const activeStorage = searchParams.getAll("storage");
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");

  const isAccessoryCategory =
    initialData.category?.slug === "linh-kien" ||
    initialData.category?.slug === "phu-kien";

  const toggleConditionPill = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const curr = params.getAll("condition");
    params.delete("condition");
    if (curr.includes(val)) {
      curr.filter((c) => c !== val).forEach((c) => params.append("condition", c));
    } else {
      [...curr, val].forEach((c) => params.append("condition", c));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const togglePricePill = (preset: { value: string; min: number; max: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (activePricePreset === preset.value) {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.set("pricePreset", preset.value);
      if (preset.min > 0) params.set("minPrice", String(preset.min));
      else params.delete("minPrice");
      params.set("maxPrice", String(preset.max));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const totalActiveFilters =
    (activeType ? 1 : 0) +
    activeBrands.length +
    (activePricePreset ? 1 : 0) +
    activeConditions.length +
    activeRams.length +
    activeStorage.length +
    activeCpus.length +
    activeGpus.length;

  return (
    <div>
      {/* Active Filter Chips */}
      <ActiveFilterChips facets={initialData.facets} />

      {/* Main Grid Layout: Left Sidebar + Right Products */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Sidebar (1 col) */}
        <aside className="hidden lg:block lg:col-span-1 bg-surface-card border border-border-default rounded-card p-5 sticky top-24 shadow-xs">
          <CategoryFilterSidebar
            categorySlug={initialData.category?.slug}
            facets={initialData.facets}
          />
        </aside>

        {/* Right Content (3 cols) */}
        <section className="lg:col-span-3">
          {/* Top Bar: Results Count + Mobile Filter Trigger + Sort Select */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border-subtle">
            <div className="text-body-sm text-text-secondary">
              Hiển thị <span className="font-bold text-text-primary">{initialData.products.length}</span> trên{" "}
              <span className="font-bold text-text-primary">{initialData.totalCount}</span> sản phẩm
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
              <CategorySortSelect />
            </div>
          </div>

          {/* Quick Filter Pills for Laptop Categories */}
          {!isAccessoryCategory && (
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-xs font-bold text-text-secondary mr-1">Lọc nhanh:</span>
              {[
                { val: "NEW", label: "Mới 100% Fullbox" },
                { val: "LIKE_NEW", label: "Like New 99% Tuyển chọn" },
              ].map((cond) => {
                const active = activeConditions.includes(cond.val);
                return (
                  <button
                    key={cond.val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleConditionPill(cond.val)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? "bg-brand-primary text-text-inverse border-brand-primary"
                        : "bg-surface-card hover:bg-brand-primary-subtle text-text-secondary border-border-default"
                    }`}
                  >
                    {cond.label}
                  </button>
                );
              })}
              {[
                { value: "under-15", label: "Dưới 15 triệu", min: 0, max: 15_000_000 },
                { value: "15-20", label: "15 - 20 triệu", min: 15_000_000, max: 20_000_000 },
                { value: "20-30", label: "20 - 30 triệu", min: 20_000_000, max: 30_000_000 },
                { value: "over-30", label: "Trên 30 triệu", min: 30_000_000, max: 150_000_000 },
              ].map((pr) => {
                const active = activePricePreset === pr.value;
                return (
                  <button
                    key={pr.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePricePill(pr)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? "bg-brand-primary text-text-inverse border-brand-primary"
                        : "bg-surface-card hover:bg-brand-primary-subtle text-text-secondary border-border-default"
                    }`}
                  >
                    {pr.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid or Empty State */}
          {initialData.products.length === 0 ? (
            <div className="bg-surface-card border border-border-default rounded-card p-8">
              <EmptyState
                icon={<Inbox className="w-6 h-6 stroke-1.5" aria-hidden="true" />}
                title="Không tìm thấy sản phẩm phù hợp"
                description={
                  totalActiveFilters > 0
                    ? "Không có sản phẩm nào thỏa mãn tất cả các tiêu chí lọc hiện tại. Bạn vui lòng thử bỏ bớt bộ lọc."
                    : "Hiện tại danh mục này chưa có sản phẩm nào được bày bán."
                }
                action={
                  <Link
                    href={
                      totalActiveFilters > 0
                        ? initialData.category
                          ? initialData.category.href || `/${initialData.category.slug}`
                          : "/phan-loai"
                        : "/phan-loai"
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-text-inverse font-medium rounded-control hover:bg-brand-primary-hover transition text-sm"
                  >
                    {totalActiveFilters > 0 ? "Xóa toàn bộ bộ lọc" : "Xem tất cả danh mục"}
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {initialData.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      image: product.primaryImage || product.image || "",
                    }}
                  />
                ))}
              </div>

              {/* Server-rendered Pagination */}
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
        categorySlug={initialData.category?.slug}
      />
    </div>
  );
}
