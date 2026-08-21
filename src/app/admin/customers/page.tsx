"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Filter, MoreHorizontal, User, Mail, Phone, MapPin, Download } from "lucide-react";

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const customers = [
    { id: "CUS-001", name: "Nguyễn Văn A", email: "nguyenvana@gmail.com", phone: "0988.123.456", totalOrders: 12, totalSpend: 145500000, lastOrder: "20/08/2026", status: "Thành viên Vàng", statusColor: "text-yellow-600 bg-yellow-100" },
    { id: "CUS-002", name: "Trần Thị B", email: "tranthib@gmail.com", phone: "0912.345.678", totalOrders: 3, totalSpend: 25000000, lastOrder: "15/08/2026", status: "Thành viên Bạc", statusColor: "text-gray-600 bg-gray-200" },
    { id: "CUS-003", name: "Lê Hoàng C", email: "hoangc.le@gmail.com", phone: "0909.111.222", totalOrders: 1, totalSpend: 5500000, lastOrder: "10/08/2026", status: "Thành viên Mới", statusColor: "text-blue-600 bg-blue-100" },
    { id: "CUS-004", name: "Phạm D", email: "phamd123@gmail.com", phone: "0888.999.888", totalOrders: 8, totalSpend: 86000000, lastOrder: "05/08/2026", status: "Thành viên Vàng", statusColor: "text-yellow-600 bg-yellow-100" },
    { id: "CUS-005", name: "Hoàng Văn E", email: "hve99@gmail.com", phone: "0933.444.555", totalOrders: 0, totalSpend: 0, lastOrder: "-", status: "Chưa kích hoạt", statusColor: "text-red-600 bg-red-100" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách khách hàng và lịch sử mua sắm của họ.</p>
        </div>
        <button className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Xuất dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Tổng khách hàng</div>
          <div className="text-3xl font-black text-gray-900">12,456</div>
          <div className="text-sm text-green-600 font-bold mt-2">+145 tháng này</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Thành viên Vàng</div>
          <div className="text-3xl font-black text-gray-900">856</div>
          <div className="text-sm text-gray-500 font-medium mt-2">Đóng góp 60% doanh thu</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Thành viên Bạc</div>
          <div className="text-3xl font-black text-gray-900">3,240</div>
          <div className="text-sm text-gray-500 font-medium mt-2">Cần chăm sóc thêm</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Chi tiêu trung bình</div>
          <div className="text-3xl font-black text-gray-900">15.4M</div>
          <div className="text-sm text-green-600 font-bold mt-2">+2.1M so với T7</div>
        </div>
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
              placeholder="Tìm kiếm tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition"
            />
          </div>
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">Tất cả hạng thành viên</option>
              <option value="Vàng">Thành viên Vàng</option>
              <option value="Bạc">Thành viên Bạc</option>
              <option value="Mới">Thành viên Mới</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tổng đơn
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tổng chi tiêu
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Lần mua cuối
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                          {customer.name.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" /> {customer.email}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${customer.statusColor}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                    {customer.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                    {customer.totalSpend.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {customer.lastOrder}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-lg inline-flex items-center justify-center transition">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">1</span> đến <span className="font-bold">5</span> trong số <span className="font-bold">12,456</span> khách hàng
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
