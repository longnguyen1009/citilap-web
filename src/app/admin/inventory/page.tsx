"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Store,
  Plus,
  Search,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import {
  PageHeader,
  AdminCard,
  StatusBadge,
  AdminLoadingState,
  AdminErrorState,
  InlineAlert,
} from "@/components/admin/ui";

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  status: string;
  address: string | null;
  availableSerials: number;
  totalSerials: number;
  totalOnHand: number;
}

interface SerialUnitItem {
  id: string;
  productId: string;
  warehouseId: string;
  serialNumber: string;
  condition: string;
  status: string;
  warrantyMonths: number | null;
  notes: string | null;
  receivedAt: string;
  updatedAt: string;
  productName: string;
  productSlug: string;
  productBrand: string | null;
  warehouseName: string;
  warehouseCode: string;
  publicCode: string | null;
  batteryHealth: number | null;
  appearance: string | null;
  inspectionPublished: number | null;
}

interface BalanceItem {
  id: string;
  warehouseId: string;
  productId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  productName: string;
  productSlug: string;
  productStock: number;
  variantSku: string | null;
  variantName: string | null;
  warehouseName: string;
  warehouseCode: string;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
  condition: string;
}

export default function AdminInventoryPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [serialUnits, setSerialUnits] = useState<SerialUnitItem[]>([]);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<"serials" | "balances" | "warehouses">("serials");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // New Serial Modal / Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newSerial, setNewSerial] = useState({
    productId: "",
    warehouseId: "",
    serialNumber: "",
    publicCode: "",
    condition: "LIKE_NEW",
    warrantyMonths: 12,
    batteryHealth: 98,
    appearance: "Đẹp 99% Like New, nguyên bản 100%, không cấn móp",
    notes: "",
  });

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (warehouseFilter !== "ALL") params.set("warehouseId", warehouseFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/admin/inventory?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải dữ liệu kho & serial.");
      }
      setWarehouses(json.data.warehouses || []);
      setSerialUnits(json.data.serialUnits || []);
      setBalances(json.data.balances || []);
      setProducts(json.data.products || []);
      if (!newSerial.productId && json.data.products?.[0]?.id) {
        setNewSerial((prev) => ({
          ...prev,
          productId: json.data.products[0].id,
          warehouseId: json.data.warehouses?.[0]?.id || "",
        }));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [warehouseFilter, statusFilter, searchQuery, newSerial.productId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const handleCreateSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.productId || !newSerial.warehouseId || !newSerial.serialNumber.trim()) {
      setFeedback({ type: "error", text: "Vui lòng chọn sản phẩm, kho và nhập số Serial." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_SERIAL",
          ...newSerial,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể thêm Serial mới.");
      }
      setFeedback({
        type: "success",
        text: `Đã nhập kho mã máy ${newSerial.serialNumber.toUpperCase()} thành công.`,
      });
      setShowAddForm(false);
      setNewSerial((prev) => ({ ...prev, serialNumber: "", publicCode: "", notes: "" }));
      void loadInventory();
    } catch (err) {
      setFeedback({ type: "error", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (serialId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SERIAL_STATUS",
          id: serialId,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể đổi trạng thái.");
      }
      setFeedback({ type: "success", text: `Đã cập nhật trạng thái Serial sang ${nextStatus}.` });
      void loadInventory();
    } catch (err) {
      setFeedback({ type: "error", text: (err as Error).message });
    }
  };

  if (loading && warehouses.length === 0) {
    return <AdminLoadingState message="Đang tải dữ liệu kho hàng, Serial & hồ sơ kiểm định..." />;
  }

  if (error && warehouses.length === 0) {
    return (
      <AdminErrorState
        title="Không thể tải dữ liệu kho"
        message={error}
        onRetry={() => void loadInventory()}
      />
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <PageHeader
        title="Kho hàng, Serial & Hồ sơ Kiểm định"
        description="Quản lý tồn kho tại Showroom Hà Nội & Bắc Ninh, theo dõi từng mã Serial/Service Tag và chứng thư kiểm định công khai (Public Code)."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nhập máy / Tạo mã Kiểm định</span>
            </button>
            <button
              type="button"
              onClick={() => void loadInventory()}
              className="inline-grid place-items-center size-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Làm mới"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.text}
        </InlineAlert>
      )}

      {/* Showroom / Warehouse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {warehouses.map((w) => (
          <div
            key={w.id}
            className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between gap-3 ${
              w.status === "ACTIVE" ? "border-slate-200" : "border-slate-200 opacity-65 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{w.name}</div>
                  <div className="text-[11px] font-mono text-slate-400">Mã kho: {w.code}</div>
                </div>
              </div>
              <StatusBadge status={w.status} />
            </div>
            <div className="text-xs text-slate-600 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{w.address || "Chưa cập nhật địa chỉ"}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Serial sẵn sàng: <strong className="text-emerald-700">{w.availableSerials}</strong> / {w.totalSerials}
              </span>
              <span className="text-slate-500">
                Tồn kho SL: <strong className="text-slate-900">{w.totalOnHand}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Add Serial + Inspection Form */}
      {showAddForm && (
        <AdminCard
          title="Nhập kho máy mới & Phát hành Mã kiểm định công khai (Public Code)"
          action={
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Đóng
            </button>
          }
        >
          <form onSubmit={handleCreateSerial} className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sản phẩm *</label>
              <select
                value={newSerial.productId}
                onChange={(e) => setNewSerial({ ...newSerial, productId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.condition})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Showroom / Kho lưu trữ *</label>
              <select
                value={newSerial.warehouseId}
                onChange={(e) => setNewSerial({ ...newSerial, warehouseId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                required
              >
                {warehouses
                  .filter((w) => w.status === "ACTIVE")
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Số Serial / Service Tag *</label>
              <input
                type="text"
                placeholder="VD: PF4X9L21"
                value={newSerial.serialNumber}
                onChange={(e) => setNewSerial({ ...newSerial, serialNumber: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Mã kiểm định công khai (Public Code)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const selProd = products.find((p) => p.id === newSerial.productId);
                    const prefix = selProd?.slug
                      ? selProd.slug
                          .replace(/^laptop-/, '')
                          .split('-')
                          .slice(0, 3)
                          .map((w) => w.slice(0, 3).toUpperCase())
                          .join('')
                      : 'CTL';
                    const serialTail = (
                      newSerial.serialNumber.trim() || Math.random().toString(36).slice(2, 6)
                    )
                      .toUpperCase()
                      .slice(-4);
                    setNewSerial((prev) => ({
                      ...prev,
                      publicCode: `CTL-${prefix}-${serialTail}`,
                    }));
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  title="Tạo mã kiểm định theo chuẩn CitiLap"
                >
                  Tạo mã tự động
                </button>
              </div>
              <input
                type="text"
                placeholder="VD: CTL-X1G11-02 (Khách tra cứu trên web)"
                value={newSerial.publicCode}
                onChange={(e) => setNewSerial({ ...newSerial, publicCode: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tình trạng &amp; Bảo hành (tháng)</label>
              <div className="flex gap-2">
                <select
                  value={newSerial.condition}
                  onChange={(e) => setNewSerial({ ...newSerial, condition: e.target.value })}
                  className="flex-1 p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="NEW">Mới 100% (NEW)</option>
                  <option value="LIKE_NEW">Like New 99% (LIKE_NEW)</option>
                  <option value="USED">Đã qua sử dụng (USED)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={newSerial.warrantyMonths}
                  onChange={(e) => setNewSerial({ ...newSerial, warrantyMonths: Number(e.target.value) || 12 })}
                  className="w-20 p-2 border border-slate-300 rounded-lg text-center"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dung lượng Pin % (0 - 100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newSerial.batteryHealth}
                onChange={(e) => setNewSerial({ ...newSerial, batteryHealth: Number(e.target.value) || 95 })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Ngoại hình &amp; Ghi chú kiểm định</label>
              <input
                type="text"
                value={newSerial.appearance}
                onChange={(e) => setNewSerial({ ...newSerial, appearance: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu Serial & Xuất bản Kiểm định"}
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("serials")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "serials"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Danh sách Serial &amp; Mã Kiểm định ({serialUnits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("balances")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === "balances"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tồn kho theo SKU ({balances.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeTab === "serials" && (
            <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "AVAILABLE", label: "Sẵn sàng" },
                { key: "RESERVED", label: "Đang giữ" },
                { key: "SOLD", label: "Đã bán" },
                { key: "QC_HOLD", label: "Chờ QC" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                    statusFilter === s.key
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Tìm Serial, Public Code, tên máy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-56 bg-white"
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs cursor-pointer"
          >
            <option value="ALL">Tất cả kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "serials" ? (
        <AdminCard title="Đơn vị máy theo Serial / Service Tag & Hồ sơ kiểm định" bodyClassName="p-0 overflow-x-auto">
          {serialUnits.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Không có Serial nào khớp bộ lọc.
            </div>
          ) : (
            <table className="admin-table w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th>Serial / Service Tag</th>
                  <th>Sản phẩm</th>
                  <th>Showroom / Kho</th>
                  <th>Mã Kiểm định (Public Code)</th>
                  <th>Tình trạng &amp; Pin</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serialUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="font-mono font-bold text-slate-900">{u.serialNumber}</td>
                    <td>
                      <Link
                        href={`/admin/products/${u.productId}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {u.productName}
                      </Link>
                      <div className="text-[11px] text-slate-400">
                        {u.productBrand || "CitiLap"} · BH {u.warrantyMonths || 12} tháng (1 đổi 1 7 ngày)
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-slate-800">{u.warehouseName}</span>
                      <div className="text-[10px] font-mono text-slate-400">{u.warehouseCode}</div>
                    </td>
                    <td>
                      {u.publicCode ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[11px]">
                            <ShieldCheck className="w-3 h-3" />
                            {u.publicCode}
                          </span>
                          <Link
                            href={`/order-tracking?code=${encodeURIComponent(u.publicCode)}`}
                            target="_blank"
                            className="text-slate-400 hover:text-blue-600"
                            title="Xem chứng thư kiểm định ngoài Storefront"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa cấp mã</span>
                      )}
                    </td>
                    <td>
                      <div className="font-medium text-slate-700">{u.condition}</div>
                      {u.batteryHealth !== null && u.batteryHealth !== undefined && (
                        <div className="text-[11px] text-slate-500">
                          Pin: <strong>{u.batteryHealth}%</strong>
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="text-right">
                      <select
                        aria-label={`Đổi trạng thái serial ${u.serialNumber}`}
                        value={u.status}
                        onChange={(e) => void handleStatusChange(u.id, e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded bg-white text-xs font-medium cursor-pointer"
                      >
                        <option value="AVAILABLE">Sẵn sàng (AVAILABLE)</option>
                        <option value="RESERVED">Giữ hàng (RESERVED)</option>
                        <option value="SOLD">Đã bán (SOLD)</option>
                        <option value="QC_HOLD">Chờ QC (QC_HOLD)</option>
                        <option value="REPAIR">Bảo hành (REPAIR)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </AdminCard>
      ) : (
        <AdminCard title="Bảng cân đối tồn kho theo SKU & Showroom" bodyClassName="p-0 overflow-x-auto">
          {balances.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">Chưa có dữ liệu cân đối tồn kho.</div>
          ) : (
            <table className="admin-table w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU / Phiên bản</th>
                  <th>Showroom / Kho</th>
                  <th className="text-right">Tồn thực tế (On Hand)</th>
                  <th className="text-right">Đang giữ (Reserved)</th>
                  <th className="text-right">Khả dụng</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balances.map((b) => {
                  const available = Math.max(0, b.onHand - b.reserved);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td>
                        <Link
                          href={`/admin/products/${b.productId}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {b.productName}
                        </Link>
                      </td>
                      <td className="font-mono text-slate-600">
                        {b.variantSku || "DEFAULT"} {b.variantName ? `· ${b.variantName}` : ""}
                      </td>
                      <td>{b.warehouseName}</td>
                      <td className="text-right font-bold tabular-nums">{b.onHand}</td>
                      <td className="text-right text-amber-700 tabular-nums">{b.reserved}</td>
                      <td className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold tabular-nums ${
                            available > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {available > 0 && <CheckCircle2 className="w-3 h-3" />}
                          {available}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setNewSerial((prev) => ({
                              ...prev,
                              productId: b.productId,
                              warehouseId: b.warehouseId,
                            }));
                            setShowAddForm(true);
                            setActiveTab("serials");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition cursor-pointer"
                          title="Nhập Serial mới cho sản phẩm này"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nhập Serial</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AdminCard>
      )}
    </div>
  );
}
