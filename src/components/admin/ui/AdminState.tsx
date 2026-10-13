import React from "react";
import { RefreshCw, AlertCircle, Inbox, RotateCcw } from "lucide-react";
import AdminButton from "./AdminButton";

export function AdminLoadingState({
  message = "Đang tải dữ liệu...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-20 px-4 text-center text-slate-500 gap-3 ${className}`}
    >
      <RefreshCw className="w-7 h-7 animate-spin text-blue-600" aria-hidden="true" />
      <span className="text-sm font-medium text-slate-600">{message}</span>
    </div>
  );
}

export function AdminEmptyState({
  title = "Chưa có dữ liệu",
  description = "Hiện tại chưa có bản ghi nào để hiển thị.",
  icon = <Inbox className="w-10 h-10 text-slate-400" aria-hidden="true" />,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl border border-dashed border-slate-300 ${className}`}
    >
      <div className="mb-3 p-3 bg-slate-50 rounded-full">{icon}</div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

export function AdminErrorState({
  title = "Không thể tải dữ liệu",
  message = "Đã xảy ra lỗi khi kết nối tới máy chủ.",
  onRetry,
  className = "",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`p-6 sm:p-8 bg-red-50/70 border border-red-200 rounded-xl text-center max-w-xl mx-auto my-8 ${className}`}
    >
      <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" aria-hidden="true" />
      <h3 className="text-base font-bold text-red-900 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-red-700 mb-6 leading-relaxed">{message}</p>
      {onRetry && (
        <AdminButton
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRetry}
          icon={<RotateCcw className="w-4 h-4" aria-hidden="true" />}
        >
          Thử lại
        </AdminButton>
      )}
    </div>
  );
}
