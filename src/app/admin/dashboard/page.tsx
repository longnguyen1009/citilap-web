"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Users, AlertTriangle, Package, RefreshCw } from "lucide-react";

type DashboardData = {
  stats: {
    totalRevenue: number;
    monthRevenue: number;
    monthOrders: number;
    revenueChange: number | null;
    totalOrders: number;
    pendingOrders: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    lowStockProducts: number;
  };
  recentOrders: {
    id: string;
    customer: string;
    product: string;
    itemCount: number;
    date: string;
    amount: number;
    status: string;
  }[];
  monthlyRevenue: { label: string; revenue: number }[];
  statusCounts: { status: string; count: number }[];
  topProducts: { id: string; name: string; sold: number }[];
};

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const statusColor: Record<string, string> = {
  "Chờ xác nhận": "text-yellow-600",
  "Đang xử lý": "text-blue-600",
  "Đang vận chuyển": "text-purple-600",
  "Đã hoàn thành": "text-green-600",
  "Đã hủy": "text-red-600",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard");
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setData(result.data);
    } catch {
      setError("Không thể tải dữ liệu tổng quan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-32 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Đang tải dữ liệu...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto py-32 text-center">
        <p className="text-gray-500 mb-4">{error || "Không có dữ liệu."}</p>
        <button onClick={() => void load()} className="text-blue-600 font-bold hover:underline">Thử lại</button>
      </div>
    );
  }

  const { stats, recentOrders, monthlyRevenue, statusCounts, topProducts } = data;
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  const cards = [
    {
      name: "Doanh thu tháng này",
      value: formatVnd(stats.monthRevenue),
      sub: stats.revenueChange !== null
        ? `${stats.revenueChange >= 0 ? "+" : ""}${(stats.revenueChange * 100).toFixed(1)}% so với tháng trước`
        : "Chưa có dữ liệu tháng trước",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      name: "Đơn hàng",
      value: stats.totalOrders.toLocaleString("vi-VN"),
      sub: `${stats.pendingOrders} đơn chờ xác nhận`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      name: "Khách hàng",
      value: stats.totalCustomers.toLocaleString("vi-VN"),
      sub: `+${stats.newCustomersThisMonth} khách mới tháng này`,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      name: "Sản phẩm sắp hết hàng",
      value: stats.lowStockProducts.toLocaleString("vi-VN"),
      sub: "Tồn kho ≤ 5 sản phẩm",
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan cửa hàng</h1>
        <p className="text-sm text-gray-500">Theo dõi hoạt động kinh doanh và các đơn hàng mới nhất.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${item.bg}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{item.value}</dd>
                    <dd className="text-xs text-gray-400 mt-0.5">{item.sub}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Doanh thu 12 tháng gần nhất</h3>
            <span className="text-sm text-gray-500">Tổng: <span className="font-bold text-gray-900">{formatVnd(stats.totalRevenue)}</span></span>
          </div>
          <div className="p-6">
            <div className="h-72 w-full flex items-end gap-2 justify-between">
              {monthlyRevenue.map((month, i) => (
                <div key={i} className="w-full flex flex-col items-center justify-end h-full group cursor-pointer" title={`${month.label}: ${formatVnd(month.revenue)}`}>
                  <div
                    className="w-full bg-blue-600 rounded-t-sm transition-all duration-300 group-hover:bg-indigo-600 min-h-[2px]"
                    style={{ height: `${(month.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-400">
              {monthlyRevenue.map((month, i) => (
                <span key={i}>{month.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Đơn hàng gần đây</h3>
          </div>
          <div className="px-6 py-2">
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Chưa có đơn hàng nào.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-4">
                    <Link href={`/admin/orders/${order.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{order.customer}</p>
                          <p className="text-xs text-gray-500 truncate">{order.product}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{formatVnd(order.amount)}</p>
                          <p className={`text-xs font-medium ${statusColor[order.status] || "text-gray-500"}`}>
                            {order.status}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Xem tất cả đơn hàng &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom row: order status distribution + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Phân bố trạng thái đơn hàng</h3>
          </div>
          <div className="p-6 space-y-4">
            {statusCounts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu.</p>
            ) : (
              statusCounts.map((row) => {
                const total = statusCounts.reduce((sum, r) => sum + r.count, 0) || 1;
                const percent = (row.count / total) * 100;
                return (
                  <div key={row.status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium ${statusColor[row.status] || "text-gray-600"}`}>{row.status}</span>
                      <span className="text-gray-500">{row.count} đơn ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          row.status === "Đã hoàn thành" ? "bg-green-500" :
                          row.status === "Đã hủy" ? "bg-red-400" :
                          row.status === "Chờ xác nhận" ? "bg-yellow-400" :
                          row.status === "Đang vận chuyển" ? "bg-purple-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Sản phẩm bán chạy</h3>
          </div>
          <div className="p-6">
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu bán hàng.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <li key={product.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-sm font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">{product.name}</span>
                    </div>
                    <span className="text-sm text-gray-500 flex-shrink-0 ml-3 flex items-center gap-1">
                      <Package className="w-4 h-4" /> {product.sold} đã bán
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
