"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, User, MapPin, Truck, Calendar, RefreshCw, CheckCircle2, Clock, Phone, Mail, FileText } from "lucide-react";
import Image from "next/image";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  priceSnapshot?: number | null;
  lineTotal: number;
  productName: string | null;
  productNameSnapshot?: string | null;
  sku: string | null;
  skuSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  product?: {
    id: string;
    name: string;
    slug: string;
    images?: string;
  } | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  status: string;
  subtotalAmount: number;
  shippingFee: number;
  totalAmount: number;
  shippingAddress: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingMethod?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  note: string | null;
  items: OrderItem[];
};

function getFirstImage(imagesString?: string): string {
  if (!imagesString) return "";
  try {
    const parsed = JSON.parse(imagesString);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  } catch {
    // fallback
  }
  return "";
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let canceled = false;
    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then((result) => {
        if (!canceled && result.success && result.data) {
          setOrder(result.data);
        }
      })
      .catch((e) => {
        console.error("Failed to load order:", e);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [id]);

  const handleUpdateStatus = async (newStatus: "PENDING" | "COMPLETED") => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setOrder(result.data);
        setMessage({
          type: "success",
          text: newStatus === "COMPLETED" ? "Đã xác nhận hoàn thành đơn hàng." : "Đã chuyển đơn hàng về Chờ xác nhận.",
        });
      } else {
        setMessage({ type: "error", text: result?.error || "Không thể cập nhật trạng thái đơn hàng." });
      }
    } catch {
      setMessage({ type: "error", text: "Đã có lỗi kết nối." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-32 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="font-medium text-sm">Đang tải thông tin chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-6xl mx-auto py-32 text-center bg-white rounded-xl border border-gray-200 p-8">
        <p className="text-gray-600 mb-4 text-base">Không tìm thấy đơn hàng trong hệ thống.</p>
        <Link href="/admin/orders" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === "COMPLETED" || order.status === "Đã hoàn thành";

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/admin/orders"
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                {order.orderNumber || order.id}
              </h1>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {isCompleted ? "ĐÃ HOÀN THÀNH" : "CHỜ XÁC NHẬN"}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" /> Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN")}
              {order.completedAt && (
                <span className="text-emerald-700 ml-2">
                  • Hoàn thành lúc: {new Date(order.completedAt).toLocaleString("vi-VN")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <button
              type="button"
              onClick={() => void handleUpdateStatus("PENDING")}
              disabled={saving}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Chuyển về Chờ xử lý"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleUpdateStatus("COMPLETED")}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Đánh dấu Hoàn thành"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm border font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Sản phẩm trong đơn ({order.items.length})
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const image = getFirstImage(item.product?.images);
                const itemName = item.productNameSnapshot || item.productName || item.product?.name || "Sản phẩm";
                const itemSku = item.skuSnapshot || item.sku;
                const unitPrice = item.priceSnapshot || item.price;
                const lineTotal = item.lineTotal || unitPrice * item.quantity;

                return (
                  <div key={item.id} className="p-4.5 flex items-center gap-4 text-sm">
                    <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-lg p-1 shrink-0 relative flex items-center justify-center">
                      {image ? (
                        <Image src={image} alt="" fill sizes="64px" className="object-contain" />
                      ) : (
                        <span className="text-[10px] text-gray-400">Không có ảnh</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{itemName}</div>
                      {itemSku && <div className="text-xs text-blue-700 font-mono mt-0.5">SKU: {itemSku}</div>}
                      {item.variantNameSnapshot && (
                        <div className="text-xs text-gray-500 mt-0.5">Cấu hình: {item.variantNameSnapshot}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Đơn giá: {unitPrice.toLocaleString("vi-VN")}đ × <strong>{item.quantity}</strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-red-600 text-base">
                        {lineTotal.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal & Totals */}
            <div className="bg-gray-50/80 p-5 border-t border-gray-200">
              <div className="flex flex-col gap-2.5 max-w-xs ml-auto text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({order.items.reduce((s, i) => s + i.quantity, 0)} SP):</span>
                  <span className="font-bold text-gray-900">{order.subtotalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-gray-600 text-xs">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-gray-900">
                    {order.shippingFee === 0 ? "Xác nhận với khách" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
                  <span className="font-black text-gray-900 uppercase text-xs">Tổng đơn hàng:</span>
                  <span className="text-xl font-black text-red-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Delivery (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3.5 text-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <User className="w-4 h-4 text-blue-600" /> Khách hàng
            </h2>

            <div>
              <div className="font-bold text-gray-900 text-base">{order.customerName}</div>
              <div className="flex items-center gap-2 text-gray-600 mt-1 font-mono text-xs">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600 hover:underline">
                  {order.customerPhone}
                </a>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-gray-600 mt-1 text-xs">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-600 hover:underline truncate">
                    {order.customerEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <MapPin className="w-4 h-4 text-blue-600" /> Địa chỉ giao nhận
            </h2>
            <p className="text-gray-800 leading-relaxed text-xs">
              {order.shippingAddress || "Khách nhận tại cửa hàng / chưa có địa chỉ."}
            </p>
          </div>

          {/* Customer Note */}
          {order.note && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-2 text-sm">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <FileText className="w-4 h-4 text-blue-600" /> Ghi chú từ khách
              </h2>
              <p className="text-gray-700 italic text-xs leading-relaxed bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                &ldquo;{order.note}&rdquo;
              </p>
            </div>
          )}

          {/* Shipping / Payment Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-2.5 text-xs text-gray-600">
            <h2 className="font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Truck className="w-4 h-4 text-blue-600" /> Hình thức thanh toán
            </h2>
            <div className="flex justify-between">
              <span>Phương thức:</span>
              <strong className="text-gray-900">{order.paymentMethod || "COD"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Trạng thái:</span>
              <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Thu tiền khi nhận máy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
