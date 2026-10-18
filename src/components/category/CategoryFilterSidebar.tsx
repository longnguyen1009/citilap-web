"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from 'react';
import { Check, RotateCcw } from "lucide-react";
import type { FacetOption } from "@/server/services/catalog.service";
import { ACCESSORY_PRICE_PRESETS, ACCESSORY_TYPES } from "@/config/accessory-taxonomy";

export interface CategoryFilterSidebarProps {
  categorySlug?: string;
  facets: {
    categories?: FacetOption[];
    brands: FacetOption[];
    conditions: FacetOption[];
    accessoryTypes?: FacetOption[];
    connections?: FacetOption[];
    powers?: FacetOption[];
    cpuSeries: FacetOption[];
    gpuSeries: FacetOption[];
    ramOptions: FacetOption<number>[];
    storageOptions: FacetOption<number>[];
    priceRange: { min: number; max: number };
  };
  onApplyMobile?: () => void;
}

const LAPTOP_PRICE_PRESETS = [
  { value: "under-15", label: "Dưới 15 triệu", min: 0, max: 15_000_000 },
  { value: "15-20", label: "15 - 20 triệu", min: 15_000_000, max: 20_000_000 },
  { value: "20-30", label: "20 - 30 triệu", min: 20_000_000, max: 30_000_000 },
  { value: "over-30", label: "Trên 30 triệu", min: 30_000_000, max: 150_000_000 },
];

export default function CategoryFilterSidebar({
  categorySlug,
  facets,
  onApplyMobile,
}: CategoryFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [draftParams,setDraftParams] = useState(()=>new URLSearchParams(urlParams.toString()));
  const searchParams = onApplyMobile ? draftParams : urlParams;
  const navigate = (params:URLSearchParams) => {
    if(onApplyMobile) setDraftParams(params);
    else router.push(`${pathname}?${params.toString()}`, {scroll:false});
  };
  const isAccessory =
    categorySlug === "linh-kien" ||
    categorySlug === "chuot" ||
    categorySlug === "cu-sac" ||
    categorySlug === "phu-kien" ||
    Boolean(facets.connections && facets.connections.length > 0) ||
    Boolean(facets.powers && facets.powers.length > 0);
  const currentPricePresets = isAccessory ? ACCESSORY_PRICE_PRESETS : LAPTOP_PRICE_PRESETS;

  // Current active params
  const activeType = searchParams.get("type") || "";
  const activeCategories = searchParams.getAll("category");
  const activeBrands = searchParams.getAll("brand");
  const activeConnections = searchParams.getAll("connection");
  const activePowers = searchParams.getAll("power");
  const activePricePreset = searchParams.get("pricePreset") || "";
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram").map(Number);
  const activeStorage = searchParams.getAll("storage").map(Number);
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");

  const hasAnyFilter =
    Boolean(activeType) ||
    activeCategories.length > 0 ||
    activeBrands.length > 0 ||
    activeConnections.length > 0 ||
    activePowers.length > 0 ||
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

    navigate(params);
  };

  const handlePricePreset = (presetValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (activePricePreset === presetValue) {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      const preset = currentPricePresets.find((p) => p.value === presetValue);
      if (preset) {
        params.set("pricePreset", preset.value);
        if (preset.min > 0) params.set("minPrice", String(preset.min));
        else params.delete("minPrice");
        const maxThreshold = isAccessory ? 50_000_000 : 150_000_000;
        if (preset.max < maxThreshold) params.set("maxPrice", String(preset.max));
        else params.delete("maxPrice");
      }
    }

    navigate(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    navigate(params);
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

      {/* Loại phụ kiện (Dành riêng cho category linh-kien) */}
      {isAccessory && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Loại phụ kiện
          </h3>
          <div className="flex flex-wrap gap-2">
            {ACCESSORY_TYPES.map((t) => {
              const isSelected = activeType === t.slug;
              const facetMatch = facets.accessoryTypes?.find((f) => f.value === t.slug);
              const count = facetMatch?.count;
              return (
                <button
                  key={t.slug}
                  onClick={() => updateParam("type", t.slug, false)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm font-semibold"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span>{t.shortName}</span>
                  {count !== undefined && count > 0 && (
                    <span className={`ml-1.5 text-caption ${isSelected ? "text-text-inverse/85" : "text-text-muted"}`}>
                      ({count})
                    </span>
                  )}
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

      {/* Chuẩn kết nối (Phụ kiện: Chuột, Bàn phím, Tai nghe, Hub...) */}
      {isAccessory && facets.connections && facets.connections.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Chuẩn kết nối
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.connections.map((c) => {
              const isSelected = activeConnections.includes(c.value);
              return (
                <button
                  key={c.value}
                  onClick={() => updateParam("connection", c.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span>{c.label}</span>
                  {c.count > 0 && (
                    <span className={`ml-1.5 text-caption ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({c.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Công suất sạc (Phụ kiện: Sạc, Hub, Cáp...) */}
      {isAccessory && facets.powers && facets.powers.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            Công suất sạc
          </h3>
          <div className="flex flex-wrap gap-2">
            {facets.powers.map((p) => {
              const isSelected = activePowers.includes(p.value);
              return (
                <button
                  key={p.value}
                  onClick={() => updateParam("power", p.value, true)}
                  className={`px-3 py-1.5 rounded-control text-body-sm font-medium transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-sm"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span>{p.label}</span>
                  {p.count > 0 && (
                    <span className={`ml-1.5 text-caption ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({p.count})
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
          {currentPricePresets.map((p) => {
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

      {/* 3. Tình trạng máy / hàng */}
      {facets.conditions.length > 0 && (
        <div className="pb-5 border-b border-border-subtle">
          <h3 className="text-body-sm font-bold text-text-primary uppercase tracking-wider mb-3">
            {isAccessory ? "Tình trạng hàng" : "Tình trạng máy"}
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

      {/* 4-7. Phần cứng máy tính (Ẩn nếu là phụ kiện và không phải danh mục Nâng cấp phần cứng) */}
      {(!isAccessory || activeType === "hardware") && (
        <>
          {/* Dung lượng RAM */}
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

          {/* Ổ cứng SSD */}
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

          {/* CPU Series */}
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

          {/* Card đồ họa (GPU) */}
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
        </>
      )}

      {/* Mobile CTA */}
      {onApplyMobile && (
        <div className="pt-2 sticky bottom-0 bg-surface-card pb-4">
          <button
            onClick={()=>{router.push(`${pathname}?${draftParams.toString()}`, {scroll:false});onApplyMobile();}}
            className="w-full py-3 bg-brand-primary text-text-inverse font-bold rounded-control hover:bg-brand-primary-hover transition cursor-pointer shadow-md"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
