import React from "react";
import { SearchX } from "lucide-react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card border border-dashed border-border-default bg-surface-subtle ${className}`}
    >
      <div className="w-12 h-12 rounded-pill bg-surface-muted flex items-center justify-center text-text-muted mb-3.5">
        {icon || <SearchX className="w-6 h-6 stroke-1.5" aria-hidden="true" />}
      </div>
      <h3 className="text-body-lg sm:text-title-sm font-bold text-text-primary tracking-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-caption sm:text-xs text-text-secondary max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
