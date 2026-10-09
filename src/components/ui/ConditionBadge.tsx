import React from "react";
import { Badge, type BadgeSize } from "./Badge";

export type ConditionCode =
  | "NEW"
  | "LIKE_NEW"
  | "USED"
  | "REFURBISHED"
  | "REPAIRED"
  | "LIQUIDATION"
  | "DAMAGED";

export interface ConditionMeta {
  code: ConditionCode;
  label: string;
  variant: "condition-new" | "condition-like-new" | "condition-used";
  description?: string;
}

export const CONDITION_METAS: Record<ConditionCode, ConditionMeta> = {
  NEW: {
    code: "NEW",
    label: "Mới 100%",
    variant: "condition-new",
    description: "Máy mới nguyên hộp, chính hãng",
  },
  LIKE_NEW: {
    code: "LIKE_NEW",
    label: "Like New 99%",
    variant: "condition-like-new",
    description: "Máy như mới, ngoại hình đẹp 99%",
  },
  USED: {
    code: "USED",
    label: "Đã qua sử dụng",
    variant: "condition-used",
    description: "Máy cũ chính hãng, đã kiểm tra kỹ thuật",
  },
  REFURBISHED: {
    code: "REFURBISHED",
    label: "Hàng Refurbished",
    variant: "condition-like-new",
    description: "Hàng tân trang từ nhà sản xuất",
  },
  REPAIRED: {
    code: "REPAIRED",
    label: "Đã sửa chữa",
    variant: "condition-used",
    description: "Đã thay thế linh kiện hoặc sửa chữa",
  },
  LIQUIDATION: {
    code: "LIQUIDATION",
    label: "Hàng thanh lý",
    variant: "condition-used",
    description: "Hàng thanh lý xả kho giá tốt",
  },
  DAMAGED: {
    code: "DAMAGED",
    label: "Lỗi nhẹ",
    variant: "condition-used",
    description: "Có cấn xước hoặc lỗi ngoại quan nhẹ",
  },
};

/**
 * Standard mapper: converts condition code or legacy string to ConditionMeta.
 * Legacy name inference is isolated strictly inside this fallback helper.
 */
export function resolveConditionMeta(
  condition?: string | null,
  fallbackName?: string
): ConditionMeta {
  if (condition) {
    const normalized = condition.toUpperCase().trim() as ConditionCode;
    if (CONDITION_METAS[normalized]) {
      return CONDITION_METAS[normalized];
    }
    // Check known keywords in legacy string
    if (condition.includes("99%") || condition.toLowerCase().includes("like new")) {
      return CONDITION_METAS.LIKE_NEW;
    }
    if (condition.includes("100%") || condition.toLowerCase().includes("mới")) {
      return CONDITION_METAS.NEW;
    }
    if (condition.toLowerCase().includes("cũ") || condition.toLowerCase().includes("used")) {
      return CONDITION_METAS.USED;
    }
    // Custom label fallback
    return {
      code: "USED",
      label: condition,
      variant: "condition-used",
    };
  }

  // Isolated legacy fallback for unmigrated mock items
  if (fallbackName) {
    const lower = fallbackName.toLowerCase();
    if (lower.includes("like new") || lower.includes("99%") || lower.includes("lướt")) {
      return CONDITION_METAS.LIKE_NEW;
    }
    if (lower.includes("98%")) {
      return {
        code: "LIKE_NEW",
        label: "Like New 98%",
        variant: "condition-like-new",
      };
    }
  }

  return CONDITION_METAS.NEW;
}

export interface ConditionBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  condition?: string | null;
  fallbackName?: string;
  size?: BadgeSize;
}

export function ConditionBadge({
  condition,
  fallbackName,
  size = "xs",
  className = "",
  ...props
}: ConditionBadgeProps) {
  const meta = resolveConditionMeta(condition, fallbackName);

  return (
    <Badge
      variant={meta.variant}
      size={size}
      className={className}
      title={meta.description}
      {...props}
    >
      {meta.label}
    </Badge>
  );
}

export default ConditionBadge;
