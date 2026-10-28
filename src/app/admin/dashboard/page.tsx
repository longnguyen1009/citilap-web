"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Images,
  Sparkles,
  ExternalLink,
  Plus,
  RotateCcw,
  ArrowRight,
  Zap,
  Newspaper,
  LayoutTemplate,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
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
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <AdminLoadingState message="Đang tải tổng quan..." />;
  }

  if (error || !data) {
    return (
      <AdminErrorState
        title="Không thể tải tổng quan"
        message={error || "Không thể kết nối đến cơ sở dữ liệu."}
        onRetry={() => void loadDashboard()}
      />
    );
  }

  const { summary, recentOrders, recentStudioProducts } = data;

  const stats = [
    {
      label: "Đơn chờ xử lý",
      value: summary.pendingOrders,
      href: "/admin/orders?status=NEW",
      icon: ShoppingCart,
      tone: summary.pendingOrders > 0 ? "border-l-4 border-l-amber-500" : "",
      iconTone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Đang bán trên web",
      value: summary.publishedStudioCount,
      href: "/admin/products?publicationStatus=PUBLISHED",
      icon: Package,
      tone: "",
      iconTone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Bản nháp",
      value: summary.draftStudioCount,
      href: "/admin/products?publicationStatus=DRAFT",
      icon: Sparkles,
      tone: "",
      iconTone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Media",
      value: summary.mediaCount,
      href: "/admin/media",
      icon: Images,
      tone: "",
      iconTone: "bg-indigo-50 text-indigo-600",
    },
  ];

  const shortcuts = [
    { label: "+ Sản phẩm", href: "/admin/products/new", icon: Plus, primary: true },
    { label: "+ Bài viết", href: "/admin/posts/new", icon: Newspaper },
    { label: "Flash Sale", href: "/admin/campaigns", icon: Zap },
    { label: "Trang chủ", href: "/admin/builder", icon: LayoutTemplate },
    { label: "Xem web", href: "/", icon: ExternalLink, external: true },
  ];

  return (
    <div className="admin-dashboard space-y-5 pb-10">
      {/* 1. Header with Quick Shortcuts inline */}
      <PageHeader
        title="Tổng quan"
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {shortcuts.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  target={s.external ? "_blank" : undefined}
                  rel={s.external ? "noopener noreferrer" : undefined}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition ${
                    s.primary
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{s.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void loadDashboard()}
              title="Làm mới"
              aria-label="Làm mới"
              className="inline-grid place-items-center size-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        }
      />

      {/* 2. Compact Clickable Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <Link
              key={st.label}
              href={st.href}
              className={`bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-300 transition flex items-center justify-between gap-3 ${st.tone}`}
            >
              <div>
                <div className="text-xs font-medium text-slate-500">{st.label}</div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{st.value}</div>
              </div>
              <div className={`p-2.5 rounded-lg ${st.iconTone}`}>
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3. Two Columns: Recent Orders + Recent Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AdminCard
            title={
              <div className="flex items-center gap-2">
                <span>Đơn hàng mới</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold tabular-nums">
                  {summary.totalOrders}
                </span>
              </div>
            }
            action={
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-0 overflow-x-auto"
          >
            {recentOrders.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">Chưa có đơn hàng.</div>
            ) : (
              <table className="admin-table w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th className="text-right">Tổng tiền</th>
                    <th className="text-center">Trạng thái</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="font-mono font-semibold">
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline">
                          #{order.orderNumber || order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        <div className="font-medium text-slate-900">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{order.customerPhone}</div>
                      </td>
                      <td className="text-right font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs"
                        >
                          Mở
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
        </div>

        <div>
          <AdminCard
            title="Vừa biên tập"
            action={
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {recentStudioProducts.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">Chưa có sản phẩm.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentStudioProducts.map((p) => {
                  const isPublished = Boolean(p.published);
                  return (
                    <Link
                      key={p.productId}
                      href={`/admin/products/${p.productId}`}
                      className="px-4 py-3 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">{p.catalogName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono">#{p.revision}</span>
                          <span>·</span>
                          <span className={isPublished ? "text-emerald-600 font-medium" : "text-slate-500"}>
                            {isPublished ? "Đang bán" : "Nháp"}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-blue-600 font-medium">Sửa →</span>
                    </Link>
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
