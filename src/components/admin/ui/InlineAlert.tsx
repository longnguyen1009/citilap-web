import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type InlineAlertVariant = "info" | "success" | "warning" | "error";

export interface InlineAlertProps {
  variant?: InlineAlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  InlineAlertVariant,
  { container: string; iconClass: string; Icon: React.ElementType; role: string }
> = {
  info: {
    container: "bg-blue-50/80 border-blue-200 text-blue-900",
    iconClass: "text-blue-600",
    Icon: Info,
    role: "status",
  },
  success: {
    container: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
    iconClass: "text-emerald-600",
    Icon: CheckCircle2,
    role: "status",
  },
  warning: {
    container: "bg-amber-50/80 border-amber-200 text-amber-900",
    iconClass: "text-amber-600",
    Icon: AlertTriangle,
    role: "alert",
  },
  error: {
    container: "bg-red-50/80 border-red-200 text-red-900",
    iconClass: "text-red-600",
    Icon: AlertCircle,
    role: "alert",
  },
};

export default function InlineAlert({
  variant = "info",
  title,
  children,
  onClose,
  action,
  className = "",
}: InlineAlertProps) {
  const { container, iconClass, Icon, role } = variantStyles[variant];

  return (
    <div
      role={role}
      className={`border rounded-xl p-4 flex items-start gap-3 text-sm transition-all shadow-xs ${container} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold mb-1 leading-tight">{title}</h4>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
        {action && <div className="mt-3 flex items-center gap-2">{action}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
