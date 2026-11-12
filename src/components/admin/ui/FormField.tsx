"use client";

import React, { useId } from "react";
import { AlertCircle } from "lucide-react";

export interface FormFieldProps {
  id?: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  action?: React.ReactNode;
  layout?: "stacked" | "inline";
  className?: string;
  children: React.ReactNode;
}

export default function FormField({
  id: providedId,
  label,
  required = false,
  hint,
  error,
  action,
  layout = "stacked",
  className = "",
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = providedId || `admin-field-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedByIds = [
    hint ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const enhancedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: (children.props as Record<string, unknown>).id || fieldId,
        "aria-describedby":
          [(children.props as Record<string, unknown>)["aria-describedby"], describedByIds]
            .filter(Boolean)
            .join(" ") || undefined,
        "aria-invalid": error ? "true" : (children.props as Record<string, unknown>)["aria-invalid"],
        required: required || (children.props as Record<string, unknown>).required,
      })
    : children;

  if (layout === "inline") {
    return (
      <div className={`admin-form-field mb-3 ${className}`}>
        <div className="flex items-center gap-2">
          {enhancedChild}
          <label htmlFor={fieldId} className="text-[13px] font-medium text-slate-800 select-none cursor-pointer">
            {label}
            {required && (
              <span aria-hidden="true" className="text-red-600 ml-0.5">
                *
              </span>
            )}
          </label>
        </div>
        {hint && (
          <p id={hintId} className="mt-1 text-xs text-slate-500 leading-normal">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 leading-normal">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`admin-form-field flex flex-col gap-1.5 mb-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-xs font-semibold text-slate-700 leading-tight">
          {label}
          {required && (
            <span aria-hidden="true" className="text-red-600 ml-0.5">
              *
            </span>
          )}
        </label>
        {action && <div className="text-xs">{action}</div>}
      </div>
      {enhancedChild}
      {hint && !error && (
        <span id={hintId} className="text-[11px] text-slate-500 leading-normal">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="flex items-center gap-1 text-xs font-medium text-red-600 leading-normal">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
