"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import type { FacetOption } from "@/server/services/catalog.service";

export interface CategoryFilterSidebarProps {
  facets: {
    categories?: FacetOption[];
    brands: FacetOption[];
    conditions: FacetOption[];
    cpuSeries: FacetOption[];
    gpuSeries: FacetOption[];
    ramOptions: FacetOption<number>[];
    storageOptions: FacetOption<number>[];
    priceRange: { min: number; max: number };
  };
  onApplyMobile?: () => void;
}

const PRICE_PRESETS = [
  { value: "under-15", label: "Dưới 15 triệu", min: 0, max: 15_000_000 },
  { value: "15-20", label: "15 - 20 triệu", min: 15_000_000, max: 20_000_000 },
  { value: "20-30", label: "20 - 30 triệu", min: 20_000_000, max: 30_000_000 },
  { value: "over-30", label: "Trên 30 triệu", min: 30_000_000, max: 150_000_000 },
];

export default function CategoryFilterSidebar({
  facets,
  onApplyMobile,
}: CategoryFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Current active params
  const activeCategories = searchParams.getAll("category");
  const activeBrands = searchParams.getAll("brand");
  const activePricePreset = searchParams.get("pricePreset") || "";
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram").map(Number);
  const activeStorage = searchParams.getAll("storage").map(Number);
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");

  const hasAnyFilter =
    activeCategories.length > 0 ||
    activeBrands.length > 0 ||
    Boolean(activePricePreset) ||
    activeConditions.length > 0 ||
    activeRams.length > 0 ||
    activeStorage.length > 0 ||
    activeCpus.length > 0 ||
    activeGpus.length > 0;

  const updateParam = (key: string, value: string, isMulti = false) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // reset page on filter change

    if (isMulti) {
      const currentValues = params.getAll(key);
      params.delete(key);
      if (currentValues.includes(value)) {
        currentValues.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        [...currentValues, value].forEach((v) => params.append(key, v));
      }
    } else {
      if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePricePreset = (presetValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (activePricePreset === presetValue) {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      const preset = PRICE_PRESETS.find((p) => p.value === presetValue);
      if (preset) {
        params.set("pricePreset", preset.value);
        if (preset.min > 0) params.set("minPrice", String(preset.min));
        else params.delete("minPrice");
        if (preset.max < 150_000_000) params.set("maxPrice", String(preset.max));
        else params.delete("maxPrice");
      }
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    if (onApplyMobile) onApplyMobile();
  };

  return (
    <div className="space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-4 border-b border-border-default">
        <h2 className="text-body-lg font-bold text-text-primary">Bộ lọc tìm kiếm</h2>
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1.5 text-body-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* 0. Danh mục (nếu có trong facets, ví dụ trên trang Search) */}
      {facets.categories && facets.categories.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Danh mục
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.categories.map((c) => {
              const isSelected = activeCategories.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => updateParam("category", c.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  {c.label} {c.count !== undefined && <span className="opacity-75 text-caption">({c.count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Thương hiệu */}
      {facets.brands.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Thương hiệu
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.brands.map((b) => {
              const isSelected = activeBrands.includes(b.value);
              return (
                <button
                  key={b.value}
                  onClick={() => updateParam("brand", b.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span>{b.label}</span>
                  {b.count > 0 && (
                    <span className={`ml-1.5 text-caption ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({b.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Mức giá */}
      <div className="pb-5 border-b border-border-subtle">
        <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
          Mức giá
        </h3>
        <div className="space-y-2">
          {PRICE_PRESETS.map((p) => {
            const isSelected = activePricePreset === p.value;
            return (
              <button
                key={p.value}
                onClick={() => handlePricePreset(p.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-control text-body-sm font-medium transition cursor-pointer border text-left ${
                  isSelected
                    ? "bg-brand-primary-subtle text-brand-primary border-brand-primary font-bold"
                    : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                }`}
              >
                <span>{p.label}</span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected
                      ? "border-brand-primary bg-brand-primary text-text-inverse"
                      : "border-border-strong bg-surface"
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tình trạng máy */}
      {facets.conditions.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Tình trạng máy
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.conditions.map((c) => {
              const isSelected = activeConditions.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => updateParam("condition", c.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  <span>{c.label}</span>
                  {c.count > 0 && (
                    <span className={`ml-1 text-caption ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({c.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Dung lượng RAM */}
      {facets.ramOptions.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Dung lượng RAM
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {facets.ramOptions.map((r) => {
              const isSelected = activeRams.includes(r.value);
              return (
                <button
                  key={r.value}
                  onClick={() => updateParam("ram", String(r.value), true)}
                  className={`py-2 px-3 rounded-control text-body-sm font-medium transition cursor-pointer border text-center ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary font-bold shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Ổ cứng SSD */}
      {facets.storageOptions.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Dung lượng ổ cứng
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {facets.storageOptions.map((s) => {
              const isSelected = activeStorage.includes(s.value);
              return (
                <button
                  key={s.value}
                  onClick={() => updateParam("storage", String(s.value), true)}
                  className={`py-2 px-3 rounded-control text-body-sm font-medium transition cursor-pointer border text-center ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary font-bold shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. CPU Series */}
      {facets.cpuSeries.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Dòng Vi xử lý (CPU)
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.cpuSeries.map((c) => {
              const isSelected = activeCpus.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => updateParam("cpu", c.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary font-bold"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Card đồ họa (GPU) */}
      {facets.gpuSeries.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Card màn hình (GPU)
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.gpuSeries.map((g) => {
              const isSelected = activeGpus.includes(g.value);
              return (
                <button
                  key={g.value}
                  onClick={() => updateParam("gpu", g.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary font-bold"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile CTA */}
      {onApplyMobile && (
        <div className="pt-2 sticky bottom-0 bg-surface-card pb-4">
          <button
            onClick={onApplyMobile}
            className="w-full py-3 bg-brand-primary text-text-inverse font-bold rounded-control hover:bg-brand-primary-hover transition cursor-pointer shadow-md"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
