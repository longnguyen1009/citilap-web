import React from "react";

export type BadgeVariant =
  | "default"
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "destructive"
  | "condition-new"
  | "condition-like-new"
  | "condition-used"
  | "sale"
  | "discount"
  | "stock-in"
  | "stock-low"
  | "stock-out"
  | "rank-top"
  | "rank-other";

export type BadgeSize = "xs" | "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-text-secondary border border-border-default",
  neutral: "bg-surface-muted text-text-secondary border border-border-default",
  primary: "bg-brand-primary-subtle text-brand-primary border border-blue-200/80",
  info: "bg-brand-primary-subtle text-brand-primary border border-blue-200/80",
  success: "bg-stock-available-bg text-stock-available border border-emerald-200/80",
  warning: "bg-stock-low-bg text-stock-low border border-amber-200/80",
  error: "bg-red-50 text-error border border-red-200/80",
  destructive: "bg-error text-white font-bold",
  "condition-new": "bg-condition-new-bg text-condition-new border border-condition-new-border",
  "condition-like-new": "bg-condition-like-new-bg text-condition-like-new border border-condition-like-new-border",
  "condition-used": "bg-condition-used-bg text-condition-used border border-condition-used-border",
  sale: "bg-discount text-white font-bold",
  discount: "bg-discount text-white font-bold",
  "stock-in": "bg-stock-available-bg text-stock-available border border-emerald-200/80",
  "stock-low": "bg-stock-low-bg text-stock-low border border-amber-200/80",
  "stock-out": "bg-stock-out-bg text-stock-out border border-slate-200/80",
  "rank-top": "bg-amber-500 text-white font-bold shadow-xs",
  "rank-other": "bg-slate-700 text-white font-bold shadow-xs",
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: "text-caption px-1.5 py-0.5 rounded-sm leading-none font-semibold",
  sm: "text-caption sm:text-xs px-2 py-0.5 rounded-control leading-tight font-semibold",
  md: "text-xs px-2.5 py-1 rounded-control leading-normal font-medium",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  neutral: "bg-slate-400",
  primary: "bg-brand-primary",
  info: "bg-brand-primary",
  success: "bg-stock-available",
  warning: "bg-stock-low",
  error: "bg-error",
  destructive: "bg-white",
  "condition-new": "bg-condition-new",
  "condition-like-new": "bg-condition-like-new",
  "condition-used": "bg-condition-used",
  sale: "bg-white",
  discount: "bg-white",
  "stock-in": "bg-stock-available",
  "stock-low": "bg-stock-low",
  "stock-out": "bg-stock-out",
  "rank-top": "bg-white",
  "rank-other": "bg-white",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 select-none whitespace-nowrap tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-pill shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
