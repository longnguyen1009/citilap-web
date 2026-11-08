"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, RotateCcw } from "lucide-react";
import type { FacetOption } from "@/server/services/catalog.service";
import { getAccessoryTypeBySlug } from "@/config/accessory-taxonomy";
import { NEED_LABELS, catalogNeedTag } from "@/lib/catalog-needs";

interface ActiveFilterChipsProps {
  facets: {
    categories?: FacetOption[];
    brands: FacetOption[];
    conditions: FacetOption[];
    connections?: FacetOption[];
    powers?: FacetOption[];
    cpuSeries: FacetOption[];
    gpuSeries: FacetOption[];
  };
}

export default function ActiveFilterChips({ facets }: ActiveFilterChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type");
  const activeCategories = searchParams.getAll("category");
  const activeBrands = searchParams.getAll("brand");
  const activeConnections = searchParams.getAll("connection");
  const activePowers = searchParams.getAll("power");
  const activePricePreset = searchParams.get("pricePreset");
  const activeConditions = searchParams.getAll("condition");
  const activeRams = searchParams.getAll("ram");
  const activeStorage = searchParams.getAll("storage");
  const activeCpus = searchParams.getAll("cpu");
  const activeGpus = searchParams.getAll("gpu");
  const activeYears = searchParams.getAll("year");
  const activeInStock = searchParams.get("inStock") === "1";

  const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    laptop: "Tất cả Laptop",
    "laptop-moi": "Laptop Mới 100%",
    "laptop-likenew": "Laptop Like New",
    "laptop-cu": "Laptop Cũ & Like New",
    "phu-kien": "Phụ kiện Tech",
    "linh-kien": "Linh kiện & Phụ kiện",
  };

  const chips: { key: string; value: string; label: string }[] = [];
  if (activeInStock) {
    chips.push({ key: "inStock", value: "1", label: "Sẵn hàng tại kho" });
  }
  searchParams.getAll("tag").forEach(tag => chips.push({ key: "tag", value: tag, label: `Nhu cầu: ${NEED_LABELS[catalogNeedTag(tag)] || tag.replaceAll("-", " ")}` }));
  if (!activePricePreset) {
    for (const [key, label] of [["minPrice", "Giá từ"], ["maxPrice", "Giá đến"]]) {
      const value = searchParams.get(key);
      if (value !== null) chips.push({ key, value, label: `${label}: ${Number(value).toLocaleString("vi-VN")} ₫` });
    }
  }

  if (activeType) {
    const accType = getAccessoryTypeBySlug(activeType);
    chips.push({
      key: "type",
      value: activeType,
      label: `Loại: ${accType ? accType.shortName : activeType}`,
    });
  }

  activeCategories.forEach((c) => {
    const catObj = (facets.categories || []).find((item) => item.value === c);
    const label = CATEGORY_DISPLAY_NAMES[c] || (catObj ? catObj.label : c);
    chips.push({ key: "category", value: c, label: `Danh mục: ${label}` });
  });

  activeBrands.forEach((b) => {
    const brandObj = facets.brands.find((item) => item.value === b);
    chips.push({ key: "brand", value: b, label: `Hãng: ${brandObj ? brandObj.label : b}` });
  });

  activeConnections.forEach((conn) => {
    chips.push({ key: "connection", value: conn, label: `Kết nối: ${conn}` });
  });

  activePowers.forEach((pow) => {
    chips.push({ key: "power", value: pow, label: `Công suất: ${pow}` });
  });

  if (activePricePreset) {
    const priceLabels: Record<string, string> = {
      // Laptop presets
      "under-15": "Giá: Dưới 15 triệu",
      "15-20": "Giá: 15 - 20 triệu",
      "20-30": "Giá: 20 - 30 triệu",
      "over-30": "Giá: Trên 30 triệu",
      // Accessory presets
      "under-200k": "Giá: Dưới 200k",
      "200k-500k": "Giá: 200k - 500k",
      "500k-1m": "Giá: 500k - 1 triệu",
      "1m-2m": "Giá: 1 - 2 triệu",
      "over-2m": "Giá: Trên 2 triệu",
    };
    chips.push({
      key: "pricePreset",
      value: activePricePreset,
      label: priceLabels[activePricePreset] || "Giá tùy chỉnh",
    });
  }

  activeConditions.forEach((c) => {
    const condObj = facets.conditions.find((item) => item.value === c);
    const condMap: Record<string, string> = {
      NEW: "Mới 100%",
      LIKE_NEW: "LikeNew 99%",
      USED: "Đã qua sử dụng",
      REFURBISHED: "Refurbished",
    };
    const condName = condObj && condObj.label !== condObj.value ? condObj.label : condMap[c] || c;
    chips.push({ key: "condition", value: c, label: `Tình trạng: ${condName}` });
  });

  activeRams.forEach((r) => {
    chips.push({ key: "ram", value: r, label: `RAM: ${r}GB` });
  });

  activeStorage.forEach((s) => {
    const num = Number(s);
    const storageLabel = num >= 1024 ? `${num / 1024}TB` : `${num}GB`;
    chips.push({ key: "storage", value: s, label: `Ổ cứng: ${storageLabel}` });
  });

  activeCpus.forEach((cpu) => {
    chips.push({ key: "cpu", value: cpu, label: `CPU: ${cpu}` });
  });

  activeGpus.forEach((gpu) => {
    chips.push({ key: "gpu", value: gpu, label: `GPU: ${gpu}` });
  });

  activeYears.forEach((yr) => {
    chips.push({ key: "year", value: yr, label: `Năm: ${yr}` });
  });

  if (chips.length === 0) return null;

  const removeChip = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (key === "pricePreset") {
      params.delete("pricePreset");
      params.delete("minPrice");
      params.delete("maxPrice");
    } else if (key === "type" || key === "inStock") {
      params.delete(key);
    } else {
      const currentValues = params.getAll(key);
      params.delete(key);
      currentValues.filter((v) => v !== value).forEach((v) => params.append(key, v));
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-2 px-3 bg-surface-card border border-border-default rounded-xl shadow-2xs">
      <span className="text-xs font-bold text-text-secondary mr-1">Đang lọc:</span>
      {chips.map((chip, idx) => (
        <span
          key={`${chip.key}-${chip.value}-${idx}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-primary-subtle/60 border border-brand-primary/20 text-brand-primary text-xs rounded-lg font-semibold"
        >
          <span>{chip.label}</span>
          <button
            onClick={() => removeChip(chip.key, chip.value)}
            className="hover:text-red-600 text-brand-primary/70 transition cursor-pointer p-0.5 rounded-md hover:bg-red-50"
            aria-label={`Xóa lọc ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={clearAll}
        className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer px-2 py-1"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Xóa tất cả</span>
      </button>
    </div>
  );
}
