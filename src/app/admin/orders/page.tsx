"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, Download, Search, Filter, MoreHorizontal } from "lucide-react";

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const orders = [
    { id: "ORD-CTL-123456", customer: "Nguyễn Văn A", email: "nguyenvana@gmail.com", date: "2026-08-20 14:30", total: "28.490.000đ", status: "Đang vận chuyển", payment: "COD" },
    { id: "ORD-CTL-123457", customer: "Trần Thị B", email: "tranthib@gmail.com", date: "2026-08-20 10:15", total: "15.990.000đ", status: "Chờ xác nhận", payment: "Chuyển khoản" },
    { id: "ORD-CTL-123458", customer: "Lê Hoàng C", email: "hoangc.le@gmail.com", date: "2026-08-19 16:45", total: "34.500.000đ", status: "Đã hoàn thành", payment: "Thẻ tín dụng" },
    { id: "ORD-CTL-123459", customer: "Phạm D", email: "phamd123@gmail.com", date: "2026-08-19 09:20", total: "1.250.000đ", status: "Đã hủy", payment: "COD" },
    { id: "ORD-CTL-123460", customer: "Hoàng Văn E", email: "hve99@gmail.com", date: "2026-08-18 11:10", total: "42.000.000đ", status: "Đang xử lý", payment: "Chuyển khoản" },
  ];

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
        <button className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
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
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Tất cả trạng thái</option>
              <option value="Chờ xác nhận">Chờ xác nhận</option>
              <option value="Đang vận chuyển">Đang vận chuyển</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
            </select>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition">
              <Filter className="w-5 h-5" />
            </button>
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
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-blue-600">{order.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{order.customer}</div>
                    <div className="text-sm text-gray-500">{order.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{order.total}</div>
                    <div className="text-xs text-gray-500">{order.payment}</div>
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
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">1</span> đến <span className="font-bold">5</span> trong số <span className="font-bold">120</span> đơn hàng
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">Trước</button>
            <button className="px-3 py-1 border border-gray-300 rounded bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">Tiếp</button>
          </div>
        </div>
      </div>
    </div>
  );
}
