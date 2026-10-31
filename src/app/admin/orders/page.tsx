"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  Search,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  StatusBadge,
  InlineAlert,
} from "@/components/admin/ui";

type OrderItemSummary = {
  id: string;
  productName: string | null;
  sku: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Order = {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  completedAt?: string | null;
  totalAmount: number;
  subtotalAmount: number;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  items: OrderItemSummary[];
  _count?: {
    events: number;
    internalNotes: number;
  };
};

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "NEW", label: "Mới" },
  { key: "CONTACTED", label: "Đã liên hệ" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Hoàn tất" },
  { key: "CANCELLED", label: "Đã hủy" },
];

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialPaymentStatus = searchParams.get("paymentStatus") || "ALL";
  const initialStartDate = searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("endDate") || "";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialPaymentStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [page, setPage] = useState(initialPage);

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateUrlParams = useCallback(
    (
      newSearch: string,
      newStatus: string,
      newPaymentStatus: string,
      newStart: string,
      newEnd: string,
      newPage: number
    ) => {
      const params = new URLSearchParams();
      if (newSearch.trim()) params.set("search", newSearch.trim());
      if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
      if (newPaymentStatus && newPaymentStatus !== "ALL") params.set("paymentStatus", newPaymentStatus);
      if (newStart) params.set("startDate", newStart);
      if (newEnd) params.set("endDate", newEnd);
      if (newPage > 1) params.set("page", String(newPage));

      const queryStr = params.toString();
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    if (paymentStatusFilter && paymentStatusFilter !== "ALL") query.set("paymentStatus", paymentStatusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    query.set("page", String(page));
    query.set("limit", "25");

    try {
      const res = await fetch(`/api/orders?${query.toString()}`, {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data);
        if (result.statusCounts) setStatusCounts(result.statusCounts);
        setFeedback(null);
        if (result.pagination) {
          setTotal(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        }
      } else {
        setFeedback({
          type: "error",
          message: result?.error?.message || "Không thể tải danh sách đơn hàng.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOrders();
      updateUrlParams(searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchOrders, updateUrlParams, searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page]);

  const handleExport = () => {
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);

    window.open(`/api/admin/orders/export?${query.toString()}`, "_blank");
  };

  const hasFilters = Boolean(
    searchTerm.trim() || statusFilter !== "ALL" || paymentStatusFilter !== "ALL" || startDate || endDate
  );

  return (
    <div className="space-y-3 pb-10">
      {/* 1. Compact Header */}
      <PageHeader
        title="Đơn hàng"
        description="Đơn gửi từ website. Mở chi tiết để xác nhận, xử lý giao hàng hoặc hủy; trạng thái đơn và thanh toán được theo dõi riêng."
        badge={
          <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-semibold tabular-nums">
            {total}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchOrders()}
              title="Làm mới"
              aria-label="Làm mới danh sách"
              className="inline-grid place-items-center size-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || total === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất CSV</span>
            </button>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Status Tabs */}
        <div className="px-4 pt-2 border-b border-slate-200 bg-slate-50/50 flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((t) => {
            const active = statusFilter === t.key;
            const count = statusCounts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStatusFilter(t.key);
                  setPage(1);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{t.label}</span>
                {typeof count === "number" && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                      active ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Inline Filter Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-white text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Tìm mã đơn, tên khách, SĐT"
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            aria-label="Lọc trạng thái thanh toán"
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
          >
            <option value="ALL">Thanh toán: Tất cả</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="PENDING">Chờ thanh toán</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              aria-label="Từ ngày"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs outline-none text-slate-700 bg-transparent"
              title="Từ ngày"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs outline-none text-slate-700 bg-transparent"
              title="Đến ngày"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setPaymentStatusFilter("ALL");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Sản phẩm đặt</th>
                <th className="text-right">Tổng tiền</th>
                <th className="text-center">Thanh toán</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-right">Ngày đặt</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" aria-hidden="true" />
                    <span>Đang tải...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không có đơn hàng phù hợp.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const firstItem = order.items?.[0]?.productName;
                  const isPaid = order.paymentStatus === "PAID";
                  const methodLabel = order.paymentMethod === "BANK_TRANSFER" ? "VietQR" : "COD";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-blue-600 hover:underline"
                        >
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </Link>
                      </td>

                      <td className="whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{order.customerPhone}</div>
                      </td>

                      <td>
                        <div className="text-slate-800 line-clamp-1 max-w-[260px]">
                          {firstItem || `${itemCount} sản phẩm`}
                        </div>
                        {itemCount > 1 && (
                          <div className="text-[11px] text-slate-400">Tổng {itemCount} SP</div>
                        )}
                      </td>

                      <td className="whitespace-nowrap text-right font-bold text-slate-900 tabular-nums">
                        {order.totalAmount.toLocaleString("vi-VN")}đ
                      </td>

                      <td className="whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span>{methodLabel}</span>
                          <span>·</span>
                          <span>{isPaid ? "Đã thu" : "Chờ thu"}</span>
                        </span>
                      </td>

                      <td className="whitespace-nowrap text-center">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="whitespace-nowrap text-right text-slate-400 tabular-nums">
                        {new Date(order.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>

                      <td className="whitespace-nowrap text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs"
                        >
                          Mở
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between bg-slate-50/60 text-xs text-slate-600">
            <div className="tabular-nums">
              Trang <strong>{page}</strong> / {totalPages} ({total} đơn)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 bg-white rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                aria-label="Trang tiếp theo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Đang tải đơn hàng...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
