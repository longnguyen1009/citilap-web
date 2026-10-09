import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary hover:bg-brand-primary-hover active:bg-blue-800 text-white font-semibold shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
  secondary:
    "bg-surface-muted hover:bg-slate-200 active:bg-slate-300 text-text-primary font-medium border border-border-default focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  outline:
    "bg-white hover:bg-surface-subtle active:bg-slate-100 text-text-primary hover:text-slate-900 font-medium border border-border-strong hover:border-slate-400 shadow-xs focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  ghost:
    "bg-transparent hover:bg-surface-muted active:bg-slate-200 text-text-secondary hover:text-text-primary font-medium focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  destructive:
    "bg-error hover:bg-red-700 active:bg-red-800 text-white font-semibold shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2",
  danger:
    "bg-error hover:bg-red-700 active:bg-red-800 text-white font-semibold shadow-xs border border-transparent focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2",
  link:
    "bg-transparent text-brand-primary hover:text-brand-primary-hover underline-offset-4 hover:underline font-medium p-0 h-auto",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption sm:text-xs gap-1.5 rounded-control",
  md: "h-10 px-4 text-xs sm:text-sm gap-2 rounded-control",
  lg: "h-12 px-6 text-sm sm:text-base gap-2.5 rounded-control",
  icon: "h-10 w-10 p-0 rounded-control justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? "true" : undefined}
        aria-disabled={isDisabled ? "true" : undefined}
        className={`inline-flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed outline-hidden focus-visible:outline-hidden ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
