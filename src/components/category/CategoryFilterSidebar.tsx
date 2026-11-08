"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Form from "next/form";
import {
  Award,
  Cable,
  Check,
  Cpu,
  HardDrive,
  Layers,
  MemoryStick,
  Monitor,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Wifi,
  Zap,
} from "lucide-react";
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

const BRAND_LOGOS: Record<string, string> = {
  lenovo: "/brands/lenovo.svg",
  asus: "/brands/asus.svg",
  dell: "/brands/dell.svg",
  hp: "/brands/hp.svg",
  apple: "/brands/apple.svg",
  acer: "/brands/acer.svg",
  msi: "/brands/msi.svg",
  gigabyte: "/brands/gigabyte.svg",
};

export default function CategoryFilterSidebar({
  categorySlug,
  facets,
  onApplyMobile,
}: CategoryFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlParams = useSearchParams();
  const [draftParams, setDraftParams] = useState(() => new URLSearchParams(urlParams.toString()));
  const searchParams = onApplyMobile ? draftParams : urlParams;
  const navigate = (params: URLSearchParams) => {
    if (onApplyMobile) setDraftParams(params);
    else router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
    searchParams.has("tag") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
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
    params.delete("page");

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
    <div className="space-y-3.5">
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-border-default">
        <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-primary" />
          <span>Bộ lọc chi tiết</span>
        </h2>
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* 0. Danh mục */}
      {facets.categories && facets.categories.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <Layers className="w-3.5 h-3.5 text-brand-primary" />
            <span>Danh mục sản phẩm</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.categories.map((c) => {
              const isSelected = activeCategories.includes(c.value);
              return (
                <button
                  key={c.value}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("category", c.value, true)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  {c.count !== undefined && (
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-surface-subtle text-text-muted"}`}>
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loại phụ kiện */}
      {isAccessory && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <Cable className="w-3.5 h-3.5 text-brand-primary" />
            <span>Loại phụ kiện</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {ACCESSORY_TYPES.map((t) => {
              const isSelected = activeType === t.slug;
              const facetMatch = facets.accessoryTypes?.find((f) => f.value === t.slug);
              const count = facetMatch?.count;
              return (
                <button
                  key={t.slug}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("type", t.slug, false)}
                  className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span className="truncate">{t.shortName}</span>
                  {count !== undefined && count > 0 && (
                    <span className={`shrink-0 text-[10px] ${isSelected ? "text-text-inverse/85" : "text-text-muted"}`}>
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
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <Award className="w-3.5 h-3.5 text-brand-primary" />
            <span>Thương hiệu</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.brands.map((b) => {
              const isSelected = activeBrands.includes(b.value);
              const logo = BRAND_LOGOS[b.value.toLowerCase()];
              return (
                <button
                  key={b.value}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("brand", b.value, true)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    {logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt=""
                        className={`h-3.5 w-auto max-w-[44px] object-contain shrink-0 ${isSelected ? "brightness-0 invert" : ""}`}
                      />
                    )}
                    <span className="truncate">{b.label}</span>
                  </span>
                  {b.count > 0 && (
                    <span className={`shrink-0 text-[10px] ${isSelected ? "text-text-inverse/85" : "text-text-muted"}`}>
                      ({b.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chuẩn kết nối */}
      {isAccessory && facets.connections && facets.connections.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <Wifi className="w-3.5 h-3.5 text-brand-primary" />
            <span>Chuẩn kết nối</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.connections.map((c) => {
              const isSelected = activeConnections.includes(c.value);
              return (
                <button
                  key={c.value}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("connection", c.value, true)}
                  className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span className="truncate">{c.label}</span>
                  {c.count > 0 && (
                    <span className={`text-[10px] ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({c.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Công suất sạc */}
      {isAccessory && facets.powers && facets.powers.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <Zap className="w-3.5 h-3.5 text-brand-primary" />
            <span>Công suất sạc</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.powers.map((p) => {
              const isSelected = activePowers.includes(p.value);
              return (
                <button
                  key={p.value}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("power", p.value, true)}
                  className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  {p.count > 0 && (
                    <span className={`text-[10px] ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
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
      <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
          <Tag className="w-3.5 h-3.5 text-brand-primary" />
          <span>Khoảng giá</span>
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {currentPricePresets.map((p) => {
            const isSelected = activePricePreset === p.value;
            return (
              <button
                key={p.value}
                aria-pressed={isSelected}
                onClick={() => handlePricePreset(p.value)}
                className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left ${
                  isSelected
                    ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                    : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                }`}
              >
                <span className="truncate">{p.label}</span>
                {isSelected && <Check className="w-3 h-3 shrink-0 stroke-[3]" />}
              </button>
            );
          })}
        </div>
        <Form
          action={pathname}
          className="mt-2.5 space-y-2 pt-2.5 border-t border-border-subtle/80"
          onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams();
            new FormData(event.currentTarget).forEach((value, key) => {
              if (typeof value === "string" && value.trim()) params.append(key, value);
            });
            navigate(params);
          }}
        >
          {[...searchParams.entries()]
            .filter(([key]) => !["minPrice", "maxPrice", "pricePreset", "page"].includes(key))
            .map(([key, value], i) => (
              <input key={i} type="hidden" name={key} value={value} />
            ))}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["minPrice", "Giá từ (₫)"],
              ["maxPrice", "Giá đến (₫)"],
            ].map(([name, label]) => (
              <label key={name} className="min-w-0 text-[11px] font-medium text-text-secondary">
                {label}
                <input
                  key={searchParams.get(name)}
                  name={name}
                  type="number"
                  min={0}
                  max={1000000000}
                  step="any"
                  defaultValue={searchParams.get(name) || ""}
                  className="mt-1 w-full min-w-0 rounded-lg border border-border-default bg-surface px-2 py-1.5 text-xs text-text-primary"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg border border-brand-primary bg-surface-card hover:bg-brand-primary-subtle px-3 py-1.5 text-xs font-bold text-brand-primary transition cursor-pointer"
          >
            Áp dụng khoảng giá
          </button>
        </Form>
      </div>

      {/* 3. Tình trạng máy / hàng */}
      {facets.conditions.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
            <span>{isAccessory ? "Tình trạng hàng" : "Tình trạng máy"}</span>
          </h3>
          <div className="grid grid-cols-2 gap-1.5">
            {facets.conditions.map((c) => {
              const isSelected = activeConditions.includes(c.value);
              const condFallbackMap: Record<string, string> = {
                NEW: "Mới 100%",
                LIKE_NEW: "LikeNew 99%",
                USED: "Đã qua sử dụng",
                REFURBISHED: "Refurbished",
              };
              const displayLabel = condFallbackMap[c.value] || c.label;
              return (
                <button
                  key={c.value}
                  aria-pressed={isSelected}
                  onClick={() => updateParam("condition", c.value, true)}
                  className={`flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left ${
                    isSelected
                      ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-brand-primary"
                  }`}
                >
                  <span className="truncate">{displayLabel}</span>
                  {c.count > 0 && (
                    <span className={`text-[10px] ${isSelected ? "text-text-inverse/80" : "text-text-muted"}`}>
                      ({c.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4-7. Phần cứng máy tính */}
      {(!isAccessory || activeType === "hardware") && (
        <>
          {/* Dung lượng RAM */}
          {facets.ramOptions.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
                <MemoryStick className="w-3.5 h-3.5 text-brand-primary" />
                <span>Dung lượng RAM</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {facets.ramOptions.map((r) => {
                  const isSelected = activeRams.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      aria-pressed={isSelected}
                      onClick={() => updateParam("ram", String(r.value), true)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border text-center ${
                        isSelected
                          ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
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
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
                <HardDrive className="w-3.5 h-3.5 text-brand-primary" />
                <span>Dung lượng ổ cứng</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {facets.storageOptions.map((s) => {
                  const isSelected = activeStorage.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      aria-pressed={isSelected}
                      onClick={() => updateParam("storage", String(s.value), true)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border text-center ${
                        isSelected
                          ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
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
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
                <Cpu className="w-3.5 h-3.5 text-brand-primary" />
                <span>Dòng Vi xử lý (CPU)</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {facets.cpuSeries.map((c) => {
                  const isSelected = activeCpus.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      aria-pressed={isSelected}
                      onClick={() => updateParam("cpu", c.value, true)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left truncate ${
                        isSelected
                          ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
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
            <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
                <Monitor className="w-3.5 h-3.5 text-brand-primary" />
                <span>Card màn hình (GPU)</span>
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {facets.gpuSeries.map((g) => {
                  const isSelected = activeGpus.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      aria-pressed={isSelected}
                      onClick={() => updateParam("gpu", g.value, true)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border text-left truncate ${
                        isSelected
                          ? "bg-brand-primary text-text-inverse border-brand-primary shadow-2xs"
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
            onClick={() => {
              router.push(`${pathname}?${draftParams.toString()}`, { scroll: false });
              onApplyMobile();
            }}
            className="w-full py-3 bg-brand-primary text-text-inverse font-bold rounded-xl hover:bg-brand-primary-hover transition cursor-pointer shadow-md"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
