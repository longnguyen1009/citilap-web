"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp } from "lucide-react";

export interface SortOptionItem {
  value: string;
  label: string;
}

const DEFAULT_SORT_OPTIONS: SortOptionItem[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá: Thấp đến cao" },
  { value: "price-desc", label: "Giá: Cao đến thấp" },
  { value: "featured", label: "Nổi bật nhất" },
  { value: "best-selling", label: "Bán chạy nhất" },
];

export interface CategorySortSelectProps {
  options?: SortOptionItem[];
  defaultSort?: string;
}

export default function CategorySortSelect({
  options = DEFAULT_SORT_OPTIONS,
  defaultSort = "newest",
}: CategorySortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") || defaultSort;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (val === defaultSort) {
      params.delete("sort");
    } else {
      params.set("sort", val);
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <ArrowDownUp className="w-4 h-4 text-text-secondary hidden sm:block" />
      <span className="text-body-sm font-semibold text-text-secondary whitespace-nowrap hidden sm:inline">
        Sắp xếp:
      </span>
      <select
        value={currentSort}
        onChange={handleSortChange}
        className="bg-surface-card border border-border-default rounded-control px-3 py-2 text-body-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer hover:border-brand-primary transition"
        aria-label="Sắp xếp sản phẩm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
