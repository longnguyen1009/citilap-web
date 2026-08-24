"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ArrowLeft, Save, User, MapPin, CreditCard, Truck, Calendar, RefreshCw } from "lucide-react";

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  shippingAddress: string | null;
  paymentMethod: string;
  paymentStatus: string;
  user: { name: string | null; email: string; phone: string | null } | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { name: string; images: string } | null;
  }[];
};

const ORDER_STATUSES = ["Chờ xác nhận", "Đang xử lý", "Đang vận chuyển", "Đã hoàn thành", "Đã hủy"];
const PAYMENT_STATUSES = ["Chưa thanh toán", "Đã thanh toán", "Đã hoàn tiền"];

const statusBadge: Record<string, string> = {
  "Chờ xác nhận": "bg-yellow-100 text-yellow-800",
  "Đang xử lý": "bg-blue-100 text-blue-800",
  "Đang vận chuyển": "bg-purple-100 text-purple-800",
  "Đã hoàn thành": "bg-green-100 text-green-800",
  "Đã hủy": "bg-red-100 text-red-800",
};

function getImage(images: string) {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && parsed[0] ? parsed[0] : "";
  } catch {
    return images || "";
  }
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/orders/${id}`);
        const result = await response.json();
        if (canceled) return;
        if (result.success) {
          setOrder(result.data);
          setStatus(result.data.status);
          setPaymentStatus(result.data.paymentStatus);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => { canceled = true; };
  }, [id]);

  const updateOrder = async () => {
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, paymentStatus }),
    });
    const result = await response.json();
    setSaving(false);
    if (response.ok && result.success) {
      setOrder(result.data);
      setMessage("Đã cập nhật đơn hàng.");
    } else {
      setMessage("Không thể cập nhật đơn hàng.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-32 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-3" /> Đang tải đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto py-32 text-center">
        <p className="text-gray-500 mb-4">Không tìm thấy đơn hàng.</p>
        <Link href="/admin/orders" className="text-blue-600 font-bold hover:underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              Đơn hàng <span className="text-blue-600">#{order.id}</span>
              <span className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold ${statusBadge[order.status] || "bg-gray-100 text-gray-800"}`}>
                {order.status}
              </span>
            </h1>
            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" /> Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void updateOrder()}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Cập nhật"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col: Order Items & Status */}
        <div className="xl:col-span-2 space-y-8">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Chi tiết sản phẩm</h2>
              <span className="text-sm font-medium text-gray-500">{order.items.length} mặt hàng</span>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sản phẩm</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Đơn giá</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">SL</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {order.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Đơn hàng chưa có sản phẩm.</td></tr>
                ) : (
                  order.items.map((item) => {
                    const image = item.product ? getImage(item.product.images) : "";
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded border border-gray-200 p-1 flex-shrink-0 bg-white flex items-center justify-center">
                              {image ? <img src={image} alt="" className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400">—</span>}
                            </div>
                            <div className="font-bold text-gray-900 text-sm">{item.product?.name || "Sản phẩm đã xóa"}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                          {item.price.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500 font-bold">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                          {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex flex-col gap-3 max-w-sm ml-auto">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tạm tính:</span>
                  <span className="font-bold text-gray-900">{subtotal.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
                  <span className="font-bold text-gray-900 uppercase">Tổng cộng:</span>
                  <span className="text-2xl font-black text-red-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Cập nhật Trạng thái
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái đơn hàng</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái thanh toán</label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {message && <p className="mt-4 text-sm font-medium text-blue-600">{message}</p>}
          </div>
        </div>

        {/* Right Col: Customer & Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-blue-600" /> Khách hàng
            </h2>
            <div className="space-y-3">
              <div className="font-bold text-gray-900">{order.user?.name || "Khách vãng lai"}</div>
              {order.user?.email && (
                <div className="text-sm text-gray-600"><a href={`mailto:${order.user.email}`} className="hover:text-blue-600">{order.user.email}</a></div>
              )}
              {order.user?.phone && (
                <div className="text-sm text-gray-600"><a href={`tel:${order.user.phone}`} className="hover:text-blue-600">{order.user.phone}</a></div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <MapPin className="w-5 h-5 text-blue-600" /> Giao hàng
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{order.shippingAddress || "Chưa có địa chỉ giao hàng."}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" /> Thanh toán
            </h2>
            <div className="space-y-3">
              <div className="font-bold text-gray-900">{order.paymentMethod}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Trạng thái:</span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${order.paymentStatus === "Đã thanh toán" ? "bg-green-100 text-green-800" : order.paymentStatus === "Đã hoàn tiền" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
