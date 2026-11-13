"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MessageSquareWarning,
  Award,
  BarChart3,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  StatusBadge,
  AdminLoadingState,
  AdminErrorState,
} from "@/components/admin/ui";

interface DashboardOrderItem {
  id: string;
  productName: string | null;
  sku: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface DashboardOrder {
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items?: DashboardOrderItem[];
}

interface PendingContactItem {
  id: string;
  name: string;
  phone: string;
  message: string | null;
  status: string;
  createdAt: string;
}

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
  recentOrders: DashboardOrder[];
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

type PeriodKey = "7d" | "30d" | "month" | "all";

const PERIOD_OPTIONS: { key: PeriodKey; label: string; compareLabel: string }[] = [
  { key: "7d", label: "7 ngày qua", compareLabel: "so với 7 ngày trước" },
  { key: "30d", label: "30 ngày qua", compareLabel: "so với 30 ngày trước" },
  { key: "month", label: "Tháng này", compareLabel: "so với tháng trước" },
  { key: "all", label: "Toàn thời gian", compareLabel: "tích lũy toàn hệ thống" },
];

const formatCurrency = (val: number) => `${Math.round(val).toLocaleString("vi-VN")}đ`;

const formatCompactVnd = (val: number) => {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}tr`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
  return `${val}đ`;
};

function calcPercentChange(current: number, previous: number): {
  pct: number;
  direction: "up" | "down" | "flat";
  text: string;
} {
  if (previous <= 0 && current <= 0) {
    return { pct: 0, direction: "flat", text: "0%" };
  }
  if (previous <= 0 && current > 0) {
    return { pct: 100, direction: "up", text: "+100%" };
  }
  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  if (Math.abs(rounded) < 0.1) {
    return { pct: 0, direction: "flat", text: "0%" };
  }
  return {
    pct: rounded,
    direction: rounded > 0 ? "up" : "down",
    text: `${rounded > 0 ? "+" : ""}${rounded}%`,
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [allOrders, setAllOrders] = useState<DashboardOrder[]>([]);
  const [pendingContacts, setPendingContacts] = useState<PendingContactItem[]>([]);
  const [pendingContactsTotal, setPendingContactsTotal] = useState(0);
  const [period, setPeriod] = useState<PeriodKey>("30d");
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
      const [dashRes, ordersRes, contactsRes] = await Promise.all([
        fetch("/api/dashboard", {
          credentials: "same-origin",
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        }),
        fetch("/api/orders?limit=100", {
          credentials: "same-origin",
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        }).catch(() => null),
        fetch("/api/admin/contacts?status=PENDING&limit=6", {
          credentials: "same-origin",
          headers: { "Cache-Control": "no-cache" },
          signal: controller.signal,
        }).catch(() => null),
      ]);

      const json = await dashRes.json().catch(() => null);
      if (!dashRes.ok || !json?.success || !json?.data) {
        throw new Error(
          json?.error || `Lỗi máy chủ (${dashRes.status}) khi tải dữ liệu tổng quan.`
        );
      }

      const ordersJson = ordersRes ? await ordersRes.json().catch(() => null) : null;
      const contactsJson = contactsRes ? await contactsRes.json().catch(() => null) : null;

      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setData(json.data);
        if (ordersJson?.success && Array.isArray(ordersJson.data)) {
          setAllOrders(ordersJson.data);
        } else {
          setAllOrders(json.data.recentOrders || []);
        }

        if (contactsJson?.success && Array.isArray(contactsJson.data)) {
          setPendingContacts(contactsJson.data);
          setPendingContactsTotal(
            Number(contactsJson.pagination?.pendingCount ?? contactsJson.pagination?.total ?? contactsJson.data.length)
          );
        } else {
          setPendingContacts([]);
          setPendingContactsTotal(0);
        }
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

  const analytics = useMemo(() => {
    const sourceOrders = allOrders.length > 0 ? allOrders : data?.recentOrders || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    let currentStart = new Date(0);
    let prevStart = new Date(0);
    let prevEnd = new Date(0);

    if (period === "7d") {
      currentStart = new Date(startOfToday.getTime() - 6 * dayMs);
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(currentStart.getTime() - 7 * dayMs);
    } else if (period === "30d") {
      currentStart = new Date(startOfToday.getTime() - 29 * dayMs);
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(currentStart.getTime() - 30 * dayMs);
    } else if (period === "month") {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(currentStart.getTime() - 1);
    }

    const validOrder = (o: DashboardOrder) => o.status !== "CANCELLED";

    const currentOrders = sourceOrders.filter((o) => {
      if (period === "all") return true;
      const t = new Date(o.createdAt).getTime();
      return t >= currentStart.getTime();
    });

    const previousOrders = sourceOrders.filter((o) => {
      if (period === "all") return false;
      const t = new Date(o.createdAt).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });

    const currentRevenue =
      period === "all" && data?.summary.completedRevenue
        ? data.summary.completedRevenue
        : currentOrders.filter(validOrder).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const previousRevenue = previousOrders
      .filter(validOrder)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const currentOrderCount =
      period === "all" && data?.summary.totalOrders
        ? data.summary.totalOrders
        : currentOrders.length;
    const previousOrderCount = previousOrders.length;

    const revenueDelta = calcPercentChange(currentRevenue, previousRevenue);
    const ordersDelta = calcPercentChange(currentOrderCount, previousOrderCount);

    // Build daily / bucket chart series
    const chartBuckets: { label: string; fullDate: string; revenue: number; orders: number }[] = [];
    const numDays = period === "7d" ? 7 : period === "30d" ? 14 : period === "month" ? Math.min(15, now.getDate()) : 10;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * dayMs);
      const nextD = new Date(d.getTime() + dayMs);
      const dayLabel = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      const matching = sourceOrders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= d.getTime() && t < nextD.getTime() && validOrder(o);
      });
      const rev = matching.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      chartBuckets.push({
        label: dayLabel,
        fullDate: d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
        revenue: rev,
        orders: matching.length,
      });
    }

    const maxBucketRevenue = Math.max(...chartBuckets.map((b) => b.revenue), 1);

    // Top-selling products in period
    const productMap = new Map<
      string,
      { key: string; name: string; sku: string; quantity: number; revenue: number }
    >();
    const targetForTop = currentOrders.length > 0 ? currentOrders.filter(validOrder) : sourceOrders.filter(validOrder);
    for (const order of targetForTop) {
      for (const item of order.items || []) {
        const name = item.productName || "Sản phẩm CitiLap";
        const key = item.sku || name;
        const existing = productMap.get(key) || {
          key,
          name,
          sku: item.sku || "",
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity || 1;
        existing.revenue += item.lineTotal || (item.price || 0) * (item.quantity || 1);
        productMap.set(key, existing);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);

    const newPendingOrdersList = sourceOrders
      .filter((o) => o.status === "NEW" || o.status === "PENDING")
      .slice(0, 6);

    return {
      currentRevenue,
      previousRevenue,
      currentOrderCount,
      previousOrderCount,
      revenueDelta,
      ordersDelta,
      chartBuckets,
      maxBucketRevenue,
      topProducts,
      newPendingOrdersList,
    };
  }, [allOrders, data, period]);

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
  const activePeriodMeta = PERIOD_OPTIONS.find((p) => p.key === period) || PERIOD_OPTIONS[1];

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
      {/* 1. Header + Period Selector */}
      <PageHeader
        title="Tổng quan vận hành"
        description="Theo dõi doanh thu, sản phẩm bán chạy và xử lý các hàng đợi vận hành trong ngày."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div
              role="group"
              aria-label="Chọn kỳ thống kê"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs"
            >
              {PERIOD_OPTIONS.map((opt) => {
                const active = period === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(opt.key)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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

      {/* 2. Period Comparison KPIs + Core Counts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Period Revenue Card with % Comparison */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Doanh thu ({activePeriodMeta.label})
            </span>
            {period !== "all" ? (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  analytics.revenueDelta.direction === "up"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : analytics.revenueDelta.direction === "down"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {analytics.revenueDelta.direction === "up" && <TrendingUp className="w-3 h-3" />}
                {analytics.revenueDelta.direction === "down" && <TrendingDown className="w-3 h-3" />}
                <span>{analytics.revenueDelta.text}</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Toàn thời gian
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums">
            {formatCurrency(analytics.currentRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {period !== "all"
                ? `Kỳ trước: ${formatCurrency(analytics.previousRevenue)}`
                : `Tổng doanh thu đơn hoàn tất: ${formatCurrency(summary.completedRevenue || 0)}`}
            </span>
            <span className="text-slate-500 font-medium">{activePeriodMeta.compareLabel}</span>
          </div>
        </div>

        {/* Period Orders Card with % Comparison */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500">Số đơn</span>
            {period !== "all" && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                  analytics.ordersDelta.direction === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : analytics.ordersDelta.direction === "down"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {analytics.ordersDelta.text}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {analytics.currentOrderCount}
          </div>
          <div className="text-[11px] text-slate-400">
            {period !== "all"
              ? `Kỳ trước: ${analytics.previousOrderCount} đơn`
              : `Tổng: ${summary.totalOrders} đơn`}
          </div>
        </div>

        {/* Clickable Operational Metric Cards */}
        {stats.slice(0, 3).map((st) => {
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

      {/* 2b. Status Funnel Bar */}
      <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">
          Phễu trạng thái đơn hàng toàn hệ thống ({summary.totalOrders} đơn):
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
              className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 hover:opacity-85 transition ${st.color}`}
            >
              <span>{st.label}:</span>
              <strong className="tabular-nums">{data.statusBreakdown?.[st.key] ?? 0}</strong>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Visual Daily Revenue Bar Chart + Top-Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AdminCard
            title={
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold">Biểu đồ doanh thu theo ngày</h2>
                <span className="text-xs text-slate-400 font-normal">
                  ({analytics.chartBuckets.length} ngày gần nhất)
                </span>
              </div>
            }
            action={
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Chi tiết đơn</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
          >
            <div className="pt-2">
              <div className="h-48 flex items-end gap-2 border-b border-slate-200 pb-2 px-1">
                {analytics.chartBuckets.map((bucket) => {
                  const heightPct =
                    bucket.revenue > 0
                      ? Math.max(10, Math.round((bucket.revenue / analytics.maxBucketRevenue) * 100))
                      : 4;
                  const isPeak =
                    bucket.revenue > 0 && bucket.revenue === analytics.maxBucketRevenue;
                  return (
                    <div
                      key={bucket.label}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      title={`${bucket.fullDate}: ${formatCurrency(bucket.revenue)} (${bucket.orders} đơn)`}
                    >
                      <div className="text-[10px] font-semibold text-slate-500 tabular-nums mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {bucket.revenue > 0 ? formatCompactVnd(bucket.revenue) : "0đ"}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[34px] rounded-t-md transition-all ${
                          bucket.revenue === 0
                            ? "bg-slate-100"
                            : isPeak
                            ? "bg-emerald-600 group-hover:bg-emerald-700"
                            : "bg-blue-600 group-hover:bg-blue-700"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-2 px-1">
                {analytics.chartBuckets.map((bucket) => (
                  <div
                    key={bucket.label}
                    className="flex-1 text-center text-[10px] font-mono text-slate-500 truncate"
                  >
                    {bucket.label}
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Top-Selling Products (Sản phẩm bán chạy) */}
        <div>
          <AdminCard
            title={
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold">Sản phẩm bán chạy</h2>
              </div>
            }
            action={
              <Link
                href="/admin/products"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <span>Kho SP</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {analytics.topProducts.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-slate-500">
                Chưa có dữ liệu sản phẩm bán ra trong kỳ này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {analytics.topProducts.map((tp, idx) => (
                  <div
                    key={tp.key}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold shrink-0 ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : idx === 1
                            ? "bg-slate-200 text-slate-700"
                            : idx === 2
                            ? "bg-orange-100 text-orange-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate" title={tp.name}>
                          {tp.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {tp.sku ? `SKU: ${tp.sku} · ` : ""}Đã bán:{" "}
                          <strong className="text-slate-700">{tp.quantity}</strong> máy
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-bold text-emerald-700 tabular-nums">
                      {formatCompactVnd(tp.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      {/* 4. Actionable Operational Queues (3 Queues: Low Stock <= 2, Pending Orders, Unanswered Contacts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Queue 1: Cảnh báo tồn kho thấp (<= 2) */}
        <AdminCard
          title={
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold">Cảnh báo tồn kho thấp (≤ 2)</h2>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold tabular-nums">
                {data.lowStockCount ?? data.lowStockProducts?.length ?? 0}
              </span>
            </div>
          }
          action={
            <Link
              href="/admin/inventory?lowStock=1"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Nhập kho</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {!data.lowStockProducts || data.lowStockProducts.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-500">
              Tất cả sản phẩm đang bán đều có tồn kho khả dụng &gt; 2.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-amber-50/40 transition"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block"
                    >
                      {p.name}
                    </Link>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      Giá: {formatCurrency(p.price)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border ${
                      p.stock === 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {p.stock === 0 ? "Hết hàng (0)" : `Còn ${p.stock} máy`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        {/* Queue 2: Đơn hàng mới chờ xử lý */}
        <AdminCard
          title={
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold">Đơn hàng mới chờ xử lý</h2>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold tabular-nums">
                {summary.pendingOrders}
              </span>
            </div>
          }
          action={
            <Link
              href="/admin/orders?status=NEW"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Xử lý ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {analytics.newPendingOrdersList.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-500">
              Không có đơn hàng mới đang chờ xử lý.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.newPendingOrdersList.map((o) => (
                <div
                  key={o.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/70 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-mono font-bold text-blue-600 hover:underline"
                      >
                        #{o.orderNumber || o.id.slice(0, 8)}
                      </Link>
                      <span className="font-semibold text-slate-900 truncate">
                        · {o.customerName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {o.customerPhone} · {formatCurrency(o.totalAmount)}
                    </div>
                  </div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="shrink-0 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 font-semibold text-[11px] hover:bg-blue-100"
                  >
                    Gọi xác nhận
                  </Link>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        {/* Queue 3: Liên hệ tư vấn chưa phản hồi */}
        <AdminCard
          title={
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-rose-600" />
              <h2 className="font-semibold">Liên hệ tư vấn chưa phản hồi</h2>
              <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold tabular-nums">
                {pendingContactsTotal}
              </span>
            </div>
          }
          action={
            <Link
              href="/admin/contacts?status=PENDING"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Mở hộp thư</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {pendingContacts.length === 0 ? (
            <div className="py-8 px-4 text-center text-xs text-slate-500">
              Tất cả yêu cầu tư vấn của khách hàng đã được phản hồi.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {pendingContacts.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/70 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {c.name} <span className="font-mono text-slate-500 font-normal">({c.phone})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {c.message || "Yêu cầu gọi lại tư vấn chọn máy"}
                    </div>
                  </div>
                  <Link
                    href={`/admin/contacts?status=PENDING&search=${encodeURIComponent(c.phone)}`}
                    className="shrink-0 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                  >
                    Phản hồi
                  </Link>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {/* 5. Recent Orders + Recently Edited Studio Products */}
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
