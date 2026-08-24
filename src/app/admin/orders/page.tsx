"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, Download, Search, RefreshCw } from "lucide-react";

type Order = { id: string; createdAt: string; totalAmount: number; status: string; paymentMethod: string; user?: { name: string | null; email: string; phone: string | null } | null };

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const loadOrders = async () => { setLoading(true); const query = new URLSearchParams(); if (searchTerm) query.set("search", searchTerm); if (statusFilter) query.set("status", statusFilter); const response = await fetch(`/api/orders?${query}`); const result = await response.json(); if (result.success) setOrders(result.data); setLoading(false); };
  useEffect(() => {
    let canceled = false;
    const load = async () => { setLoading(true); const query = new URLSearchParams(); if (searchTerm) query.set("search", searchTerm); if (statusFilter) query.set("status", statusFilter); const response = await fetch(`/api/orders?${query}`); const result = await response.json(); if (!canceled && result.success) setOrders(result.data); if (!canceled) setLoading(false); };
    void load(); return () => { canceled = true; };
  }, [searchTerm, statusFilter]);
  const exportOrders = () => {
    const csv = ["Mã đơn,Khách hàng,Ngày đặt,Tổng tiền,Trạng thái,Thanh toán", ...orders.map((order) => [order.id, order.user?.name || "Khách vãng lai", new Date(order.createdAt).toLocaleString("vi-VN"), order.totalAmount, order.status, order.paymentMethod].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "don-hang.csv"; link.click(); URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Chờ xác nhận": return "bg-yellow-100 text-yellow-800";
      case "Đang xử lý": return "bg-blue-100 text-blue-800";
      case "Đang vận chuyển": return "bg-purple-100 text-purple-800";
      case "Đã hoàn thành": return "bg-green-100 text-green-800";
      case "Đã hủy": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem, cập nhật trạng thái và xử lý các đơn hàng từ khách hàng.</p>
        </div>
        <button type="button" onClick={exportOrders} className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Xuất Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm mã đơn, tên, email hoặc SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
            />
          </div>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">Chờ xác nhận</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Đang vận chuyển">Đang vận chuyển</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
            <button type="button" onClick={() => void loadOrders()} title="Tải lại" className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"><RefreshCw className={loading ? "w-5 h-5 animate-spin" : "w-5 h-5"} /></button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Mã đơn hàng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ngày đặt
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Đang tải đơn hàng...</td></tr> : orders.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Không có đơn hàng phù hợp.</td></tr> : orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-blue-600">{order.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{order.user?.name || "Khách vãng lai"}</div>
                    <div className="text-sm text-gray-500">{order.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{order.totalAmount.toLocaleString("vi-VN")}đ</div>
                    <div className="text-xs text-gray-500">{order.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg inline-flex items-center justify-center transition">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">{orders.length}</span> đơn hàng
          </div>
        </div>
      </div>
    </div>
  );
}
