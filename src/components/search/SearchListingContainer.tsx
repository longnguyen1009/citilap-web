"use client";

import { useEffect, useRef } from "react";
import { trackStorefront } from "@/lib/storefront-metrics";
import Link from "next/link";
import Form from "next/form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Cable,
  Calendar,
  Check,
  ChevronDown,
  Cpu,
  HardDrive,
  Headphones,
  Inbox,
  Laptop,
  LayoutGrid,
  MemoryStick,
  Monitor,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tag,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategorySortSelect, { type SortOptionItem } from "@/components/category/CategorySortSelect";
import CategoryPagination from "@/components/category/CategoryPagination";
import CatalogFilterPanel from "@/components/category/CatalogFilterPanel";
import SearchAutocomplete from "./SearchAutocomplete";
import type { SearchResult } from "@/server/services/search.service";
import { ACCESSORY_PRICE_PRESETS, ACCESSORY_TYPES, getAccessoryTypeBySlug } from "@/config/accessory-taxonomy";
import { NEED_LABELS, catalogNeedTag } from "@/lib/catalog-needs";

interface SearchListingContainerProps {
  initialData: SearchResult;
}

const SEARCH_SORT_OPTIONS: SortOptionItem[] = [
  { value: "relevance", label: "Phù hợp nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá thấp → cao" },
  { value: "price-desc", label: "Giá cao → thấp" },
];

const BRAND_LOGOS: Record<string, { label: string; logo: string }> = {
  lenovo: { label: "Lenovo", logo: "/brands/lenovo.svg" },
  dell: { label: "Dell", logo: "/brands/dell.svg" },
  asus: { label: "Asus", logo: "/brands/asus.svg" },
  hp: { label: "HP", logo: "/brands/hp.svg" },
  apple: { label: "Apple", logo: "/brands/apple.svg" },
  acer: { label: "Acer", logo: "/brands/acer.svg" },
  msi: { label: "MSI", logo: "/brands/msi.svg" },
  gigabyte: { label: "Gigabyte", logo: "/brands/gigabyte.svg" },
};

const NEED_CARDS = [
  { value: "van-phong", label: "Văn phòng", icon: "/needs/van-phong.svg" },
  { value: "gaming", label: "Gaming", icon: "/needs/gaming.svg" },
  { value: "mong-nhe", label: "Mỏng nhẹ", icon: "/needs/mong-nhe.svg" },
  { value: "do-hoa", label: "Đồ họa", icon: "/needs/do-hoa.svg" },
  { value: "sinh-vien", label: "Sinh viên", icon: "/needs/sinh-vien.svg" },
  { value: "cam-ung", label: "Cảm ứng", icon: "/needs/cam-ung.svg" },
  { value: "laptop-ai", label: "Laptop AI", icon: "/needs/laptop-ai.svg" },
  { value: "doanh-nhan", label: "Doanh nhân", icon: "/needs/doanh-nhan.svg" },
];

const LAPTOP_PRICE_PRESETS = [
  { value: "under-15", label: "Dưới 15 triệu", min: 0, max: 15_000_000 },
  { value: "15-20", label: "15 - 20 triệu", min: 15_000_000, max: 20_000_000 },
  { value: "20-30", label: "20 - 30 triệu", min: 20_000_000, max: 30_000_000 },
  { value: "over-30", label: "Trên 30 triệu", min: 30_000_000, max: 150_000_000 },
];

type FilterGroupKey =
  | "price"
  | "condition"
  | "cpu"
  | "gpu"
  | "ram"
  | "storage"
  | "year"
  | "accessoryType"
  | "connection"
  | "power";

