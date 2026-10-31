"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Mail,
  Phone,
  Download,
  RefreshCw,
  UserCheck,
  ShoppingCart,
  Users,
  Eye,
  X,
  Clock,
  AlertTriangle,
  Package,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  AdminButton,
  InlineAlert,
} from "@/components/admin/ui";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tier: string;
  nonCancelledTotal: number;
  totalSpend: number;
  totalOrders: number;
  lastOrder: string | null;
  createdAt: string;
  source: "REGISTERED" | "GUEST_ORDER";
  sourceLabel: string;
  orderNumber?: string | null;
};

type CustomersSummary = {
  total: number;
  registered: number;
  guest: number;
  totalNonCancelled: number;
};

type CustomerDetail = Customer & {
  orders: Array<{
    id: string;
    orderNumber: string | null;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
  }>;
  suggestedOrders?: Array<{
    id: string;
    orderNumber: string | null;
    customerName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
  }>;
  suggestedContacts?: Array<{
    id: string;
    name: string;
    message: string | null;
    status: string;
    createdAt: string;
  }>;
};

const tierBadge: Record<string, string> = {
  "Vàng": "text-amber-800 bg-amber-100 border-amber-200",
  "Bạc": "text-slate-700 bg-slate-200 border-slate-300",
  "Mới": "text-blue-700 bg-blue-100 border-blue-200",
  "Khách vãng lai": "text-purple-700 bg-purple-100 border-purple-200",
};

const SOURCE_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "REGISTERED", label: "Thành viên" },
  { key: "GUEST_ORDER", label: "Vãng lai" },
] as const;

const PAGE_LIMIT = 25;

function CustomersContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const initialTier = searchParams.get("tier") || "";
  const rawSource = searchParams.get("source") || "ALL";
  const initialSource = ["ALL", "REGISTERED", "GUEST_ORDER"].includes(rawSource)
    ? rawSource
    : "ALL";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [tierFilter, setTierFilter] = useState(initialTier);
  const [sourceFilter, setSourceFilter] = useState(initialSource);
  const [page, setPage] = useState(initialPage);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<CustomersSummary>({
    total: 0,
    registered: 0,
    guest: 0,
    totalNonCancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Anti-stale request guards
  const requestSeqRef = useRef(0);
  const listAbortRef = useRef<AbortController | null>(null);
  const detailSeqRef = useRef(0);
  const detailAbortRef = useRef<AbortController | null>(null);

  const updateUrlParams = useCallback(
    (nextSearch: string, nextTier: string, nextSource: string, nextPage: number) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextTier) params.set("tier", nextTier);
      if (nextSource && nextSource !== "ALL") params.set("source", nextSource);
      if (nextPage > 1) params.set("page", String(nextPage));

      const queryStr = params.toString();
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (targetUrl !== currentUrl) {
        window.history.replaceState(null, "", targetUrl);
      }
    },
    [pathname]
  );

  const fetchCustomers = useCallback(async () => {
    const reqId = ++requestSeqRef.current;
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (tierFilter) query.set("tier", tierFilter);
    if (sourceFilter !== "ALL") query.set("source", sourceFilter);
    query.set("page", String(page));
    query.set("limit", String(PAGE_LIMIT));

    updateUrlParams(searchTerm, tierFilter, sourceFilter, page);

    try {
      const response = await fetch(`/api/customers?${query.toString()}`, {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (reqId !== requestSeqRef.current || controller.signal.aborted) return;

      if (response.ok && result?.success && Array.isArray(result.data)) {
        const rows: Customer[] = result.data;
        setCustomers(rows);
        const pag = result.pagination;
        const resolvedTotal = Number(pag?.total ?? rows.length);
        const resolvedTotalPages = Math.max(1, Number(pag?.totalPages ?? 1));
        const resolvedPage = Math.max(1, Number(pag?.page ?? page));

        setTotal(resolvedTotal);
        setTotalPages(resolvedTotalPages);
        if (resolvedPage !== page) {
          setPage(resolvedPage);
        }

        if (result.summary) {
          setSummary({
            total: Number(result.summary.total ?? resolvedTotal),
            registered: Number(result.summary.registered ?? 0),
            guest: Number(result.summary.guest ?? 0),
            totalNonCancelled: Number(result.summary.totalNonCancelled ?? 0),
          });
        } else {
          setSummary({
            total: resolvedTotal,
            registered: rows.filter((c) => c.source === "REGISTERED").length,
            guest: rows.filter((c) => c.source === "GUEST_ORDER").length,
            totalNonCancelled: rows.reduce(
              (sum, c) => sum + (c.nonCancelledTotal ?? c.totalSpend ?? 0),
              0
            ),
          });
        }
      } else {
        const msg = result?.error || "Không thể tải danh sách khách hàng.";
        setLoadError(msg);
        setFeedback({ type: "error", message: msg });
      }
    } catch {
      if (controller.signal.aborted || reqId !== requestSeqRef.current) return;
      const msg = "Lỗi kết nối khi tải danh sách khách hàng.";
      setLoadError(msg);
      setFeedback({ type: "error", message: msg });
    } finally {
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchTerm, tierFilter, sourceFilter, page, updateUrlParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCustomers();
    }, 250);
    return () => {
      clearTimeout(timer);
      listAbortRef.current?.abort();
    };
  }, [fetchCustomers]);

  const loadCustomerDetail = async (id: string) => {
    const reqId = ++detailSeqRef.current;
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setSelectedCustomerId(id);
    setLoadingDetail(true);
    setCustomerDetail(null);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (reqId !== detailSeqRef.current || controller.signal.aborted) return;

      if (res.ok && data?.success && data.data) {
        setCustomerDetail(data.data);
      } else {
        setFeedback({
          type: "error",
          message: data?.error || "Không thể tải chi tiết khách hàng.",
        });
      }
    } catch {
      if (controller.signal.aborted || reqId !== detailSeqRef.current) return;
      setFeedback({
        type: "error",
        message: "Lỗi kết nối khi tải chi tiết khách hàng.",
      });
    } finally {
      if (reqId === detailSeqRef.current && !controller.signal.aborted) {
        setLoadingDetail(false);
      }
    }
  };

  const handleExport = () => {
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (tierFilter) query.set("tier", tierFilter);
    if (sourceFilter !== "ALL") query.set("source", sourceFilter);

    window.open(`/api/admin/customers/export?${query.toString()}`, "_blank");
  };

  const rangeStart = total === 0 || customers.length === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd =
    total === 0 || customers.length === 0
      ? 0
      : Math.min(total, (page - 1) * PAGE_LIMIT + customers.length);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-3">
      {/* 1. Header */}
      <PageHeader
        title="Khách hàng"
        description="Hồ sơ tổng hợp từ tài khoản và đơn hàng. Khách vãng lai được ghi nhận theo từng đơn; trùng số điện thoại chỉ là gợi ý, không tự gộp hồ sơ."
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
            {total}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchCustomers()}
              disabled={loading}
              aria-label="Tải lại danh sách"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />}
            />
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={loading || total === 0}
              title="Xuất toàn bộ khách hàng khớp bộ lọc hiện tại ra CSV"
              icon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Xuất CSV (toàn bộ lọc)
            </AdminButton>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Compact 4-Stat Strip (Full Filtered Dataset Totals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Hồ sơ</span>
          </div>
          <div className="text-base font-black text-slate-900 tabular-nums">
            {summary.total.toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Thành viên</span>
          </div>
          <div className="text-base font-black text-slate-900 tabular-nums">
            {summary.registered.toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
            <span>Vãng lai</span>
          </div>
          <div className="text-base font-black text-slate-900 tabular-nums">
            {summary.guest.toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex items-center justify-between">
          <div className="text-xs font-medium text-slate-500">Tổng chi</div>
          <div className="text-base font-black text-blue-700 tabular-nums">
            {summary.totalNonCancelled.toLocaleString("vi-VN")}đ
          </div>
        </div>
      </div>

      {/* 3. Unified Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Top Bar: Source Tabs + Inline Search & Tier */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1" role="tablist" aria-label="Lọc theo nguồn">
            {SOURCE_TABS.map((tab) => {
              const active = sourceFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSourceFilter(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Tìm kiếm khách hàng"
                placeholder="Tìm tên, SĐT, email…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Lọc theo phân hạng"
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="">Hạng: Tất cả</option>
              <option value="Vàng">Vàng</option>
              <option value="Bạc">Bạc</option>
              <option value="Mới">Mới</option>
            </select>

            {(searchTerm || tierFilter || sourceFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setTierFilter("");
                  setSourceFilter("ALL");
                  setPage(1);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-200/60 transition cursor-pointer whitespace-nowrap"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Khách hàng</th>
                <th className="py-2.5 px-4">Nguồn</th>
                <th className="py-2.5 px-4">Hạng</th>
                <th className="py-2.5 px-4 text-center">Đơn</th>
                <th className="py-2.5 px-4 text-right">Tổng chi</th>
                <th className="py-2.5 px-4 text-right">Đơn cuối</th>
                <th className="py-2.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                    <span>Đang tải khách hàng...</span>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="max-w-md mx-auto space-y-2.5">
                      <p className="text-xs font-semibold text-red-700">{loadError}</p>
                      <button
                        type="button"
                        onClick={() => void fetchCustomers()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Không có khách hàng phù hợp.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            customer.source === "REGISTERED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {(customer.name || customer.email || "K").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {customer.name || "Khách hàng"}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5 text-slate-400" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            customer.source === "REGISTERED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {customer.sourceLabel}
                        </span>
                        {customer.orderNumber && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            #{customer.orderNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          tierBadge[customer.tier] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {customer.tier}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-center font-bold text-slate-900 tabular-nums">
                      {customer.totalOrders}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-right font-bold text-blue-700 tabular-nums">
                      {(customer.nonCancelledTotal ?? customer.totalSpend ?? 0).toLocaleString("vi-VN")}đ
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-right text-slate-500 tabular-nums">
                      {customer.lastOrder
                        ? new Date(customer.lastOrder).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => void loadCustomerDetail(customer.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Server Pagination */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600 flex flex-wrap justify-between items-center gap-3">
          <div className="tabular-nums">
            Hiển thị{" "}
            <span className="font-bold text-slate-900">
              {rangeStart === 0 ? 0 : `${rangeStart}–${rangeEnd}`}
            </span>{" "}
            / <span className="font-bold text-slate-900">{total}</span> khách hàng
            <span className="hidden sm:inline text-slate-400 ml-2">
              • Khách vãng lai ghi nhận độc lập theo từng đơn
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium tabular-nums">
              Trang {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Trang sau"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-semibold cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* 4. Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[88vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Hồ sơ khách hàng</h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedCustomerId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  detailAbortRef.current?.abort();
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
                aria-label="Đóng"
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Đang tải hồ sơ...</span>
              </div>
            ) : customerDetail ? (
              <div className="space-y-4 text-xs">
                {/* Basic Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Họ tên</span>
                    <strong className="text-slate-900 text-sm">{customerDetail.name || "Khách hàng"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Điện thoại</span>
                    <span className="font-mono font-bold text-slate-800">{customerDetail.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email</span>
                    <span className="font-mono text-slate-800 truncate block">{customerDetail.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nguồn</span>
                    <span className="font-semibold text-slate-800">{customerDetail.sourceLabel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Hạng</span>
                    <span className="font-bold text-slate-800">{customerDetail.tier}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Tổng chi (không hủy)</span>
                    <span className="font-black text-blue-700 text-sm tabular-nums">
                      {customerDetail.nonCancelledTotal.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                {/* Primary Orders */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Đơn hàng ({customerDetail.orders.length})</span>
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {customerDetail.orders.map((o) => (
                      <div key={o.id} className="p-2.5 bg-white flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900 font-mono">
                            #{o.orderNumber || o.id.slice(0, 8)}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(o.createdAt).toLocaleString("vi-VN")} • {o.itemsCount} SP
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          <div className="font-bold text-slate-900">{o.totalAmount.toLocaleString("vi-VN")}đ</div>
                          <span className="text-[11px] font-semibold text-blue-600">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Orders by Phone */}
                {customerDetail.suggestedOrders && customerDetail.suggestedOrders.length > 0 && (
                  <div className="space-y-1.5 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Đơn trùng SĐT ({customerDetail.suggestedOrders.length})</span>
                    </div>
                    <div className="divide-y divide-amber-100 bg-white border border-amber-200 rounded-lg overflow-hidden">
                      {customerDetail.suggestedOrders.map((so) => (
                        <div key={so.id} className="p-2 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900">
                              #{so.orderNumber || so.id.slice(0, 8)} — {so.customerName}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {new Date(so.createdAt).toLocaleString("vi-VN")} • {so.itemsCount} SP
                            </div>
                          </div>
                          <div className="text-right tabular-nums">
                            <div className="font-bold text-slate-900">{so.totalAmount.toLocaleString("vi-VN")}đ</div>
                            <span className="text-[11px] font-semibold text-slate-600">{so.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Contacts */}
                {customerDetail.suggestedContacts && customerDetail.suggestedContacts.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tư vấn trùng SĐT/Email ({customerDetail.suggestedContacts.length})</span>
                    </h4>
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      {customerDetail.suggestedContacts.map((sc) => (
                        <div key={sc.id} className="p-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{sc.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(sc.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          {sc.message && <p className="text-slate-600 text-[11px] mt-0.5">{sc.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải khách hàng...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
