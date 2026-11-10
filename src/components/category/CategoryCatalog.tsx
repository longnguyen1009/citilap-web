import Link from "next/link";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  Laptop, 
  PackageCheck,
  Zap,
  Cable,
  Sparkles,
  Check,
  Gamepad2,
  Briefcase,
  Feather,
  Palette,
  GraduationCap,
  Touchpad,
  ArrowUpDown,
  Cpu,
  Layers,
  Calendar,
  RotateCcw,
  ShieldCheck,
  HardDrive
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import CategoryFilterBehavior from "./CategoryFilterBehavior";
import CatalogFilterPanel from "./CatalogFilterPanel";
import { categoryAncestors } from "@/lib/category-paths";
import { NEED_LABELS, catalogNeedTag } from "@/lib/catalog-needs";
import { ACCESSORY_PRICE_PRESETS, ACCESSORY_TYPES } from "@/config/accessory-taxonomy";
import type { SearchResult, SearchFacets } from "@/server/services/search.service";
import type { FacetOption } from "@/server/services/catalog.service";

type Category = { 
  id: string; 
  name: string; 
  slug: string; 
  href: string; 
  parentId: string | null; 
  description: string; 
  image?: string | null; 
};

const LAPTOP_PRICES = [
  { value: "under-15", label: "Dưới 15 triệu" }, 
  { value: "15-20", label: "15 – 20 triệu" }, 
  { value: "20-30", label: "20 – 30 triệu" }, 
  { value: "over-30", label: "Trên 30 triệu" }
];

const SORTS = [
  { value: "relevance", label: "Phù hợp nhất" }, 
  { value: "featured", label: "Nổi bật" }, 
  { value: "best-selling", label: "Bán chạy" }, 
  { value: "newest", label: "Mới về" }, 
  { value: "price-asc", label: "Giá thấp → cao" }, 
  { value: "price-desc", label: "Giá cao → thấp" }
];

const STANDARD_NEEDS = [
  { key: "van-phong", label: "Văn phòng", icon: Briefcase, image: "/needs/van-phong.svg" },
  { key: "gaming", label: "Gaming", icon: Gamepad2, image: "/needs/gaming.svg" },
  { key: "mong-nhe", label: "Mỏng nhẹ", icon: Feather, image: "/needs/mong-nhe.svg" },
  { key: "do-hoa", label: "Đồ họa – kỹ thuật", icon: Palette, image: "/needs/do-hoa.svg" },
  { key: "sinh-vien", label: "Sinh viên", icon: GraduationCap, image: "/needs/sinh-vien.svg" },
  { key: "cam-ung", label: "Cảm ứng", icon: Touchpad, image: "/needs/cam-ung.svg" },
  { key: "laptop-ai", label: "Laptop AI", icon: Zap, image: "/needs/laptop-ai.svg" },
  { key: "doanh-nhan", label: "Doanh nhân", icon: Briefcase, image: "/needs/doanh-nhan.svg" },
];

const BRAND_LOGOS: Record<string, string> = {
  lenovo: "/brands/lenovo.svg",
  hp: "/brands/hp.svg",
  dell: "/brands/dell.svg",
  asus: "/brands/asus.svg",
  acer: "/brands/acer.svg",
  apple: "/brands/apple.svg",
  msi: "/brands/msi.svg",
  gigabyte: "/brands/gigabyte.svg",
};

const DEFAULT_YEARS = ["2026", "2025", "2024", "2023", "2022", "2021"];

const FILTER_LABELS: Record<string, string> = {
  brand: "Hãng", 
  subcat: "Dòng máy",
  year: "Năm SX",
  cpu: "CPU", 
  gpu: "Card đồ họa", 
  ram: "RAM", 
  storage: "Ổ cứng", 
  condition: "Tình trạng",
  type: "Loại phụ kiện", 
  connection: "Kết nối", 
  power: "Công suất", 
  tag: "Nhu cầu", 
  q: "Từ khóa", 
  inStock: "Tồn kho",
};

