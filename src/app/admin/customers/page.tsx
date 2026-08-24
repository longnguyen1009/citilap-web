"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Mail, Phone, Download, RefreshCw } from "lucide-react";

type Customer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tier: string;
  totalSpend: number;
  totalOrders: number;
  lastOrder: string | null;
  createdAt: string;
};

const tierBadge: Record<string, string> = {
  "Vàng": "text-yellow-700 bg-yellow-100",
  "Bạc": "text-gray-600 bg-gray-200",
  "Mới": "text-blue-600 bg-blue-100",
};

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchTerm) query.set("search", searchTerm);
      if (tierFilter) query.set("tier", tierFilter);
      try {
        const response = await fetch(`/api/customers?${query}`);
        const result = await response.json();
        if (!canceled && result.success) setCustomers(result.data);
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => { canceled = true; };
  }, [searchTerm, tierFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const gold = customers.filter((c) => c.tier === "Vàng").length;
    const silver = customers.filter((c) => c.tier === "Bạc").length;
    const avgSpend = total ? customers.reduce((sum, c) => sum + c.totalSpend, 0) / total : 0;
    return { total, gold, silver, avgSpend };
  }, [customers]);

  const exportCustomers = () => {
    const csv = [
      "Tên,Email,SĐT,Hạng,Tổng đơn,Tổng chi tiêu,Đăng ký",
      ...customers.map((c) =>
        [c.name || "—", c.email, c.phone || "—", c.tier, c.totalOrders, c.totalSpend, new Date(c.createdAt).toLocaleDateString("vi-VN")]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "khach-hang.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Khách hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách khách hàng và lịch sử mua sắm của họ.</p>
        </div>
        <button type="button" onClick={exportCustomers} className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Xuất dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Tổng khách hàng</div>
          <div className="text-3xl font-black text-gray-900">{stats.total.toLocaleString("vi-VN")}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Thành viên Vàng</div>
          <div className="text-3xl font-black text-gray-900">{stats.gold.toLocaleString("vi-VN")}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Thành viên Bạc</div>
          <div className="text-3xl font-black text-gray-900">{stats.silver.toLocaleString("vi-VN")}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-gray-500 text-sm font-medium mb-1">Chi tiêu trung bình</div>
          <div className="text-3xl font-black text-gray-900">{Math.round(stats.avgSpend).toLocaleString("vi-VN")}đ</div>
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
            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hạng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng đơn</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng chi tiêu</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Lần mua cuối</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Đang tải khách hàng...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Không tìm thấy khách hàng phù hợp.</td></tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                          {(customer.name || customer.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{customer.name || "Chưa cập nhật"}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" /> {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${tierBadge[customer.tier] || "bg-gray-100 text-gray-600"}`}>
                        {customer.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      {customer.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      {customer.totalSpend.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-700">
            Hiển thị <span className="font-bold">{customers.length}</span> khách hàng
          </div>
        </div>
      </div>
    </div>
  );
}