export default function SearchListingContainer({
  initialData,
}: SearchListingContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = initialData.query;
  const lastSearch = useRef("");
  useEffect(() => {
    if (!query || query === lastSearch.current) return;
    lastSearch.current = query;
    trackStorefront("search");
    if (initialData.totalCount === 0) trackStorefront("search_empty");
  }, [query, initialData.totalCount]);

  const activeCategories = searchParams.getAll("category");
  const activeBrands = searchParams.getAll("brand");
  const activePricePreset = searchParams.get("pricePreset") || "";
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram");
  const activeStorage = searchParams.getAll("storage");
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");
  const activeTags = searchParams.getAll("tag");
  const activeYears = searchParams.getAll("year");
  const activeType = searchParams.get("type") || "";
  const activeConnections = searchParams.getAll("connection");
  const activePowers = searchParams.getAll("power");
  const activeInStock = searchParams.get("inStock") === "1";

  const isAccessoryScope =
    activeCategories.includes("phu-kien") ||
    activeCategories.includes("linh-kien") ||
    activeCategories.some((c) => c.startsWith("ref-accessory-"));
  const currentPricePresets = isAccessoryScope ? ACCESSORY_PRICE_PRESETS : LAPTOP_PRICE_PRESETS;
  const hasCustomPrice = !activePricePreset && (searchParams.has("minPrice") || searchParams.has("maxPrice"));

  const totalActiveFilters =
    activeTags.length +
    (activeInStock ? 1 : 0) +
    (hasCustomPrice ? 1 : 0) +
    activeCategories.length +
    activeBrands.length +
    (activePricePreset ? 1 : 0) +
    activeConditions.length +
    activeRams.length +
    activeStorage.length +
    activeCpus.length +
    activeGpus.length +
    activeYears.length +
    (activeType ? 1 : 0) +
    activeConnections.length +
    activePowers.length;

  const pushParams = (params: URLSearchParams) => {
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleMultiParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const curr = params.getAll(key);
    params.delete(key);
    if (curr.includes(val)) {
      curr.filter((item) => item !== val).forEach((item) => params.append(key, item));
    } else {
      [...curr, val].forEach((item) => params.append(key, item));
    }
    pushParams(params);
  };

  const toggleSingleParam = (key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === val) params.delete(key);
    else params.set(key, val);
    pushParams(params);
  };

  const setScopeCategory = (scopeSlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("condition");
    if (scopeSlug) {
      params.set("category", scopeSlug);
    }
    pushParams(params);
  };

  const toggleInStockPill = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeInStock) params.delete("inStock");
    else params.set("inStock", "1");
    pushParams(params);
  };

  const togglePricePill = (preset: { value: string; min: number; max: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activePricePreset === preset.value) {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.set("pricePreset", preset.value);
      if (preset.min > 0) params.set("minPrice", String(preset.min));
      else params.delete("minPrice");
      const maxThreshold = isAccessoryScope ? 50_000_000 : 150_000_000;
      if (preset.max < maxThreshold) params.set("maxPrice", String(preset.max));
      else params.delete("maxPrice");
    }
    pushParams(params);
  };

  const currentScope =
    activeCategories.length === 1 && ["laptop", "laptop-moi", "laptop-likenew", "phu-kien"].includes(activeCategories[0])
      ? activeCategories[0]
      : activeCategories.length === 0
        ? "all"
        : "";

  const scopeCards = [
    { id: "all", slug: null, label: "Tất cả", icon: LayoutGrid },
    { id: "laptop", slug: "laptop", label: "Laptop", icon: Laptop },
    { id: "laptop-moi", slug: "laptop-moi", label: "Laptop Mới", icon: Sparkles },
    { id: "laptop-likenew", slug: "laptop-likenew", label: "Laptop Like New", icon: RefreshCw },
    { id: "phu-kien", slug: "phu-kien", label: "Phụ kiện Tech", icon: Headphones },
  ];

  // Deduplicate brand items so reference brands like 'Lenovo (reference)' merge cleanly into standard logo cards
  const brandItems = (() => {
    const map = new Map<string, { value: string; label: string; logo?: string; count: number }>();
    for (const [slug, info] of Object.entries(BRAND_LOGOS)) {
      map.set(slug, {
        value: slug,
        label: info.label,
        logo: info.logo,
        count: 0,
      });
    }
    for (const b of initialData.facets.brands) {
      const lowerVal = b.value.toLowerCase();
      const lowerLabel = b.label.toLowerCase();
      const matchedStandard = Object.keys(BRAND_LOGOS).find(
        (std) => lowerVal === std || lowerVal === `ref-brand-${std}` || lowerLabel.startsWith(std)
      );
      if (matchedStandard) {
        const entry = map.get(matchedStandard)!;
        entry.count += b.count || 0;
        if (lowerVal === matchedStandard) entry.value = b.value;
      } else {
        map.set(lowerVal, { value: b.value, label: b.label, count: b.count || 0 });
      }
    }
    return [...map.values()];
  })();

  const priceSummaryLabel = activePricePreset
    ? currentPricePresets.find((p) => p.value === activePricePreset)?.label
    : hasCustomPrice
      ? "Tùy chỉnh"
      : undefined;

  const filterGroups: Array<{
    key: FilterGroupKey;
    label: string;
    summary?: string;
    icon: typeof Tag;
    activeCount: number;
    visible: boolean;
  }> = [
    {
      key: "price",
      label: "Mức giá",
      summary: priceSummaryLabel,
      icon: Tag,
      activeCount: (activePricePreset ? 1 : 0) + (hasCustomPrice ? 1 : 0),
      visible: true,
    },
    {
      key: "condition",
      label: "Tình trạng",
      summary:
        activeConditions.length === 1
          ? { NEW: "Mới 100%", LIKE_NEW: "LikeNew 99%", USED: "Đã qua SD", REFURBISHED: "Refurbished" }[activeConditions[0]] || activeConditions[0]
          : undefined,
      icon: ShieldCheck,
      activeCount: activeConditions.length,
      visible: initialData.facets.conditions.length > 0 && !["laptop-moi", "laptop-likenew"].includes(currentScope),
    },
    {
      key: "cpu",
      label: "CPU",
      summary: activeCpus.length === 1 ? activeCpus[0] : undefined,
      icon: Cpu,
      activeCount: activeCpus.length,
      visible: !isAccessoryScope && initialData.facets.cpuSeries.length > 0,
    },
    {
      key: "gpu",
      label: "Card đồ họa",
      summary: activeGpus.length === 1 ? activeGpus[0] : undefined,
      icon: Monitor,
      activeCount: activeGpus.length,
      visible: !isAccessoryScope && initialData.facets.gpuSeries.length > 0,
    },
    {
      key: "ram",
      label: "RAM",
      summary: activeRams.length === 1 ? `${activeRams[0]}GB` : undefined,
      icon: MemoryStick,
      activeCount: activeRams.length,
      visible: !isAccessoryScope && initialData.facets.ramOptions.length > 0,
    },
    {
      key: "storage",
      label: "Ổ cứng",
      summary:
        activeStorage.length === 1
          ? Number(activeStorage[0]) >= 1024
            ? `${Number(activeStorage[0]) / 1024}TB`
            : `${activeStorage[0]}GB`
          : undefined,
      icon: HardDrive,
      activeCount: activeStorage.length,
      visible: !isAccessoryScope && initialData.facets.storageOptions.length > 0,
    },
    {
      key: "year",
      label: "Năm SX",
      summary: activeYears.length === 1 ? activeYears[0] : undefined,
      icon: Calendar,
      activeCount: activeYears.length,
      visible: !isAccessoryScope && Boolean(initialData.facets.years && initialData.facets.years.length > 0),
    },
    {
      key: "accessoryType",
      label: "Loại phụ kiện",
      summary: activeType ? getAccessoryTypeBySlug(activeType)?.shortName || activeType : undefined,
      icon: Cable,
      activeCount: activeType ? 1 : 0,
      visible: isAccessoryScope,
    },
    {
      key: "connection",
      label: "Kết nối",
      summary: activeConnections.length === 1 ? activeConnections[0] : undefined,
      icon: Wifi,
      activeCount: activeConnections.length,
      visible: Boolean(initialData.facets.connections && initialData.facets.connections.length > 0),
    },
    {
      key: "power",
      label: "Công suất",
      summary: activePowers.length === 1 ? activePowers[0] : undefined,
      icon: Zap,
      activeCount: activePowers.length,
      visible: Boolean(initialData.facets.powers && initialData.facets.powers.length > 0),
    },
  ];

  // Build concise active chips (excluding the primary scope tab if it's already highlighted in the segmented bar)
  const chips: Array<{ key: string; value: string; label: string }> = [];
  if (activeInStock) chips.push({ key: "inStock", value: "1", label: "Sẵn hàng" });
  activeCategories
    .filter((c) => c !== currentScope)
    .forEach((c) => {
      const catObj = (initialData.facets.categories || []).find((item) => item.value === c);
      chips.push({ key: "category", value: c, label: catObj ? catObj.label : c });
    });
  activeBrands.forEach((b) => {
    const brandObj = brandItems.find((item) => item.value === b) || initialData.facets.brands.find((item) => item.value === b);
    chips.push({ key: "brand", value: b, label: `Hãng: ${brandObj ? brandObj.label : b}` });
  });
  activeTags.forEach((tag) => {
    chips.push({ key: "tag", value: tag, label: `Nhu cầu: ${NEED_LABELS[catalogNeedTag(tag)] || tag}` });
  });
  if (activePricePreset) {
    const pr = currentPricePresets.find((p) => p.value === activePricePreset);
    chips.push({ key: "pricePreset", value: activePricePreset, label: `Giá: ${pr ? pr.label : activePricePreset}` });
  } else if (hasCustomPrice) {
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) chips.push({ key: "minPrice", value: min, label: `Từ: ${Number(min).toLocaleString("vi-VN")} ₫` });
    if (max) chips.push({ key: "maxPrice", value: max, label: `Đến: ${Number(max).toLocaleString("vi-VN")} ₫` });
  }
  activeConditions.forEach((c) => {
    const condMap: Record<string, string> = {
      NEW: "Mới 100%",
      LIKE_NEW: "LikeNew 99%",
      USED: "Đã qua sử dụng",
      REFURBISHED: "Refurbished",
    };
    chips.push({ key: "condition", value: c, label: `Tình trạng: ${condMap[c] || c}` });
  });
  activeCpus.forEach((cpu) => chips.push({ key: "cpu", value: cpu, label: `CPU: ${cpu}` }));
  activeGpus.forEach((gpu) => chips.push({ key: "gpu", value: gpu, label: `GPU: ${gpu}` }));
  activeRams.forEach((r) => chips.push({ key: "ram", value: r, label: `RAM: ${r}GB` }));
  activeStorage.forEach((s) => {
    const num = Number(s);
    chips.push({ key: "storage", value: s, label: `Ổ cứng: ${num >= 1024 ? `${num / 1024}TB` : `${num}GB`}` });
  });
  activeYears.forEach((yr) => chips.push({ key: "year", value: yr, label: `Năm: ${yr}` }));
  if (activeType) {
    const accType = getAccessoryTypeBySlug(activeType);
    chips.push({ key: "type", value: activeType, label: `Loại: ${accType ? accType.shortName : activeType}` });
  }
  activeConnections.forEach((conn) => chips.push({ key: "connection", value: conn, label: `Kết nối: ${conn}` }));
  activePowers.forEach((pow) => chips.push({ key: "power", value: pow, label: `Công suất: ${pow}` }));

  const removeChip = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "pricePreset") {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else if (key === "type" || key === "inStock" || key === "minPrice" || key === "maxPrice") {
      params.delete(key);
    } else {
      const currentValues = params.getAll(key);
      params.delete(key);
      currentValues.filter((v) => v !== value).forEach((v) => params.append(key, v));
    }
    pushParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    pushParams(params);
  };

  const resetParams = new URLSearchParams();
  const qParam = searchParams.get("q");
  if (qParam) resetParams.set("q", qParam);
  const sortParam = searchParams.get("sort");
  if (sortParam) resetParams.set("sort", sortParam);
  const resetQuery = resetParams.toString();
  const resetHref = resetQuery ? `${pathname}?${resetQuery}` : pathname;
  const searchString = searchParams.toString();
  const currentUrlKey = searchString ? `${pathname}?${searchString}` : pathname;

  const filterPanelContent = (
    <div className="space-y-2.5" data-filter-inflow="true">
      {/* Nút Sẵn hàng */}
      <button
        type="button"
        aria-pressed={activeInStock}
        onClick={toggleInStockPill}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer select-none ${
          activeInStock
            ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 font-bold shadow-xs"
            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
        }`}
      >
        <span className="flex items-center gap-2">
          <PackageCheck className={`w-4 h-4 shrink-0 ${activeInStock ? "text-emerald-600" : "text-slate-500"}`} aria-hidden="true" />
          <span>Sẵn hàng</span>
        </span>
        {activeInStock && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
          </span>
        )}
      </button>

      {/* Các nhóm lọc chi tiết in-flow (<details>) */}
      {filterGroups
        .filter((g) => g.visible)
        .map((g) => {
          const Icon = g.icon;
          const hasActive = g.activeCount > 0;
          return (
            <details
              key={g.key}
              data-category-filter
              data-inflow="true"
              open
              className="group rounded-xl border border-slate-200/90 bg-slate-50/30"
            >
              <summary
                className={`flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition select-none [&::-webkit-details-marker]:hidden ${
                  hasActive ? "text-blue-800 font-bold" : "text-slate-800 hover:text-blue-600"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${hasActive ? "text-blue-600" : "text-slate-500"}`} aria-hidden="true" />
                  <span className="min-w-0 break-words">
                    {g.summary ? (
                      <>
                        {g.label}: <strong className="text-blue-700">{g.summary}</strong>
                      </>
                    ) : (
                      g.label
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {g.activeCount > 0 && (
                    <span className="flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">
                      {g.activeCount}
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                </span>
              </summary>

              <div className="border-t border-slate-200/80 px-2.5 pb-2.5 pt-2 space-y-2">
                {g.key === "price" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-1.5">
                      {currentPricePresets.map((pr) => {
                        const active = activePricePreset === pr.value;
                        return (
                          <button
                            key={pr.value}
                            type="button"
                            aria-pressed={active}
                            onClick={() => togglePricePill(pr)}
                            className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                              active
                                ? "border-blue-600 bg-blue-50 text-blue-700 font-bold"
                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                            }`}
                          >
                            <span className="break-words text-left">{pr.label}</span>
                            {active && <Check className="w-3.5 h-3.5 shrink-0 text-blue-600 stroke-[3]" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>

                    <Form
                      action={pathname}
                      className="space-y-2 pt-2.5 border-t border-slate-200/80"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const params = new URLSearchParams();
                        new FormData(event.currentTarget).forEach((value, key) => {
                          if (typeof value === "string" && value.trim()) params.append(key, value);
                        });
                        pushParams(params);
                      }}
                    >
                      {[...searchParams.entries()]
                        .filter(([key]) => !["minPrice", "maxPrice", "pricePreset", "page"].includes(key))
                        .map(([key, value], i) => (
                          <input key={i} type="hidden" name={key} value={value} />
                        ))}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Giá từ (₫)
                          <input
                            key={`min-${searchParams.get("minPrice")}`}
                            name="minPrice"
                            type="number"
                            min={0}
                            max={1000000000}
                            step="any"
                            placeholder="0"
                            defaultValue={searchParams.get("minPrice") || ""}
                            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base md:text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-slate-600">
                          Giá đến (₫)
                          <input
                            key={`max-${searchParams.get("maxPrice")}`}
                            name="maxPrice"
                            type="number"
                            min={0}
                            max={1000000000}
                            step="any"
                            placeholder="50000000"
                            defaultValue={searchParams.get("maxPrice") || ""}
                            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base md:text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="w-full min-h-11 py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                      >
                        Áp dụng khoảng giá
                      </button>
                    </Form>
                  </div>
                )}

                {g.key === "condition" && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {initialData.facets.conditions.map((c) => {
                      const isSelected = activeConditions.includes(c.value);
                      const condFallbackMap: Record<string, string> = {
                        NEW: "Mới 100% Fullbox",
                        LIKE_NEW: "LikeNew 99%",
                        USED: "Đã qua sử dụng",
                        REFURBISHED: "Refurbished",
                      };
                      const label = condFallbackMap[c.value] || c.label;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("condition", c.value)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({c.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "cpu" && (
                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto overscroll-contain pr-0.5">
                    {initialData.facets.cpuSeries.map((c) => {
                      const isSelected = activeCpus.includes(c.value);
                      return (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("cpu", c.value)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{c.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({c.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "gpu" && (
                  <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto overscroll-contain pr-0.5">
                    {initialData.facets.gpuSeries.map((gpu) => {
                      const isSelected = activeGpus.includes(gpu.value);
                      return (
                        <button
                          key={gpu.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("gpu", gpu.value)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{gpu.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({gpu.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "ram" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {initialData.facets.ramOptions.map((r) => {
                      const isSelected = activeRams.includes(String(r.value));
                      return (
                        <button
                          key={r.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("ram", String(r.value))}
                          className={`flex min-h-11 items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{r.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({r.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "storage" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {initialData.facets.storageOptions.map((s) => {
                      const isSelected = activeStorage.includes(String(s.value));
                      return (
                        <button
                          key={s.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("storage", String(s.value))}
                          className={`flex min-h-11 items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{s.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({s.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "year" && initialData.facets.years && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {initialData.facets.years.map((y) => {
                      const isSelected = activeYears.includes(y.value);
                      return (
                        <button
                          key={y.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("year", y.value)}
                          className={`flex min-h-11 items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">Năm {y.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({y.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "accessoryType" && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {ACCESSORY_TYPES.map((t) => {
                      const isSelected = activeType === t.slug;
                      return (
                        <button
                          key={t.slug}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleSingleParam("type", t.slug)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{t.shortName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-600" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "connection" && initialData.facets.connections && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {initialData.facets.connections.map((c) => {
                      const isSelected = activeConnections.includes(c.value);
                      return (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("connection", c.value)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{c.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({c.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {g.key === "power" && initialData.facets.powers && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {initialData.facets.powers.map((p) => {
                      const isSelected = activePowers.includes(p.value);
                      return (
                        <button
                          key={p.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMultiParam("power", p.value)}
                          className={`flex min-h-11 items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 font-bold"
                              : "border-slate-200/80 bg-white text-slate-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="break-words text-left">{p.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">({p.count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </details>
          );
        })}
    </div>
  );

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      {/* 1. KHỐI PHÂN LOẠI NHANH: PHẠM VI, THƯƠNG HIỆU & NHU CẦU (1 Card đồng nhất, gọn gàng) */}
      <section
        aria-label="Phân loại sản phẩm, thương hiệu và nhu cầu"
        className="rounded-xl md:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3.5 shadow-xs space-y-2.5 sm:space-y-3"
      >
        {/* Hàng 1: Segmented Scope Tabs + Tổng số kết quả + Link Tư vấn */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/90 p-1">
            {scopeCards.map((sc) => {
              const Icon = sc.icon;
              const active = currentScope === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setScopeCategory(sc.slug)}
                  className={`inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-700 hover:text-blue-600 hover:bg-white/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-white" : "text-blue-600"}`} aria-hidden="true" />
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div role="status" className="text-xs text-slate-600">
              {query ? (
                <>
                  Tìm thấy <strong className="text-slate-900">{initialData.totalCount}</strong> sản phẩm cho &quot;
                  <strong className="text-blue-600">{query}</strong>&quot;
                </>
              ) : (
                <>
                  Tìm thấy <strong className="text-slate-900">{initialData.totalCount}</strong> sản phẩm
                </>
              )}
            </div>

            <Link
              href="/chon-laptop"
              className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200/80 text-xs font-bold text-blue-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span>Tư vấn chọn máy</span>
            </Link>
          </div>
        </div>

        {/* Hàng 2: Lưới Card Logo Thương hiệu (compact 4 cột trên SP tới 767px, 8 cột từ md) */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {brandItems.map((b) => {
            const active = activeBrands.includes(b.value);
            return (
              <button
                key={b.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleMultiParam("brand", b.value)}
                title={b.count > 0 ? `${b.label} (${b.count} sản phẩm)` : b.label}
                className={`group relative flex min-h-11 h-12 items-center justify-center overflow-hidden rounded-xl border px-1.5 sm:px-2.5 transition cursor-pointer select-none ${
                  active
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-2xs"
                    : "border-slate-200/90 bg-slate-50/40 hover:border-blue-400 hover:bg-white"
                }`}
              >
                {b.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo}
                    alt={b.label}
                    className="max-h-4 sm:max-h-5 max-w-full w-auto object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="text-[11px] font-black uppercase text-slate-700 break-words text-center leading-tight">{b.label}</span>
                )}
                {b.count > 0 && (
                  <span
                    className={`absolute right-1.5 top-1 text-[10px] font-bold px-1 rounded-full leading-tight ${
                      active ? "bg-blue-600 text-white" : "text-slate-400"
                    }`}
                  >
                    {b.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hàng 3: Lưới Card Nhu cầu sử dụng (compact 4 cột trên SP tới 767px, 8 cột từ md, ẩn khi chọn Phụ kiện) */}
        {!isAccessoryScope && (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 pt-1">
            {NEED_CARDS.map((need) => {
              const active = activeTags.some((t) => catalogNeedTag(t) === need.value);
              return (
                <button
                  key={need.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMultiParam("tag", need.value)}
                  className={`group relative flex min-h-[56px] flex-col items-center justify-center rounded-xl border py-2 px-1.5 transition cursor-pointer select-none ${
                    active
                      ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/50 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs"
                      : "border-slate-200/90 bg-slate-50/40 hover:border-blue-400 hover:bg-white text-slate-700"
                  }`}
                >
                  {active && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-black">
                      ✓
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={need.icon}
                    alt={need.label}
                    className="h-6 w-6 object-contain transition-transform group-hover:scale-110"
                  />
                  <span className={`mt-1 text-[11px] leading-tight text-center break-words max-w-full ${active ? "font-black text-blue-900" : "font-bold text-slate-700"}`}>
                    {need.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. KHỐI LỌC SIDEBAR PC (240px) + DRAWER SP/TABLET & CỘT KẾT QUẢ SẢN PHẨM */}
      <div className="space-y-3 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:items-start lg:space-y-0">
        <CatalogFilterPanel
          key={currentUrlKey}
          activeCount={totalActiveFilters}
          resetHref={resetHref}
          currentUrlKey={currentUrlKey}
        >
          {filterPanelContent}
        </CatalogFilterPanel>

        <div className="min-w-0 space-y-3 sm:space-y-4">
          {/* Thanh tìm kiếm từ khóa, sắp xếp & chips tiêu chí đang chọn (Ngoài drawer) */}
          <section
            aria-label="Bộ lọc chi tiết và sắp xếp"
            className="rounded-xl md:rounded-2xl border border-slate-200/90 bg-white p-3 sm:px-3.5 sm:py-3 shadow-xs space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <SearchAutocomplete
                  initialQuery={query}
                  placeholder="Tìm tên máy, CPU, GPU..."
                  size="sm"
                  className="w-full"
                  inputClassName="!text-base md:!text-xs"
                />
              </div>

              <div className="shrink-0 [&_select]:min-h-11 [&_select]:text-base md:[&_select]:text-xs">
                <CategorySortSelect
                  options={SEARCH_SORT_OPTIONS}
                  defaultSort={query ? "relevance" : "newest"}
                />
              </div>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 mr-1">Đang chọn:</span>
                {chips.map((chip, idx) => (
                  <button
                    key={`${chip.key}-${chip.value}-${idx}`}
                    type="button"
                    onClick={() => removeChip(chip.key, chip.value)}
                    aria-label={`Xóa lọc ${chip.label}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-xl border border-blue-200/90 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer group"
                  >
                    <span className="break-words">{chip.label}</span>
                    <X className="w-3.5 h-3.5 shrink-0 text-blue-500 group-hover:text-rose-600" aria-hidden="true" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="ml-auto inline-flex min-h-11 items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer px-3 py-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Xóa tất cả</span>
                </button>
              </div>
            )}
          </section>

          {/* 3. LƯỚI KẾT QUẢ SẢN PHẨM (SP 2 cột, Tablet 3 cột, PC lg 3 cột / xl 4 cột khi có sidebar 240px) */}
          <section aria-label="Kết quả sản phẩm" className="min-w-0">
            {initialData.products.length === 0 ? (
              <div className="bg-surface-card border border-border-default rounded-2xl p-8 sm:p-10 text-center">
                <EmptyState
                  icon={<Inbox className="w-8 h-8 stroke-1.5" aria-hidden="true" />}
                  title="Không tìm thấy sản phẩm phù hợp"
                  description={
                    query
                      ? `Rất tiếc, không có sản phẩm nào khớp với từ khóa "${query}". Bạn có thể thử tìm kiếm bằng từ khóa ngắn hơn hoặc kiểm tra lỗi chính tả.`
                      : "Không tìm thấy sản phẩm nào với các bộ lọc bạn đã chọn."
                  }
                  action={
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 flex-wrap">
                      {totalActiveFilters > 0 && (
                        <Link
                          href={`${pathname}${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                          className="inline-flex min-h-11 items-center justify-center px-5 py-2.5 rounded-xl bg-brand-primary text-text-inverse font-bold text-body-sm hover:bg-brand-primary-hover transition"
                        >
                          Xóa tất cả bộ lọc
                        </Link>
                      )}
                      <Link
                        href="/chon-laptop"
                        className="inline-flex min-h-11 items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-body-sm hover:bg-blue-100 transition"
                      >
                        <Sparkles className="w-4 h-4 text-blue-600" aria-hidden="true" />
                        <span>Tư vấn chọn laptop phù hợp</span>
                      </Link>
                      <Link
                        href="/phan-loai"
                        className="inline-flex min-h-11 items-center justify-center px-5 py-2.5 rounded-xl border border-border-default bg-surface text-text-primary font-bold text-body-sm hover:border-brand-primary transition"
                      >
                        Khám phá tất cả danh mục
                      </Link>
                    </div>
                  }
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                  {initialData.products.map((product) => (
                    <ProductCard key={`${product.id}:${product.variantId || ""}`} product={product} />
                  ))}
                </div>

                <div className="[&_a]:min-h-11 [&_a]:min-w-11 [&_span[aria-current]]:min-h-11 [&_span[aria-current]]:min-w-11 [&_span[aria-disabled]]:min-h-11">
                  <CategoryPagination
                    currentPage={initialData.page}
                    totalPages={initialData.totalPages}
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
