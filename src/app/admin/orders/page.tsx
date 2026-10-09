"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Download, Search, RefreshCw, CheckCircle2, Clock } from "lucide-react";

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

  const refreshOrders = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (searchTerm) query.set("search", searchTerm);
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    fetch(`/api/orders?${query}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) {
          setOrders(result.data);
        }
      })
      .catch((e) => console.error("Failed to load orders:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let canceled = false;
    const timer = setTimeout(() => {
      if (canceled) return;
      const query = new URLSearchParams();
      if (searchTerm) query.set("search", searchTerm);
      if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);

      fetch(`/api/orders?${query}`)
        .then((res) => res.json())
        .then((result) => {
          if (!canceled && result.success && Array.isArray(result.data)) {
            setOrders(result.data);
          }
        })
        .catch((e) => {
          console.error("Failed to load orders:", e);
        })
        .finally(() => {
          if (!canceled) setLoading(false);
        });
    }, 200);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, statusFilter]);

  const handleMarkComplete = async (orderId: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "COMPLETED", completedAt: new Date().toISOString() } : o))
        );
      } else {
        alert("Không thể cập nhật trạng thái đơn hàng.");
      }
    } catch {
      alert("Đã có lỗi kết nối.");
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

  const getStatusBadge = (status: string) => {
    if (status === "COMPLETED" || status === "Đã hoàn thành") {
      return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    return "bg-amber-100 text-amber-800 border border-amber-200";
  };

  const getStatusLabel = (status: string) => {
    if (status === "COMPLETED" || status === "Đã hoàn thành") {
      return "Hoàn thành";
    }
    return "Chờ xác nhận";
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tiếp nhận yêu cầu mua hàng từ khách hàng và xác nhận xử lý đơn.
          </p>
        </div>
        <button
          type="button"
          onClick={exportOrders}
          className="bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Xuất danh sách (CSV)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm mã đơn, tên khách, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xác nhận (PENDING)</option>
              <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
            </select>

            <button
              type="button"
              onClick={() => void refreshOrders()}
              title="Tải lại danh sách"
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            >
              <RefreshCw className={loading ? "w-4 h-4 animate-spin text-blue-600" : "w-4 h-4"} />
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Mã đơn hàng
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Khách hàng
                </th>
                <th scope="col" className="px-5 py-3.5 text-left">
                  Ngày đặt
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Số lượng
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Tổng tiền
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Trạng thái
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const isPending = order.status === "PENDING" || order.status === "Chờ xác nhận" || order.status === "Đang xử lý";

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 transition block text-sm"
                        >
                          {order.orderNumber || order.id.slice(0, 8)}
                        </Link>
                        <span className="text-[11px] text-gray-400 font-mono">ID: {order.id.slice(0, 10)}...</span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{order.customerName}</div>
                        <div className="text-xs text-gray-500 font-mono">{order.customerPhone}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center text-xs font-semibold text-gray-700">
                        {itemCount} SP
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-red-600">
                          {order.totalAmount.toLocaleString("vi-VN")}đ
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
                          {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {getStatusLabel(order.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right space-x-2">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => void handleMarkComplete(order.id)}
                            disabled={updatingId === order.id}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold px-2.5 py-1 rounded text-xs transition disabled:opacity-50"
                            title="Xác nhận hoàn thành đơn hàng"
                          >
                            {updatingId === order.id ? "Đang lưu..." : "Hoàn thành"}
                          </button>
                        )}

                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600 font-semibold text-xs py-1 px-2 border border-gray-200 rounded hover:bg-gray-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
