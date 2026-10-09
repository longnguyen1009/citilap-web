import React from "react";
import { AlertCircle, RotateCcw, Headphones } from "lucide-react";
import Link from "next/link";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  supportHref?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Đã xảy ra lỗi tải dữ liệu",
  message = "Hệ thống gặp sự cố trong khi tải thông tin. Vui lòng thử lại sau giây lát.",
  retry,
  supportHref = "/contact",
  action,
  icon,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card border border-red-200/80 bg-red-50/50 ${className}`}
    >
      <div className="w-12 h-12 rounded-pill bg-red-100 flex items-center justify-center text-error mb-3.5">
        {icon || <AlertCircle className="w-6 h-6 stroke-1.5" aria-hidden="true" />}
      </div>
      <h3 className="text-body-lg sm:text-title-sm font-bold text-text-primary tracking-tight mb-1">
        {title}
      </h3>
      {message && (
        <p className="text-caption sm:text-xs text-text-secondary max-w-sm mb-5 leading-relaxed">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {retry && (
          <Button
            variant="primary"
            size="sm"
            onClick={retry}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Thử lại
          </Button>
        )}
        {supportHref && (
          <Link href={supportHref}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Headphones className="w-3.5 h-3.5 text-text-secondary" />}
            >
              Liên hệ hỗ trợ
            </Button>
          </Link>
        )}
        {action}
      </div>
    </div>
  );
}

export default ErrorState;
