"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
    completedRevenue?: number;
  };
  statusBreakdown?: Record<string, number>;
  lowStockCount?: number;
  lowStockProducts?: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    price: number;
  }[];
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
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async () => {
    const reqId = ++requestSeqRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data) {
        throw new Error(
          json?.error || `Lỗi máy chủ (${res.status}) khi tải dữ liệu tổng quan.`
        );
      }
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setData(json.data);
      }
    } catch (err) {
      if (controller.signal.aborted || reqId !== requestSeqRef.current) return;
      setError(err instanceof Error ? err.message : "Mất kết nối mạng.");
    } finally {
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
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
      label: "Đã xuất bản",
      value: summary.publishedStudioCount,
      href: "/admin/products?publicationStatus=PUBLISHED",
      icon: Package,
      tone: "",
      iconTone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Chưa xuất bản",
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
    { label: "Thêm sản phẩm", href: "/admin/products/new", icon: Plus, primary: true },
    { label: "Kho & Kiểm định", href: "/admin/inventory", icon: Package },
    { label: "Viết bài", href: "/admin/posts/new", icon: Newspaper },
    { label: "Flash Sale", href: "/admin/campaigns", icon: Zap },
    { label: "Bố cục trang", href: "/admin/builder", icon: LayoutTemplate },
    { label: "Xem web", href: "/", icon: ExternalLink, external: true },
  ];

  return (
    <div className="admin-dashboard space-y-5 pb-10">
      {/* Page actions and daily shortcuts have separate rows. */}
      <PageHeader
        title="Tổng quan"
        description="Tiếp nhận đơn hàng, kiểm tra tồn kho và tiếp tục biên tập nội dung."
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
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

      <section aria-label="Thao tác thường dùng" className="flex flex-wrap items-center gap-2">
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
      </section>

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

      {/* 2b. Revenue & Order Status Funnel + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">Doanh thu đơn hoàn tất · Tất cả thời gian</div>
            <div className="text-xl font-black text-emerald-700 tabular-nums mt-0.5">
              {formatCurrency(summary.completedRevenue || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tổng số đơn ghi nhận: <strong className="text-slate-700">{summary.totalOrders}</strong> đơn
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              { key: "NEW", label: "Mới", color: "bg-amber-50 text-amber-800 border-amber-200" },
              { key: "CONTACTED", label: "Đã liên hệ", color: "bg-sky-50 text-sky-800 border-sky-200" },
              { key: "CONFIRMED", label: "Đã xác nhận", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
              { key: "COMPLETED", label: "Hoàn tất", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
              { key: "CANCELLED", label: "Đã hủy", color: "bg-rose-50 text-rose-800 border-rose-200" },
            ].map((st) => (
              <Link
                key={st.key}
                href={`/admin/orders?status=${st.key}`}
                className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 hover:opacity-85 transition ${st.color}`}
              >
                <span>{st.label}:</span>
                <strong className="tabular-nums">{data.statusBreakdown?.[st.key] ?? 0}</strong>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">Cảnh báo tồn kho thấp (≤ 2)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {(data.lowStockCount ?? data.lowStockProducts?.length ?? 0) === 0
                ? "Không có sản phẩm tồn khả dụng ≤ 2"
                : `${data.lowStockCount ?? data.lowStockProducts?.length} sản phẩm sắp hết / hết hàng`}
            </div>
            {data.lowStockProducts && data.lowStockProducts.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {data.lowStockProducts.map((p) => <li key={p.id}><Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name} · Khả dụng: {p.stock}</Link></li>)}
              </ul>
            )}
          </div>
          <Link
            href="/admin/inventory"
            className="shrink-0 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            Kho &amp; Kiểm định →
          </Link>
        </div>
      </div>

      {/* 3. Two Columns: Recent Orders + Recent Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AdminCard
            title={
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Đơn hàng gần đây</h2>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold tabular-nums">
                  {recentOrders.length}
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
                            {isPublished ? "Đã xuất bản" : "Chưa xuất bản"}
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
