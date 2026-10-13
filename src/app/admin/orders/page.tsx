"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
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
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);

    try {
      const res = await fetch(`/api/orders?${query}`, { credentials: "same-origin" });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setOrders(result.data);
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Không thể kết nối đến máy chủ để tải danh sách đơn hàng.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    let canceled = false;
    const timer = setTimeout(() => {
      if (!canceled) {
        void fetchOrders();
      }
    }, 250);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [fetchOrders]);

  const handleMarkComplete = async (orderId: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: "COMPLETED", completedAt: new Date().toISOString() }
              : o
          )
        );
        setFeedback({
          type: "success",
          message: `Đã cập nhật trạng thái đơn hàng #${orderId.slice(0, 8)} sang hoàn thành.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data?.error || "Không thể cập nhật trạng thái đơn hàng.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối khi cập nhật đơn hàng.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const exportOrders = () => {
    const csv = [
      "Mã đơn,Mã hệ thống,Khách hàng,Số điện thoại,Ngày đặt,Số lượng SP,Tổng tiền,Trạng thái",
      ...orders.map((o) =>
        [
          o.orderNumber || o.id,
          o.id,
          o.customerName,
          o.customerPhone,
          new Date(o.createdAt).toLocaleString("vi-VN"),
          o.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          o.totalAmount,
          o.status,
        ]
          .map((val) => `"${String(val).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `citilap-don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Quản lý Đơn hàng"
        description="Tiếp nhận yêu cầu mua hàng từ khách hàng, theo dõi tiến độ tư vấn và cập nhật trạng thái xử lý."
        breadcrumbs={[{ label: "Bán hàng" }, { label: "Đơn hàng" }]}
        actions={
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={exportOrders}
            disabled={orders.length === 0}
            icon={<Download className="w-4 h-4" aria-hidden="true" />}
          >
            Xuất danh sách (CSV)
          </AdminButton>
        }
      />

      {/* Inline Feedback Banner if present */}
      {feedback && (
        <InlineAlert
          variant={feedback.type}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Main Card with Search, Filter & Table */}
      <AdminCard bodyClassName="p-0">
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/60">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xác nhận (PENDING)</option>
              <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
            </select>

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
                <th className="py-3 px-4 text-center">Số lượng</th>
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
                  const isPending =
                    order.status === "PENDING" ||
                    order.status === "Chờ xác nhận" ||
                    order.status === "Đang xử lý";

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
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => void handleMarkComplete(order.id)}
                            disabled={updatingId === order.id}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold px-2.5 py-1 rounded text-xs transition disabled:opacity-50 cursor-pointer"
                            title="Xác nhận đã xử lý hoàn thành đơn hàng"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{updatingId === order.id ? "Đang lưu..." : "Hoàn thành"}</span>
                          </button>
                        )}

                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium text-xs py-1 px-2.5 border border-slate-200 rounded hover:bg-slate-100 transition"
                          title="Xem chi tiết đơn hàng"
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
      </AdminCard>
    </div>
  );
}