export default function CategoryCatalog({ 
  category, 
  categories, 
  result, 
  facets, 
  brandCounts,
  params, 
  isAccessory 
}: {
  category: Category; 
  categories: Category[]; 
  result: SearchResult; 
  facets: SearchFacets; 
  brandCounts: FacetOption[];
  params: URLSearchParams; 
  isAccessory: boolean;
}) {
  const ancestors = categoryAncestors(category, categories);
  const isRoot = ancestors.length === 1;
  const isLevel2 = ancestors.length === 2;
  const isLevel3 = ancestors.length >= 3;
  const rootCategory = ancestors[0] || category;

  // Danh sách dòng máy phân loại con Cấp 2 thuộc phân loại cha
  const rawLevel2 = categories.filter(c => c.parentId === rootCategory.id);
  const level2Categories = rawLevel2.filter(c => {
    const isGenericBrand = ['asus', 'gigabyte', 'lenovo', 'acer', 'msi', 'hp', 'dell', 'apple'].includes(c.slug.toLowerCase());
    if (isGenericBrand && rawLevel2.length > 7) return false;
    const hasImage = Boolean(c.image);
    const hasChildren = categories.some(child => child.parentId === c.id);
    const isDongMay = ['legion', 'rog', 'nitro', 'alienware', 'omen', 'loq', 'predator', 'msi-gaming', 'gigabyte-gaming', 'tuf', 'thinkpad', 'zenbook', 'vivobook', 'xps', 'latitude', 'elitebook', 'swift', 'aspire', 'precision', 'zbook'].some(k => c.slug.includes(k) || c.id.includes(k));
    return hasImage || hasChildren || isDongMay || rawLevel2.length <= 8;
  });

  // Phân loại con Cấp 3 (khi ở Cấp 2 hoặc Cấp 3)
  const currentLevel2 = isLevel2 ? category : isLevel3 ? ancestors[1] : null;
  const level3Categories = currentLevel2 ? categories.filter(c => c.parentId === currentLevel2.id) : [];

  const getSubcategoryImage = (sub: Category) => {
    if (sub.image) return sub.image;
    const lower = (sub.slug + " " + sub.name).toLowerCase();
    for (const [brandKey, logoPath] of Object.entries(BRAND_LOGOS)) {
      if (lower.includes(brandKey)) return logoPath;
    }
    return null;
  };

  const url = (query: URLSearchParams) => category.href + (query.size ? `?${query}` : "");
  
  const selected = (key: string, value: string) => 
    params.getAll(key).some(v => key === "tag" ? catalogNeedTag(v) === value : v === value);

  const toggle = (key: string, value: string, multi = true) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (key === "pricePreset") { 
      next.delete("minPrice"); 
      next.delete("maxPrice"); 
    }
    const values = next.getAll(key);
    next.delete(key);
    if (multi) {
      values.filter(v => (key === "tag" ? catalogNeedTag(v) : v) !== value).forEach(v => next.append(key, v));
    }
    if (!selected(key, value)) {
      next.append(key, value);
    }
    return url(next);
  };

  const hidden = (omit: string[]) => 
    [...params.entries()]
      .filter(([key]) => !omit.includes(key))
      .map(([key, value], index) => <input key={`${key}-${index}`} type="hidden" name={key} value={value} />);

  const prices = isAccessory ? ACCESSORY_PRICE_PRESETS : LAPTOP_PRICES;

  // Lấy facet năm sản xuất
  const facetYears = facets.years && facets.years.length > 0 
    ? facets.years 
    : DEFAULT_YEARS.map(y => ({ value: y, label: `Năm ${y}`, count: 0 }));

  const conditionOptions: FacetOption<string>[] = (facets.conditions || []).map((c) => {
    const condLabels: Record<string, string> = {
      NEW: "Mới 100% Fullbox",
      LIKE_NEW: "LikeNew 99%",
      USED: "Đã qua sử dụng",
      REFURBISHED: "Refurbished",
    };
    return {
      value: c.value,
      label: condLabels[String(c.value)] || c.label,
      count: c.count,
    };
  });

  // Cấu hình các nhóm lọc chuyên biệt chi tiết
  const filterGroups: { key: string; label: string; icon?: React.ReactNode; options: FacetOption<string | number>[] }[] = isAccessory ? [
    { key: "type", label: "Loại phụ kiện", icon: <Layers size={14} />, options: ACCESSORY_TYPES.map(t => ({ value: t.slug, label: t.shortName, count: 0 })) },
    { key: "connection", label: "Chuẩn kết nối", icon: <Cable size={14} />, options: facets.connections || [] },
    { key: "power", label: "Công suất", icon: <Zap size={14} />, options: facets.powers || [] },
  ] : [
    ...(conditionOptions.length > 0 && !["laptop-moi", "laptop-likenew"].includes(category.slug)
      ? [{ key: "condition", label: "Tình trạng", icon: <ShieldCheck size={14} />, options: conditionOptions }]
      : []),
    ...(level2Categories.length > 0 && facets.brands.length > 0
      ? [{ key: "brand", label: "Hãng sản xuất", icon: <Laptop size={14} />, options: facets.brands }]
      : []),
    { key: "cpu", label: "CPU", icon: <Cpu size={14} />, options: facets.cpuSeries },
    { key: "gpu", label: "Card đồ họa", icon: <Laptop size={14} />, options: facets.gpuSeries },
    { key: "ram", label: "Dung lượng RAM", icon: <Layers size={14} />, options: facets.ramOptions },
    ...(facets.storageOptions && facets.storageOptions.length > 0
      ? [{ key: "storage", label: "Ổ cứng SSD", icon: <HardDrive size={14} />, options: facets.storageOptions }]
      : []),
    { key: "year", label: "Năm sản xuất", icon: <Calendar size={14} />, options: facetYears },
  ];

  const fallbackLabel = (key: string, value: string) => 
    key === "tag" ? NEED_LABELS[catalogNeedTag(value)] || value 
    : key === "condition" ? ({ NEW: "Mới 100%", LIKE_NEW: "LikeNew 99%", USED: "Đã qua SD", REFURBISHED: "Refurbished" }[value] || value)
    : key === "year" ? `Năm ${value}`
    : key === "ram" ? `${value}GB` 
    : key === "storage" ? (Number(value) >= 1024 ? `${Number(value)/1024}TB` : `${value}GB`) 
    : value;

  const selectedOptions = (group: typeof filterGroups[number]) => [
    ...group.options.filter(o => selected(group.key, String(o.value))),
    ...params.getAll(group.key)
      .filter(value => !group.options.some(o => String(o.value) === value))
      .map(value => ({ value, label: fallbackLabel(group.key, value), count: 0 })),
  ];

  const remove = (entries: [string, string][]) => {
    const next = new URLSearchParams([...params.entries()].filter(([key, value]) => key !== "page" && !entries.some(([k, v]) => k === key && v === value)));
    return url(next);
  };

  const money = (value: string) => `${Number(value).toLocaleString("vi-VN")} ₫`;
  const priceText = params.has("minPrice") || params.has("maxPrice")
    ? params.has("minPrice") && params.has("maxPrice") ? `${money(params.get("minPrice")!)} – ${money(params.get("maxPrice")!)}`
      : `${params.has("minPrice") ? "Từ" : "Đến"} ${money((params.get("minPrice") || params.get("maxPrice"))!)}`
    : prices.find(p => p.value === params.get("pricePreset"))?.label;

  // Xây dựng danh sách chips tóm tắt bộ lọc đang active
  const active = new Map<string, { label: string; values: string[]; entries: [string, string][] }>();
  for (const [key, value] of params) {
    if (["page", "sort", "limit"].includes(key) || (key === "inStock" && value !== "1")) continue;
    const id = ["minPrice", "maxPrice", "pricePreset"].includes(key) ? "price" : key === "tag" && NEED_LABELS[catalogNeedTag(value)] ? "need" : key;
    const label = id === "price" ? "Giá" : id === "need" ? "Nhu cầu" : key === "subcat" ? (isLevel2 ? "Phiên bản" : "Dòng máy") : FILTER_LABELS[key] || key;
    const group = active.get(id) || { label, values: [], entries: [] };
    
    let text = "";
    if (id === "price") {
      text = priceText || value;
    } else if (key === "inStock") {
      text = "Sẵn hàng";
    } else if (key === "subcat") {
      const matchL2 = level2Categories.find(s => s.slug === value || s.id === value);
      const matchL3 = level3Categories.find(s => s.slug === value || s.id === value);
      text = matchL2 ? matchL2.name : matchL3 ? matchL3.name : value;
    } else if (key === "brand") {
      const b = facets.brands.find(o => String(o.value) === value);
      text = b ? b.label : value;
    } else {
      const option = filterGroups.flatMap(g => g.key === key ? g.options : []).find(o => String(o.value) === (key === "tag" ? catalogNeedTag(value) : value));
      text = String(option?.label || fallbackLabel(key, value));
    }

    if (!group.values.includes(text)) group.values.push(text);
    group.entries.push([key, value]);
    active.set(id, group);
  }
  const chips = [...active].map(([key, group]) => ({ key, text: `${group.label}: ${group.values.join(", ")}`, href: remove(group.entries) }));

  const sort = params.get("sort") || (result.query ? "relevance" : "newest");
  const pageHref = (page: number) => { 
    const next = new URLSearchParams(params); 
    if (page === 1) next.delete("page"); 
    else next.set("page", String(page)); 
    return url(next); 
  };
  const pages = [...new Set([1, result.page - 1, result.page, result.page + 1, result.totalPages])].filter(page => page > 0 && page <= result.totalPages).sort((a, b) => a - b);
  const currentUrlKey = url(params);

  const visibleNeeds = STANDARD_NEEDS.filter((need) => {
    const slugLower = category.slug.toLowerCase();
    if (need.key === "gaming" && slugLower.includes("gaming")) return false;
    if (need.key === "van-phong" && slugLower.includes("van-phong")) return false;
    if (need.key === "do-hoa" && (slugLower.includes("workstation") || slugLower.includes("do-hoa"))) return false;
    if (need.key === "mong-nhe" && slugLower.includes("mong-nhe")) return false;
    return true;
  });

  // Shared server-rendered filter options JSX (zero duplicate IDs, reused by PC sidebar + SP/tablet drawer)
  const filterPanelContent = (
    <div className="space-y-2.5" data-filter-inflow="true">
      {/* 1. Nút Sẵn hàng */}
      <Link
        href={toggle("inStock", "1", false)}
        scroll={false}
        aria-current={selected("inStock", "1") ? "true" : undefined}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition select-none ${
          selected("inStock", "1")
            ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20 font-bold shadow-xs"
            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
        }`}
      >
        <span className="flex items-center gap-2">
          <PackageCheck size={15} className={selected("inStock", "1") ? "text-emerald-600 shrink-0" : "text-slate-500 shrink-0"} aria-hidden="true" />
          <span>Sẵn hàng</span>
        </span>
        {selected("inStock", "1") && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check size={9} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </Link>

      {/* 2. In-flow details Mức giá */}
      <details data-category-filter data-inflow="true" open className="group rounded-xl border border-slate-200/90 bg-slate-50/30">
        <summary className={`flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition select-none [&::-webkit-details-marker]:hidden ${
          params.has("pricePreset") || params.has("minPrice") || params.has("maxPrice")
            ? "text-blue-800 font-bold"
            : "text-slate-800 hover:text-blue-600"
        }`}>
          <span className="min-w-0 break-words" title={priceText}>
            {priceText ? <>Mức giá: <strong className="text-blue-700">{priceText}</strong></> : "Mức giá"}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {priceText && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check size={9} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
            <ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </span>
        </summary>

        <div className="border-t border-slate-200/80 px-2.5 pb-2.5 pt-2 space-y-1.5">
          {params.has("pricePreset") && (
            <div className="flex justify-end">
              <Link
                href={toggle("pricePreset", params.get("pricePreset")!, false)}
                scroll={false}
                className="inline-flex min-h-11 items-center px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Bỏ chọn
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {prices.map((p) => {
              const isPresetActive = selected("pricePreset", p.value);
              return (
                <Link
                  key={p.value}
                  href={toggle("pricePreset", p.value, false)}
                  scroll={false}
                  aria-current={isPresetActive ? "true" : undefined}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer select-none ${
                    isPresetActive
                      ? "border border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-2xs"
                      : "border border-slate-200/80 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="break-words">{p.label}</span>
                  {isPresetActive && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      ✓
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </details>

      {/* 3. In-flow details: Tình trạng, Hãng, CPU, Card đồ họa, RAM, Ổ cứng, Năm SX / Phụ kiện */}
      {filterGroups.map((group, index) => {
        const options = selectedOptions(group);
        const activeCount = options.length;
        const values = options.map(o => o.label).join(", ");

        return (
          <details key={`${group.key}-${index}`} data-category-filter data-inflow="true" open className="group rounded-xl border border-slate-200/90 bg-slate-50/30">
            <summary className={`flex min-h-11 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition select-none [&::-webkit-details-marker]:hidden ${
              activeCount > 0
                ? "text-blue-800 font-bold"
                : "text-slate-800 hover:text-blue-600"
            }`}>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 text-slate-500">{group.icon}</span>
                <span className="min-w-0 break-words" title={values || group.label}>
                  {activeCount > 0 ? <>{group.label}: <strong className="text-blue-700">{values}</strong></> : group.label}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {activeCount > 0 && (
                  <span className="flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
                <ChevronDown size={14} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </summary>

            <div className="border-t border-slate-200/80 px-2.5 pb-2.5 pt-2 space-y-1.5">
              {activeCount > 0 && (
                <div className="flex justify-end">
                  <Link
                    href={remove(group.options.map(o => [group.key, String(o.value)]))}
                    scroll={false}
                    className="inline-flex min-h-11 items-center px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Bỏ chọn ({activeCount})
                  </Link>
                </div>
              )}

              <div className="max-h-56 overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                {group.options.map((option) => {
                  const isOptionChecked = selected(group.key, String(option.value));
                  const targetHref = toggle(group.key, String(option.value));

                  return (
                    <Link
                      key={String(option.value)}
                      href={targetHref}
                      scroll={false}
                      aria-current={isOptionChecked ? "true" : undefined}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition cursor-pointer select-none ${
                        isOptionChecked
                          ? "bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs"
                          : "bg-white text-slate-800 hover:bg-slate-50 hover:text-blue-600 border border-slate-100"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition ${
                          isOptionChecked
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}>
                          {isOptionChecked && <Check size={11} strokeWidth={3.5} aria-hidden="true" />}
                        </span>
                        <span className="break-words">{option.label}</span>
                      </div>
                      {option.count > 0 && (
                        <span className={`shrink-0 text-[10px] ${isOptionChecked ? "text-blue-600 font-semibold" : "text-slate-400 font-normal"}`}>
                          ({option.count})
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4" data-catalog-kind={isAccessory ? "accessory" : "laptop"}>
      <CategoryFilterBehavior />

      {/* 1. KHỐI HEADER DANH MỤC, PHÂN LOẠI CON & NHU CẦU SỬ DỤNG */}
      <section aria-label="Phân loại con và Nhu cầu" className="rounded-xl md:rounded-2xl border border-slate-200/90 bg-white p-2.5 sm:p-3.5 shadow-xs space-y-2.5 sm:space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
              {category.name}
            </h1>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              ({result.totalCount} sản phẩm)
            </span>
          </div>

          <Link
            href="/chon-laptop"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-200/80 bg-blue-50/80 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100/80 transition ml-auto"
          >
            <Sparkles size={13} className="text-amber-500 shrink-0" aria-hidden="true" />
            <span>Tư vấn chọn máy</span>
          </Link>
        </div>

        {/* Phần Phân loại con Cấp 2 (Dòng máy của danh mục cha - vuốt ngang mượt trên mobile, wrap trên desktop) */}
        {level2Categories.length > 0 ? (
          <nav aria-label="Chọn dòng máy" className="flex flex-nowrap md:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto md:overflow-visible overscroll-x-contain snap-x snap-mandatory hide-scrollbar -mx-1 px-1 pb-0.5 md:mx-0 md:px-0 md:pb-0">
            {level2Categories.map(sub => {
              const checked = isRoot
                ? (selected("subcat", sub.slug) || selected("subcat", sub.id))
                : (currentLevel2?.id === sub.id || currentLevel2?.slug === sub.slug);
              const subImage = getSubcategoryImage(sub);
              const targetHref = isRoot
                ? toggle("subcat", sub.slug)
                : currentLevel2?.id === sub.id ? rootCategory.href : sub.href;

              return (
                <Link
                  key={sub.id}
                  href={targetHref}
                  aria-current={checked ? "true" : undefined}
                  title={sub.name}
                  className={`group relative flex w-[78px] sm:w-[104px] md:w-[114px] min-h-[58px] sm:min-h-[72px] flex-col items-center justify-center rounded-lg md:rounded-xl border p-1.5 sm:p-2 transition text-center select-none shrink-0 snap-start ${
                    checked
                      ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/60 text-blue-900 shadow-xs ring-2 ring-blue-500/25"
                      : "border-slate-200 bg-slate-50/40 text-slate-700 hover:border-blue-400 hover:bg-white hover:shadow-xs"
                  }`}
                >
                  {checked && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs z-10 text-[9px] sm:text-[10px] font-black">
                      ✓
                    </span>
                  )}

                  <div className="flex h-5 sm:h-7 items-center justify-center">
                    {subImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async"
                        src={subImage}
                        alt={sub.name}
                        className="max-h-5 sm:max-h-7 max-w-[54px] sm:max-w-[74px] object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-[11px] sm:text-xs font-black tracking-wider text-slate-700 uppercase">
                        {sub.name.slice(0, 6)}
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight mt-1 line-clamp-2 leading-tight text-center max-w-full px-0.5 ${
                    checked ? "text-blue-900" : "text-slate-800"
                  }`}>
                    {sub.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : facets.brands.length > 0 ? (
          /* Fallback cho danh mục không có phân loại con: hiển thị thương hiệu kèm số lượng thật */
          <nav aria-label="Chọn thương hiệu" className="flex flex-nowrap md:flex-wrap items-center gap-2 sm:gap-2.5 overflow-x-auto md:overflow-visible overscroll-x-contain snap-x snap-mandatory hide-scrollbar -mx-1 px-1 pb-0.5 md:mx-0 md:px-0 md:pb-0">
            {facets.brands.map(brand => {
              const brandSlug = String(brand.value).toLowerCase();
              const logoSrc = BRAND_LOGOS[brandSlug];
              const checked = selected("brand", brand.value);
              const count = brandCounts.find(b => b.value === brand.value)?.count || 0;

              return (
                <Link
                  key={brand.value}
                  href={toggle("brand", brand.value)}
                  aria-current={checked ? "true" : undefined}
                  title={`${brand.label}: ${count} ${isAccessory ? "sản phẩm" : "máy"}`}
                  className={`group relative flex w-[78px] sm:w-[104px] md:w-[114px] min-h-[58px] sm:min-h-[72px] flex-col items-center justify-center rounded-lg md:rounded-xl border p-1.5 sm:p-2 transition text-center select-none shrink-0 snap-start ${
                    checked
                      ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/60 text-blue-900 shadow-xs ring-2 ring-blue-500/25"
                      : "border-slate-200 bg-slate-50/40 text-slate-700 hover:border-blue-400 hover:bg-white hover:shadow-xs"
                  }`}
                >
                  {checked && (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs z-10 text-[9px] sm:text-[10px] font-black">
                      ✓
                    </span>
                  )}

                  <div className="flex h-5 sm:h-7 items-center justify-center">
                    {logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async"
                        src={logoSrc}
                        alt={brand.label}
                        className="max-h-5 sm:max-h-7 max-w-[54px] sm:max-w-[74px] object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-[11px] sm:text-xs font-black tracking-wider text-slate-700 uppercase">
                        {brand.label}
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight mt-1 line-clamp-2 leading-tight text-center max-w-full px-0.5 ${
                    checked ? "text-blue-900" : "text-slate-800"
                  }`}>
                    {brand.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* HÀNG PHÂN LOẠI CHI TIẾT (CẤP 3) */}
        {level3Categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs sm:text-sm font-black text-slate-700 flex items-center gap-1.5 shrink-0 mr-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              Phân loại chi tiết:
            </span>

            <nav aria-label="Chọn phân loại chi tiết" className="flex flex-wrap items-center gap-2">
              {level3Categories.map(sub3 => {
                const checked = isLevel3 && category.id === sub3.id
                  ? true
                  : selected("subcat", sub3.slug) || selected("subcat", sub3.id);
                const sub3Href = toggle("subcat", sub3.slug);

                return (
                  <Link
                    key={sub3.id}
                    href={sub3Href}
                    aria-current={checked ? "true" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition cursor-pointer select-none shadow-2xs ${
                      checked
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-indigo-400 hover:bg-white"
                    }`}
                  >
                    <span>{sub3.name}</span>
                    {checked && (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 text-[11px] font-black">
                        ✓
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {(level2Categories.length > 0 || facets.brands.length > 0) && !isAccessory && (
          <div className="border-t border-slate-100" />
        )}

        {/* Phần Nhu cầu sử dụng (ẩn thẻ trùng với danh mục hiện tại) */}
        {!isAccessory && visibleNeeds.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600 shrink-0" aria-hidden="true" />
              <span>Lọc theo nhu cầu</span>
            </h2>

            <nav aria-label="Chọn nhu cầu" className="flex flex-nowrap overflow-x-auto md:overflow-visible overscroll-x-contain snap-x snap-mandatory hide-scrollbar -mx-1 px-1 pb-0.5 md:mx-0 md:px-0 md:pb-0 md:flex-wrap gap-1.5 sm:gap-2">
              {visibleNeeds.map((need) => {
                const checked = selected("tag", need.key);
                return (
                  <Link
                    key={need.key}
                    href={toggle("tag", need.key)}
                    scroll={false}
                    aria-current={checked ? "true" : undefined}
                    className={`group relative flex shrink-0 snap-start min-h-10 sm:min-h-[58px] flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 rounded-xl border py-1.5 px-2.5 sm:p-2 sm:w-[96px] md:w-[104px] transition text-center select-none ${
                      checked
                        ? "border-blue-600 bg-gradient-to-b from-blue-50/90 to-indigo-50/60 shadow-xs ring-2 ring-blue-500/25"
                        : "border-slate-200 bg-slate-50/40 hover:border-blue-400 hover:bg-white hover:shadow-xs"
                    }`}
                  >
                    {checked && (
                      <span className="hidden sm:flex absolute right-1 top-1 h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs z-10 text-[9px] font-black">
                        ✓
                      </span>
                    )}

                    <div className="flex h-4 sm:h-6 items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img loading="lazy" decoding="async"
                        src={need.image}
                        alt={need.label}
                        className="max-h-4 sm:max-h-6 w-auto object-contain transition-transform group-hover:scale-110 duration-200 drop-shadow-2xs"
                      />
                    </div>

                    <span className={`text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap sm:whitespace-normal sm:line-clamp-2 max-w-full ${
                      checked ? "text-blue-900 font-black" : "text-slate-800"
                    }`}>
                      {need.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

      </section>

      {/* 2. KHỐI LỌC SIDEBAR PC (240px) + DRAWER SP/TABLET & CỘT KẾT QUẢ SẢN PHẨM */}
      <div className="space-y-2.5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6 lg:items-start lg:space-y-0">
        <CatalogFilterPanel
          activeCount={chips.length}
          resetHref={category.href}
          currentUrlKey={currentUrlKey}
          resultCount={result.totalCount}
        >
          {filterPanelContent}
        </CatalogFilterPanel>

        <div className="min-w-0 space-y-3 sm:space-y-4">
          {/* Active Summary Bar (Ngoài drawer) */}
          {chips.length > 0 && (
            <nav aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center justify-between gap-2 rounded-xl md:rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 px-3 py-2 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-blue-950 flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal size={13} className="text-blue-700" aria-hidden="true" />
                  Đang lọc ({chips.length}):
                </span>
                {chips.map((chip, i) => (
                  <Link
                    key={i}
                    href={chip.href}
                    scroll={false}
                    aria-label={`Xóa tiêu chí ${chip.text}`}
                    className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition shadow-2xs group"
                  >
                    <span className="break-words">{chip.text}</span>
                    <X size={13} className="shrink-0 text-blue-500 group-hover:text-rose-600" aria-hidden="true" />
                  </Link>
                ))}
              </div>

              <Link
                href={category.href}
                scroll={false}
                className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100/70 hover:text-rose-800 transition shrink-0"
              >
                <RotateCcw size={12} aria-hidden="true" />
                <span>Xóa tất cả</span>
              </Link>
            </nav>
          )}

          {/* Product Listing Grid, GET Search Form & Sorting Bar */}
          <section aria-label="Kết quả sản phẩm" className="min-w-0 space-y-3 sm:space-y-4">
            <div className="flex flex-col gap-2.5 bg-white p-2.5 sm:px-4 sm:py-3 rounded-xl md:rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <p role="status" className="hidden sm:block text-xs sm:text-sm text-slate-600">
                  Hiển thị <strong className="font-bold text-slate-900">{result.products.length}</strong> / <strong className="font-bold text-slate-900">{result.totalCount}</strong> sản phẩm
                  {result.query && <> khớp với “<span className="text-blue-600 font-bold">{result.query}</span>”</>}
                </p>

                {/* Ô Searchbox GET lọc nhanh trong danh mục (ẩn mặc định trên SP trừ khi đang có từ khóa để tiết kiệm chiều dọc, hiển thị trên sm+) */}
                <div className={`w-full sm:w-auto ${result.query ? "block" : "hidden sm:block"}`}>
                  <form action={category.href} method="get" className="relative flex items-center gap-1.5">
                    {hidden(["q", "page"])}
                    <div className="relative flex min-w-0 flex-1 items-center sm:w-60 md:w-68">
                      <input
                        type="search"
                        name="q"
                        aria-label="Tìm sản phẩm trong danh mục"
                        defaultValue={result.query || ""}
                        placeholder={`Tìm nhanh trong ${category.name}...`}
                        className={`h-10 min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 ${result.query ? "pr-10" : "pr-3"} text-base md:text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition shadow-2xs`}
                      />
                      <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" aria-hidden="true" />
                      {result.query && (
                        <Link
                          href={toggle("q", result.query, false)}
                          title="Xóa tìm kiếm"
                          aria-label="Xóa từ khóa tìm kiếm"
                          className="absolute right-0 inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl"
                        >
                          <X size={15} aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                    <button
                      type="submit"
                      title="Tìm kiếm"
                      aria-label="Tìm kiếm"
                      className="inline-flex h-10 min-h-10 min-w-10 px-3 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs font-bold text-xs shrink-0 cursor-pointer"
                    >
                      <Search size={15} aria-hidden="true" />
                      <span className="hidden md:inline">Lọc</span>
                    </button>
                  </form>
                </div>
              </div>

              <nav aria-label="Sắp xếp sản phẩm" className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 overflow-x-auto sm:overflow-visible overscroll-x-contain snap-x snap-mandatory hide-scrollbar -mx-1 px-1 sm:pt-2 sm:border-t sm:border-slate-100 sm:mx-0 sm:px-0">
                <span className="mr-1 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <ArrowUpDown size={13} aria-hidden="true" />
                  Sắp xếp:
                </span>
                {SORTS.filter(s => s.value !== "relevance" || result.query).map((s) => {
                  const next = new URLSearchParams(params);
                  next.set("sort", s.value);
                  next.delete("page");
                  const isSortActive = sort === s.value;
                  return (
                    <Link
                      key={s.value}
                      href={url(next)}
                      scroll={false}
                      aria-current={isSortActive ? "true" : undefined}
                      className={`inline-flex min-h-10 items-center shrink-0 whitespace-nowrap snap-start rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        isSortActive
                          ? "bg-slate-900 text-white shadow-xs font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Product Cards Grid: SP 2 cột, Tablet 3 cột, PC lg 3 cột / xl 4 cột khi có sidebar 240px */}
            {result.products.length ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} showSpecs={!isAccessory} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs text-center">
                <EmptyState
                  title="Không tìm thấy sản phẩm phù hợp"
                  description={`Rất tiếc, không có sản phẩm nào thỏa mãn tất cả tiêu chí bạn đã chọn trong danh mục ${category.name}. Bạn vui lòng thử bỏ bớt bộ lọc.`}
                  action={
                    <Link
                      href={category.href}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      Xem tất cả {category.name}
                    </Link>
                  }
                />
              </div>
            )}

            {/* Pagination */}
            {result.totalPages > 1 && (
              <nav aria-label="Phân trang sản phẩm" className="flex flex-wrap items-center justify-center gap-2 pt-4 sm:pt-6">
                {result.page > 1 && (
                  <Link
                    href={pageHref(result.page - 1)}
                    rel="prev"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition shadow-xs"
                  >
                    Trang trước
                  </Link>
                )}

                {pages.map((page, i) => (
                  <span key={page} className="inline-flex items-center gap-1.5">
                    {i > 0 && page - pages[i - 1] > 1 && (
                      <span className="px-1 text-slate-400 font-bold" aria-hidden="true">…</span>
                    )}
                    <Link
                      href={pageHref(page)}
                      aria-label={`Trang ${page}`}
                      aria-current={page === result.page ? "page" : undefined}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition shadow-xs ${
                        page === result.page
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {page}
                    </Link>
                  </span>
                ))}

                {result.page < result.totalPages && (
                  <Link
                    href={pageHref(result.page + 1)}
                    rel="next"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition shadow-xs"
                  >
                    Trang sau
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
