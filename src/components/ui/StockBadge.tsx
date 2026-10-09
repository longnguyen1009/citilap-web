import React from "react";

export type StockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface StockBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  stock?: number | null;
  state?: StockState;
  lowStockThreshold?: number;
  showCount?: boolean;
  variant?: "badge" | "indicator" | "text";
}

export function resolveStockState(
  stock?: number | null,
  stateOverride?: StockState,
  lowStockThreshold = 3,
  showCount = true
): {
  state: StockState;
  label: string;
  count?: number;
} {
  if (stateOverride) {
    if (stateOverride === "OUT_OF_STOCK") return { state: "OUT_OF_STOCK", label: "Hết hàng" };
    if (stateOverride === "LOW_STOCK") {
      return {
        state: "LOW_STOCK",
        label: showCount && stock ? `Còn ${stock} máy` : "Sắp hết hàng",
        count: stock ?? undefined,
      };
    }
    return { state: "IN_STOCK", label: "Sẵn hàng" };
  }

  if (stock === 0 || (stock !== undefined && stock !== null && stock <= 0)) {
    return { state: "OUT_OF_STOCK", label: "Hết hàng" };
  }

  if (stock !== undefined && stock !== null && stock > 0 && stock <= lowStockThreshold) {
    return {
      state: "LOW_STOCK",
      label: showCount ? `Còn ${stock} máy` : "Sắp hết hàng",
      count: stock,
    };
  }

  return { state: "IN_STOCK", label: "Sẵn hàng" };
}

export function StockBadge({
  stock,
  state: stateOverride,
  lowStockThreshold = 3,
  showCount = true,
  variant = "indicator",
  className = "",
  ...props
}: StockBadgeProps) {
  const { state, label } = resolveStockState(stock, stateOverride, lowStockThreshold, showCount);

  if (variant === "badge") {
    const badgeColors = {
      IN_STOCK: "bg-stock-available-bg text-stock-available border-emerald-200/80",
      LOW_STOCK: "bg-stock-low-bg text-stock-low border-amber-200/80",
      OUT_OF_STOCK: "bg-stock-out-bg text-stock-out border-slate-200/80",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-control text-caption font-semibold border ${badgeColors[state]} ${className}`}
        {...props}
      >
        <span
          className={`w-1.5 h-1.5 rounded-pill ${
            state === "IN_STOCK"
              ? "bg-stock-available"
              : state === "LOW_STOCK"
              ? "bg-stock-low"
              : "bg-stock-out"
          }`}
          aria-hidden="true"
        />
        {label}
      </span>
    );
  }

  // Variant "indicator" (ProductCard footer, listing row)
  const indicatorColors = {
    IN_STOCK: "text-stock-available",
    LOW_STOCK: "text-stock-low",
    OUT_OF_STOCK: "text-stock-out",
  };

  const dotColors = {
    IN_STOCK: "bg-stock-available",
    LOW_STOCK: "bg-stock-low",
    OUT_OF_STOCK: "bg-stock-out",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 text-caption font-medium select-none ${indicatorColors[state]} ${className}`}
      {...props}
    >
      <span className={`w-1.5 h-1.5 rounded-pill shrink-0 ${dotColors[state]}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default StockBadge;
