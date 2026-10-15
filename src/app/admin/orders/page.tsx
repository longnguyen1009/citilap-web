"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
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

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial filter values from URL search params
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialStartDate = searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("endDate") || "";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [page, setPage] = useState(initialPage);

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sync state changes into URL query params
  const updateUrlParams = useCallback(
    (newSearch: string, newStatus: string, newStart: string, newEnd: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newSearch.trim()) params.set("search", newSearch.trim());
      if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
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
        message: "Không thể kết nối đến máy chủ để tải danh sách đơn hàng.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
      updateUrlParams(searchTerm, statusFilter, startDate, endDate, page);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchOrders, updateUrlParams, searchTerm, statusFilter, startDate, endDate, page]);

  const handleExport = () => {
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);

    window.open(`/api/admin/orders/export?${query.toString()}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Quản lý Đơn hàng"
        description="Tiếp nhận yêu cầu mua hàng, theo dõi tiến độ tư vấn và lịch sử trạng thái theo thời gian thực."
        breadcrumbs={[{ label: "Bán hàng" }, { label: "Đơn hàng" }]}
        actions={
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={loading || total === 0}
            icon={<Download className="w-4 h-4" aria-hidden="true" />}
          >
            Xuất danh sách ({total} đơn)
          </AdminButton>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Main Card with Search, Filter & Table */}
      <AdminCard bodyClassName="p-0">
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 justify-between bg-slate-50/60">
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Tìm theo mã đơn, tên khách, số điện thoại..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo trạng thái"
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NEW">Mới (Chờ tiếp nhận)</option>
                <option value="CONTACTED">Đã liên hệ tư vấn</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="COMPLETED">Hoàn tất xử lý</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Date range filter & refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-2 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs outline-hidden text-slate-700 bg-transparent"
                title="Từ ngày"
              />
              <span className="text-slate-300">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="text-xs outline-hidden text-slate-700 bg-transparent"
                title="Đến ngày"
              />
            </div>

            <button
              type="button"
              onClick={() => void fetchOrders()}
              aria-label="Tải lại danh sách"
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Mã đơn hàng</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Ngày đặt</th>
                <th className="py-3 px-4 text-center">Sản phẩm</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" aria-hidden="true" />
                    <span>Đang tải danh sách đơn hàng...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemCount =
                    order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 transition block"
                        >
                          {order.orderNumber || order.id.slice(0, 8)}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {order.id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{order.customerName}</div>
                        <div className="text-xs text-slate-500 font-mono">{order.customerPhone}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center text-xs font-semibold text-slate-700">
                        {itemCount} SP
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-slate-900">
                        {order.totalAmount.toLocaleString("vi-VN")}đ
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium text-xs py-1 px-2.5 border border-slate-200 rounded hover:bg-slate-100 transition"
                          title="Xem chi tiết và xử lý đơn hàng"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Chi tiết</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/60 text-xs text-slate-600">
            <div>
              Trang <span className="font-bold text-slate-900">{page}</span> /{" "}
              <span className="font-bold text-slate-900">{totalPages}</span> (Tổng {total} đơn)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-300 rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Trang tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
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
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải trang đơn hàng...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
