"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
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

function CustomersContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (tierFilter) query.set("tier", tierFilter);
    if (sourceFilter !== "ALL") query.set("source", sourceFilter);

    try {
      const response = await fetch(`/api/customers?${query.toString()}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setCustomers(result.data);
        if (result.pagination) setTotal(result.pagination.total);
      } else {
        setFeedback({
          type: "error",
          message: result?.error || "Không thể tải danh sách khách hàng.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối khi tải danh sách khách hàng.",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, tierFilter, sourceFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const loadCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingDetail(true);
    setCustomerDetail(null);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomerDetail(data.data);
      } else {
        setFeedback({
          type: "error",
          message: data?.error || "Không thể tải chi tiết khách hàng.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Lỗi kết nối khi tải chi tiết khách hàng.",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const stats = useMemo(() => {
    const count = customers.length;
    const registered = customers.filter((c) => c.source === "REGISTERED").length;
    const guest = customers.filter((c) => c.source === "GUEST_ORDER").length;
    const totalNonCancelled = customers.reduce(
      (sum, c) => sum + (c.nonCancelledTotal ?? c.totalSpend ?? 0),
      0
    );
    return { count, registered, guest, totalNonCancelled };
  }, [customers]);

  const handleExport = () => {
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.set("search", searchTerm.trim());
    if (tierFilter) query.set("tier", tierFilter);
    if (sourceFilter !== "ALL") query.set("source", sourceFilter);

    window.open(`/api/admin/customers/export?${query.toString()}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* 1. Header */}
      <PageHeader
        title="Quản lý Khách hàng"
        description="Dữ liệu khách hàng trung thực từ D1, phân biệt tài khoản thành viên và đơn đặt vãng lai (không tự động hợp nhất hoặc suy diễn danh tính)."
        breadcrumbs={[{ label: "Bán hàng" }, { label: "Khách hàng" }]}
        actions={
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={loading || customers.length === 0}
            icon={<Download className="w-4 h-4" aria-hidden="true" />}
          >
            Xuất CSV ({total || customers.length} khách)
          </AdminButton>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </InlineAlert>
      )}

      {/* 2. Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" /> Tổng hồ sơ hiển thị
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.count.toLocaleString("vi-VN")}</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" /> Tài khoản đăng ký
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.registered.toLocaleString("vi-VN")}</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-purple-600" /> Khách đặt vãng lai
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.guest.toLocaleString("vi-VN")}</div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
          <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Tổng đơn không hủy</span>
            <span className="text-[10px] text-slate-400 font-normal">status != CANCELLED</span>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {stats.totalNonCancelled.toLocaleString("vi-VN")}đ
          </div>
        </div>
      </div>

      {/* 3. Main Card with Search, Filter & Table */}
      <AdminCard bodyClassName="p-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between bg-slate-50/60">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm tên, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Lọc theo nguồn"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="ALL">Tất cả nguồn khách</option>
              <option value="REGISTERED">Tài khoản đăng ký</option>
              <option value="GUEST_ORDER">Khách vãng lai (Đơn hàng)</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Lọc theo phân hạng"
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="">Tất cả phân hạng</option>
              <option value="Vàng">Thành viên Vàng</option>
              <option value="Bạc">Thành viên Bạc</option>
              <option value="Mới">Thành viên Mới</option>
            </select>

            <button
              type="button"
              onClick={fetchCustomers}
              disabled={loading}
              aria-label="Tải lại danh sách"
              className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Nguồn</th>
                <th className="py-3 px-4">Phân hạng</th>
                <th className="py-3 px-4 text-center">Số đơn</th>
                <th className="py-3 px-4 text-right">Tổng đơn không hủy</th>
                <th className="py-3 px-4 text-right">Lần đặt cuối</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Đang tải danh sách khách hàng...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    Không tìm thấy khách hàng phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            customer.source === "REGISTERED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {(customer.name || customer.email || "K").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {customer.name || "Khách hàng"}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
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
                            Đơn: #{customer.orderNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          tierBadge[customer.tier] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {customer.tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center font-bold text-slate-900">
                      {customer.totalOrders}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-bold text-blue-700">
                      {(customer.nonCancelledTotal ?? customer.totalSpend ?? 0).toLocaleString("vi-VN")}đ
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right text-xs text-slate-500">
                      {customer.lastOrder
                        ? new Date(customer.lastOrder).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => loadCustomerDetail(customer.id)}
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600 flex justify-between items-center">
          <div>
            Hiển thị <span className="font-bold text-slate-900">{customers.length}</span> /{" "}
            <span className="font-bold text-slate-900">{total || customers.length}</span> hồ sơ
          </div>
          <div className="text-slate-400 text-[11px]">
            * Khách vãng lai được ghi nhận theo từng đơn; không tự động gộp hồ sơ dựa trên số điện thoại.
          </div>
        </div>
      </AdminCard>

      {/* 4. Customer Detail Modal / Drawer */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Chi tiết Hồ sơ Khách hàng</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono text-slate-700">{selectedCustomerId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Đang tải chi tiết hồ sơ...</span>
              </div>
            ) : customerDetail ? (
              <div className="space-y-6 text-xs sm:text-sm">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-xs block">Họ và tên</span>
                    <strong className="text-slate-900 text-base">{customerDetail.name || "Khách hàng"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Nguồn hồ sơ</span>
                    <span className="font-semibold text-slate-800">{customerDetail.sourceLabel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Số điện thoại</span>
                    <span className="font-mono font-bold text-slate-800">{customerDetail.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Email</span>
                    <span className="font-mono text-slate-800">{customerDetail.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Tổng giá trị đơn không hủy</span>
                    <span className="font-black text-blue-700 text-base">
                      {customerDetail.nonCancelledTotal.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block">Phân hạng</span>
                    <span className="font-bold text-slate-800">{customerDetail.tier}</span>
                  </div>
                </div>

                {/* Primary Orders */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm uppercase tracking-wider">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Đơn hàng chính ({customerDetail.orders.length})</span>
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {customerDetail.orders.map((o) => (
                      <div key={o.id} className="p-3 bg-white flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-900">
                            #{o.orderNumber || o.id.slice(0, 8)}
                          </div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(o.createdAt).toLocaleString("vi-VN")} • {o.itemsCount} sản phẩm
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{o.totalAmount.toLocaleString("vi-VN")}đ</div>
                          <span className="text-[11px] font-semibold text-blue-600">{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Orders by Phone */}
                {customerDetail.suggestedOrders && customerDetail.suggestedOrders.length > 0 && (
                  <div className="space-y-2 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Gợi ý đơn hàng liên quan cùng SĐT (Chưa xác minh cùng danh tính)</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Các đơn hàng dưới đây có cùng số điện thoại nhưng không được tự động gộp vào hồ sơ để tránh sai lệch dữ liệu:
                    </p>
                    <div className="divide-y divide-amber-100 bg-white border border-amber-200 rounded-lg overflow-hidden mt-2">
                      {customerDetail.suggestedOrders.map((so) => (
                        <div key={so.id} className="p-2.5 flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-slate-900">
                              #{so.orderNumber || so.id.slice(0, 8)} — {so.customerName}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {new Date(so.createdAt).toLocaleString("vi-VN")} • {so.itemsCount} sản phẩm
                            </div>
                          </div>
                          <div className="text-right">
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
                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>Yêu cầu tư vấn gửi cùng số điện thoại/email ({customerDetail.suggestedContacts.length})</span>
                    </h4>
                    <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      {customerDetail.suggestedContacts.map((sc) => (
                        <div key={sc.id} className="p-2.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800">{sc.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(sc.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          {sc.message && <p className="text-slate-600 text-[11px] mt-1">{sc.message}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
              >
                Đóng
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Đang tải trang khách hàng...</div>}>
      <CustomersContent />
    </Suspense>
  );
}
