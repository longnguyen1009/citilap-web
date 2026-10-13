import React from "react";

export type StatusType =
  // Publication
  | "PUBLISHED"
  | "DRAFT"
  | "UNPUBLISHED"
  | "MODIFIED"
  // Availability
  | "AVAILABLE"
  | "PREORDER"
  | "CONTACT"
  | "UNAVAILABLE"
  // Order
  | "ORDER_PENDING"
  | "ORDER_PROCESSING"
  | "ORDER_SHIPPING"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  // General
  | "ACTIVE"
  | "INACTIVE";

export interface StatusBadgeProps {
  status: StatusType | string;
  customLabel?: string;
  className?: string;
}

interface BadgeConfig {
  label: string;
  dotColor: string;
  badgeClass: string;
}

const statusConfigs: Record<string, BadgeConfig> = {
  // Publication
  PUBLISHED: {
    label: "Đã xuất bản",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DRAFT: {
    label: "Bản nháp",
    dotColor: "bg-sky-500",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  UNPUBLISHED: {
    label: "Đã ẩn",
    dotColor: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  MODIFIED: {
    label: "Chưa xuất bản",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },

  // Availability
  AVAILABLE: {
    label: "Có nhận đơn",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PREORDER: {
    label: "Đặt trước",
    dotColor: "bg-purple-500",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  CONTACT: {
    label: "Liên hệ tư vấn",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  UNAVAILABLE: {
    label: "Ngừng nhận đơn",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },

  // Order
  ORDER_PENDING: {
    label: "Chờ xác nhận",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "Chờ xác nhận": {
    label: "Chờ xác nhận",
    dotColor: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ORDER_PROCESSING: {
    label: "Đang xử lý",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "Đang xử lý": {
    label: "Đang xử lý",
    dotColor: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ORDER_SHIPPING: {
    label: "Đang vận chuyển",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  "Đang vận chuyển": {
    label: "Đang vận chuyển",
    dotColor: "bg-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  ORDER_COMPLETED: {
    label: "Hoàn thành",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "Đã hoàn thành": {
    label: "Hoàn thành",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ORDER_CANCELLED: {
    label: "Đã hủy",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  "Đã hủy": {
    label: "Đã hủy",
    dotColor: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },

  // General Active / Inactive
  ACTIVE: {
    label: "Hoạt động",
    dotColor: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  INACTIVE: {
    label: "Tạm khóa",
    dotColor: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function StatusBadge({ status, customLabel, className = "" }: StatusBadgeProps) {
  const normalized = status ? status.toUpperCase() : "UNKNOWN";
  const config =
    statusConfigs[status] ||
    statusConfigs[normalized] || {
      label: customLabel || status,
      dotColor: "bg-slate-400",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };

  const displayText = customLabel || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} aria-hidden="true" />
      <span>{displayText}</span>
    </span>
  );
}
