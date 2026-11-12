"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Download,
  Search,
  RefreshCw,
  Calendar,
  X,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  StatusBadge,
  InlineAlert,
  DataTable,
  type DataTableColumn,
  useToast,
} from "@/components/admin/ui";

type OrderItemSummary = {
  id: string;
  productName: string | null;
  sku: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
};

type Order = {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  completedAt?: string | null;
  totalAmount: number;
  subtotalAmount: number;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  items: OrderItemSummary[];
  _count?: {
    events: number;
    internalNotes: number;
  };
};

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "NEW", label: "Mới" },
  { key: "CONTACTED", label: "Đã liên hệ" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Hoàn tất" },
  { key: "CANCELLED", label: "Đã hủy" },
];

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialPaymentStatus = searchParams.get("paymentStatus") || "ALL";
  const initialStartDate = searchParams.get("fromDate") || searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("toDate") || searchParams.get("endDate") || "";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialPaymentStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(25);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastPushedQueryRef = useRef<string>(searchParams.toString());

  useEffect(() => {
    const currentUrlQuery = searchParams.toString();
    if (currentUrlQuery === lastPushedQueryRef.current) {
      return;
    }
    lastPushedQueryRef.current = currentUrlQuery;

    const urlSearch = searchParams.get("search") || "";
    const urlStatus = searchParams.get("status") || "ALL";
    const urlPaymentStatus = searchParams.get("paymentStatus") || "ALL";
    const urlStartDate = searchParams.get("fromDate") || searchParams.get("startDate") || "";
    const urlEndDate = searchParams.get("toDate") || searchParams.get("endDate") || "";
    const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);

    setSearchTerm((prev) => (prev === urlSearch ? prev : urlSearch));
    setStatusFilter((prev) => (prev === urlStatus ? prev : urlStatus));
    setPaymentStatusFilter((prev) => (prev === urlPaymentStatus ? prev : urlPaymentStatus));
    setStartDate((prev) => (prev === urlStartDate ? prev : urlStartDate));
    setEndDate((prev) => (prev === urlEndDate ? prev : urlEndDate));
    setPage((prev) => (prev === urlPage ? prev : urlPage));
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (
      newSearch: string,
      newStatus: string,
      newPaymentStatus: string,
      newStart: string,
      newEnd: string,
      newPage: number
    ) => {
      const params = new URLSearchParams();
      if (newSearch.trim()) params.set("search", newSearch.trim());
      if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
      if (newPaymentStatus && newPaymentStatus !== "ALL") params.set("paymentStatus", newPaymentStatus);
      if (newStart) {
        params.set("fromDate", newStart);
        params.set("startDate", newStart);
      }
      if (newEnd) {
        params.set("toDate", newEnd);
        params.set("endDate", newEnd);
      }
      if (newPage > 1) params.set("page", String(newPage));

      const queryStr = params.toString();
      if (queryStr === lastPushedQueryRef.current) {
        return;
      }
      lastPushedQueryRef.current = queryStr;
      const targetUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const fetchOrders = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++requestSeqRef.current;

    setLoading(true);
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    if (paymentStatusFilter && paymentStatusFilter !== "ALL") query.set("paymentStatus", paymentStatusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);
    query.set("page", String(page));
    query.set("limit", String(pageSize));

    try {
      const res = await fetch(`/api/orders?${query.toString()}`, {
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
        signal: controller.signal,
      });
      const result = await res.json();
      if (reqId !== requestSeqRef.current || controller.signal.aborted) {
        return;
      }
      if (res.ok && result.success && Array.isArray(result.data)) {
        setOrders(result.data);
        setSelectedKeys([]);
        if (result.statusCounts) setStatusCounts(result.statusCounts);
        setFeedback(null);
        if (result.pagination) {
          const safeTotal = Math.max(0, Number(result.pagination.total) || 0);
          const safeTotalPages = Math.max(1, Number(result.pagination.totalPages) || 1);
          setTotal(safeTotal);
          setTotalPages(safeTotalPages);
          if (page > safeTotalPages) {
            setPage(safeTotalPages);
          }
        }
      } else {
        setFeedback({
          type: "error",
          message:
            result?.error?.message ||
            result?.error ||
            "Không thể tải danh sách đơn hàng.",
        });
      }
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        reqId !== requestSeqRef.current
      ) {
        return;
      }
      setFeedback({
        type: "error",
        message: "Không thể kết nối đến máy chủ.",
      });
    } finally {
      if (reqId === requestSeqRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page, pageSize]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOrders();
      updateUrlParams(searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page);
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchOrders, updateUrlParams, searchTerm, statusFilter, paymentStatusFilter, startDate, endDate, page]);

  const handleExport = () => {
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (statusFilter && statusFilter !== "ALL") query.set("status", statusFilter);
    if (paymentStatusFilter && paymentStatusFilter !== "ALL") query.set("paymentStatus", paymentStatusFilter);
    if (startDate) query.set("startDate", startDate);
    if (endDate) query.set("endDate", endDate);

    window.open(`/api/admin/orders/export?${query.toString()}`, "_blank");
  };

  const handleExportSelectedCsv = () => {
    const selectedSet = new Set(selectedKeys);
    const targetOrders = selectedSet.size > 0
      ? orders.filter((o) => selectedSet.has(o.id))
      : orders;
    if (targetOrders.length === 0) {
      toast.warning("Không có đơn hàng nào để xuất CSV.");
      return;
    }

    const headers = [
      "Mã đơn",
      "Ngày tạo",
      "Khách hàng",
      "Số điện thoại",
      "Email",
      "Địa chỉ giao hàng",
      "Sản phẩm",
      "Tổng tiền (VNĐ)",
      "Phương thức TT",
      "Trạng thái TT",
      "Trạng thái đơn",
    ];
    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = targetOrders.map((o) => {
      const itemsText = o.items
        ?.map((it) => `${it.productName || it.sku || "SP"} x${it.quantity}`)
        .join("; ");
      return [
        o.orderNumber || o.id.slice(0, 8),
        new Date(o.createdAt).toLocaleString("vi-VN"),
        o.customerName,
        o.customerPhone,
        o.customerEmail || "",
        o.shippingAddress || "",
        itemsText || "",
        o.totalAmount,
        o.paymentMethod === "BANK_TRANSFER" ? "VietQR" : "COD",
        o.paymentStatus === "PAID" ? "Đã thanh toán" : "Chờ thanh toán",
        o.status,
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `citilap-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất CSV ${targetOrders.length} đơn hàng.`);
  };

  const columns: DataTableColumn<Order>[] = [
    {
      key: "orderNumber",
      header: "Mã đơn",
      headerText: "Mã đơn",
      sortable: true,
      sortType: "text",
      sortValue: (o) => o.orderNumber || o.id,
      isRowHeader: true,
      render: (order) => {
        const noteCount = order._count?.internalNotes || 0;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Link
              href={`/admin/orders/${order.id}`}
              className="font-mono font-bold text-blue-600 hover:underline"
            >
              #{order.orderNumber || order.id.slice(0, 8)}
            </Link>
            {noteCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold tabular-nums"
                title={`${noteCount} ghi chú vận hành nội bộ`}
              >
                {noteCount} ghi chú
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "customerName",
      header: "Khách hàng",
      headerText: "Khách hàng",
      sortable: true,
      sortType: "text",
      sortValue: (o) => o.customerName,
      render: (order) => (
        <div className="whitespace-nowrap">
          <div className="font-semibold text-slate-900">{order.customerName}</div>
          <div className="text-[11px] text-slate-500 font-mono">{order.customerPhone}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Sản phẩm đặt",
      headerText: "Sản phẩm đặt",
      sortable: true,
      sortType: "number",
      sortValue: (o) => o.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
      render: (order) => {
        const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const firstItem = order.items?.[0]?.productName;
        return (
          <div>
            <div className="text-slate-800 line-clamp-1 max-w-[260px]">
              {firstItem || `${itemCount} sản phẩm`}
            </div>
            {itemCount > 1 && (
              <div className="text-[11px] text-slate-400">Tổng {itemCount} SP</div>
            )}
          </div>
        );
      },
    },
    {
      key: "totalAmount",
      header: "Tổng tiền",
      headerText: "Tổng tiền",
      align: "right",
      sortable: true,
      sortType: "number",
      sortValue: (o) => o.totalAmount,
      render: (order) => (
        <span className="whitespace-nowrap font-bold text-slate-900 tabular-nums">
          {order.totalAmount.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Thanh toán",
      headerText: "Thanh toán",
      align: "center",
      sortable: true,
      sortType: "text",
      sortValue: (o) => o.paymentStatus || "",
      render: (order) => {
        const isPaid = order.paymentStatus === "PAID";
        const methodLabel = order.paymentMethod === "BANK_TRANSFER" ? "VietQR" : "COD";
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${
              isPaid
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span>{methodLabel}</span>
            <span>·</span>
            <span>{isPaid ? "Đã thu" : "Chờ thu"}</span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      headerText: "Trạng thái",
      align: "center",
      sortable: true,
      sortType: "text",
      sortValue: (o) => o.status,
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "createdAt",
      header: "Ngày đặt",
      headerText: "Ngày đặt",
      align: "right",
      sortable: true,
      sortType: "date",
      sortValue: (o) => o.createdAt,
      render: (order) => (
        <span className="whitespace-nowrap text-slate-400 tabular-nums">
          {new Date(order.createdAt).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      headerText: "Thao tác",
      align: "right",
      render: (order) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="px-2.5 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs whitespace-nowrap"
        >
          Mở
        </Link>
      ),
    },
  ];

  const applyQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 1) {
      start.setDate(end.getDate() - (days - 1));
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStartDate(fmt(start));
    setEndDate(fmt(end));
    setPage(1);
  };

  const hasFilters = Boolean(
    searchTerm.trim() || statusFilter !== "ALL" || paymentStatusFilter !== "ALL" || startDate || endDate
  );

  return (
    <div className="space-y-3 pb-10">
      {/* 1. Compact Header */}
      <PageHeader
        title="Đơn hàng"
        description="Đơn gửi từ website. Mở chi tiết để xác nhận, xử lý giao hàng hoặc hủy; trạng thái đơn và thanh toán được theo dõi riêng."
        badge={
          <span className="text-xs px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full font-semibold tabular-nums">
            {total}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchOrders()}
              title="Làm mới"
              aria-label="Làm mới danh sách"
              className="inline-grid place-items-center size-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || total === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất CSV</span>
            </button>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Single-Card Workspace */}
      <AdminCard bodyClassName="p-0 overflow-hidden">
        {/* Status Tabs + Inline Filter Bar */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STATUS_TABS.map((t) => {
              const active = statusFilter === t.key;
              const count = statusCounts[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(t.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  }`}
                >
                  <span>{t.label}</span>
                  {typeof count === "number" && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                        active ? "bg-blue-700 text-white" : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs flex-1 max-w-md justify-end">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Tìm mã đơn, tên khách, SĐT"
                placeholder="Tìm mã đơn, tên khách, SĐT..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              aria-label="Lọc trạng thái thanh toán"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 cursor-pointer"
            >
              <option value="ALL">Thanh toán: Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setPaymentStatusFilter("ALL");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
        <details className="admin-filter-details" open={Boolean(startDate || endDate)}>
          <summary>Lọc theo ngày{startDate || endDate ? " · Đang áp dụng" : ""}</summary>
          <div className="admin-filter-fields">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              aria-label="Từ ngày"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs outline-none text-slate-700 bg-transparent"
              title="Từ ngày"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              aria-label="Đến ngày"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs outline-none text-slate-700 bg-transparent"
              title="Đến ngày"
            />
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
              {[
                { label: "Hôm nay", days: 1 },
                { label: "7 ngày", days: 7 },
                { label: "30 ngày", days: 30 },
              ].map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => applyQuickDateRange(preset.days)}
                  className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          </div>
        </details>


        {/* Orders DataTable */}
        <DataTable
          caption="Danh sách đơn hàng"
          columns={columns}
          data={orders}
          rowKey={(order) => order.id}
          loading={loading}
          emptyTitle="Không có đơn hàng phù hợp"
          emptyDescription="Thử thay đổi bộ lọc trạng thái, khoảng ngày hoặc từ khóa tìm kiếm."
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          bulkActions={
            <button
              type="button"
              onClick={handleExportSelectedCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Xuất CSV đơn hàng ({selectedKeys.length})</span>
            </button>
          }
          pagination={{
            page,
            pageSize,
            totalItems: total,
            totalPages,
            onPageChange: (p) => setPage(p),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </AdminCard>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Đang tải đơn hàng...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
