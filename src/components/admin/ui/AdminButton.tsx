import React from "react";
import { Loader2 } from "lucide-react";

export type AdminButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type AdminButtonSize = "sm" | "md" | "lg";

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export default function AdminButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  disabled,
  className = "",
  ...props
}: AdminButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles: Record<AdminButtonSize, string> = {
    sm: "text-xs px-2.5 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-5 py-2.5 gap-2.5",
  };

  const variantStyles: Record<AdminButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-xs",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-slate-400 shadow-xs",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-xs",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
