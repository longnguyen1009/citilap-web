import React from "react";

export type PriceSize = "sm" | "md" | "lg" | "xl";

export interface PriceTagProps {
  price: number | string;
  originalPrice?: number | string | null;
  oldPrice?: number | string | null; // backward compatibility alias
  discount?: string | null;
  size?: PriceSize;
  className?: string;
  priceClassName?: string;
  oldPriceClassName?: string;
}

function parseMoney(val?: string | number | null): number | null {
  if (val === undefined || val === null || val === "") return null;
  if (typeof val === "number") return val;
  const digits = String(val).replace(/\D/g, "");
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? null : parsed;
}

function formatVnd(val?: string | number | null): string {
  if (val === undefined || val === null || val === "") return "";
  if (typeof val === "number") return `${val.toLocaleString("vi-VN")}đ`;
  const parsed = parseMoney(val);
  if (parsed !== null) return `${parsed.toLocaleString("vi-VN")}đ`;
  return String(val);
}

const sizeConfig: Record<
  PriceSize,
  {
    current: string;
    old: string;
    gap: string;
    discountBadge: string;
  }
> = {
  sm: {
    current: "text-sm sm:text-body",
    old: "text-caption",
    gap: "gap-x-1.5",
    discountBadge: "text-caption px-1 py-0.5",
  },
  md: {
    current: "text-body-lg sm:text-title-sm",
    old: "text-caption sm:text-xs",
    gap: "gap-x-2",
    discountBadge: "text-caption px-1.5 py-0.5",
  },
  lg: {
    current: "text-lg sm:text-title",
    old: "text-xs sm:text-sm",
    gap: "gap-x-2.5",
    discountBadge: "text-xs px-2 py-0.5",
  },
  xl: {
    current: "text-title sm:text-heading",
    old: "text-sm sm:text-body",
    gap: "gap-x-3",
    discountBadge: "text-xs sm:text-sm px-2 py-1",
  },
};

export function PriceTag({
  price,
  originalPrice,
  oldPrice,
  discount,
  size = "md",
  className = "",
  priceClassName = "",
  oldPriceClassName = "",
}: PriceTagProps) {
  const config = sizeConfig[size];
  const effectiveOldPrice = originalPrice ?? oldPrice;

  // Derive discount if not explicitly provided
  let formattedDiscount: string | null = null;
  if (discount) {
    formattedDiscount = discount.startsWith("-") ? discount : `-${discount}`;
  } else if (effectiveOldPrice) {
    const curNum = parseMoney(price);
    const oldNum = parseMoney(effectiveOldPrice);
    if (curNum && oldNum && oldNum > curNum) {
      const percent = Math.round(((oldNum - curNum) / oldNum) * 100);
      if (percent > 0) {
        formattedDiscount = `-${percent}%`;
      }
    }
  }

  return (
    <div className={`flex flex-wrap items-baseline ${config.gap} gap-y-0.5 ${className}`}>
      {/* Current price in prominent semantic red */}
      <span
        className={`font-bold text-price-current leading-tight tracking-tight ${config.current} ${priceClassName}`}
      >
        {formatVnd(price)}
      </span>

      {/* Optional old price with strike-through */}
      {effectiveOldPrice != null && (
        <span
          className={`text-price-old line-through leading-tight ${config.old} ${oldPriceClassName}`}
        >
          {formatVnd(effectiveOldPrice)}
        </span>
      )}

      {/* Optional discount pill */}
      {formattedDiscount && (
        <span
          className={`font-bold bg-red-50 text-discount border border-red-200/80 rounded-control leading-none shrink-0 ${config.discountBadge}`}
        >
          {formattedDiscount}
        </span>
      )}
    </div>
  );
}

export default PriceTag;
