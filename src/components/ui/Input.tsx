import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-white rounded-control border transition-colors outline-hidden ${
            leftIcon ? "pl-9" : ""
          } ${rightIcon ? "pr-9" : ""} ${
            error
              ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-border-default hover:border-border-strong focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          } disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = "", required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-xs sm:text-sm font-semibold text-text-primary mb-1.5 select-none ${className}`}
        {...props}
      >
        {children}
        {required && <span className="text-error ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-control border transition-colors outline-hidden resize-y ${
          error
            ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
            : "border-border-default hover:border-border-strong focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        } disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, disabled, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={`w-full h-10 px-3.5 py-2 text-xs sm:text-sm bg-white rounded-control border transition-colors outline-hidden cursor-pointer ${
          error
            ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
            : "border-border-default hover:border-border-strong focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        } disabled:bg-surface-muted disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-text-primary"
      >
        <input
          id={checkboxId}
          ref={ref}
          type="checkbox"
          className={`w-4 h-4 rounded-sm border border-border-default text-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer ${className}`}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
