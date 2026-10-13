"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Images,
  FolderTree,
  Settings,
  Sparkles,
  ExternalLink,
  PlusCircle,
  RotateCcw,
  ArrowRight,
  Eye,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  StatusBadge,
  AdminLoadingState,
  AdminErrorState,
} from "@/components/admin/ui";

interface DashboardData {
  summary: {
    pendingOrders: number;
    totalOrders: number;
    draftStudioCount: number;
    publishedStudioCount: number;
    mediaCount: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string | null;
    customerName: string;
    customerPhone: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
  recentStudioProducts: {
    productId: string;
    revision: number;
    published: string | null;
    updatedAt: string;
    catalogName: string;
    catalogSlug: string;
    catalogStatus: string;
  }[];
}

const formatCurrency = (val: number) => `${val.toLocaleString("vi-VN")}đ`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        throw new Error(`Lỗi máy chủ (${res.status}) khi tải dữ liệu tổng quan.`);
      }
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "Dữ liệu trả về không hợp lệ.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mất kết nối mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load initial operational stats
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <AdminLoadingState message="Đang kiểm tra tình trạng công việc cửa hàng..." />;
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Không thể tải bảng điều hành"
        message={error || "Không thể kết nối đến cơ sở dữ liệu."}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  const { summary, recentOrders, recentStudioProducts } = data;

  const quickActions = [
    {
      title: "Tạo sản phẩm mới",
      desc: "Thêm thông tin laptop hoặc phụ kiện vào danh mục",
      href: "/admin/products/new",
      icon: PlusCircle,
      accent: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Quản lý sản phẩm",
      desc: "Xem danh sách, thông số kỹ thuật và trạng thái xuất bản",
      href: "/admin/products",
      icon: Package,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Thư viện Media",
      desc: "Tải lên và quản lý hình ảnh sản phẩm chất lượng cao",
      href: "/admin/media",
      icon: Images,
      accent: "text-sky-600 bg-sky-50 border-sky-200",
    },
    {
      title: "Menu & Bộ sưu tập",
      desc: "Cấu hình thanh điều hướng và nhóm sản phẩm trang chủ",
      href: "/admin/navigation",
      icon: FolderTree,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Cài đặt hệ thống",
      desc: "Thông tin liên hệ hotline, showroom và cấu hình bán hàng",
      href: "/admin/settings",
      icon: Settings,
      accent: "text-slate-700 bg-slate-100 border-slate-300",
    },
    {
      title: "Xem website cửa hàng",
      desc: "Kiểm tra hiển thị thực tế trên giao diện khách hàng",
      href: "/",
      external: true,
      icon: ExternalLink,
      accent: "text-amber-700 bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Tổng quan điều hành"
        description="Trung tâm điều phối công việc: theo dõi đơn hàng mới, tiếp tục biên tập sản phẩm và truy cập nhanh các tính năng quản trị."
        breadcrumbs={[{ label: "Tổng quan" }]}
        actions={
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void loadDashboard()}
            icon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Làm mới
          </AdminButton>
        }
      />

      {/* 2. Operational Work Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Đơn cần xử lý</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.pendingOrders}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              yêu cầu mua hàng chờ xác nhận
            </div>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
          >
            <span>Mở danh sách đơn</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Draft Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Bản nháp sản phẩm</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.draftStudioCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              sản phẩm đang lưu nháp (chưa xuất bản)
            </div>
          </div>
          <Link
            href="/admin/products?publicationStatus=DRAFT"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
          >
            <span>Xem bản nháp</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Published Studio Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Đã xuất bản web</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Package className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.publishedStudioCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              sản phẩm hiển thị trực tiếp Storefront
            </div>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
          >
            <span>Quản lý catalog</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Media Library Assets */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Thư viện Media</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Images className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {summary.mediaCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              tệp hình ảnh & video đã lưu trữ
            </div>
          </div>
          <Link
            href="/admin/media"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
          >
            <span>Mở thư viện ảnh</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 3. Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Lối tắt thao tác nhanh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noopener noreferrer" : undefined}
                className="bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 p-4 transition shadow-xs flex items-start gap-3.5 group"
              >
                <div className={`p-2.5 rounded-lg border shrink-0 ${action.accent}`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition flex items-center gap-1.5">
                    <span>{action.title}</span>
                    {action.external && <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{action.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Two Operational Focus Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Orders (2 cols) */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Đơn hàng mới tiếp nhận"
            subtitle="Danh sách các yêu cầu mua hàng cần liên hệ tư vấn và xác nhận"
            action={
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
              >
                <span>Xem tất cả ({summary.totalOrders})</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-0 overflow-x-auto"
          >
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Chưa có đơn hàng nào được gửi đến hệ thống.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-3 px-4">Mã đơn</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Điện thoại</th>
                    <th className="py-3 px-4 text-right">Tổng tiền</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {order.orderNumber || order.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {order.customerName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {order.customerPhone}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium transition"
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Chi tiết</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
        </div>

        {/* Right Column: Continue Editing */}
        <div>
          <AdminCard
            title="Tiếp tục biên tập"
            subtitle="Các sản phẩm vừa cập nhật gần đây"
            action={
              <Link
                href="/admin/products"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {recentStudioProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Chưa có sản phẩm nào được biên tập gần đây.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentStudioProducts.map((p) => {
                  const isPublished = Boolean(p.published);
                  return (
                    <div key={p.productId} className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">
                          {p.catalogName}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Phiên bản #{p.revision}</span>
                          <span>•</span>
                          <span>{isPublished ? "Đã xuất bản" : "Bản nháp"}</span>
                        </div>
                      </div>
                      <Link
                        href={`/admin/products/${p.productId}`}
                        className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition"
                      >
                        Sửa
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
