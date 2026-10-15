"use client";

import Link from "next/link";
import { use, useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  User,
  MapPin,
  Truck,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  History,
  Send,
  XCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { StatusBadge, InlineAlert } from "@/components/admin/ui";

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

type OrderEvent = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  note: string | null;
  actor: string;
  createdAt: string;
};

type OrderNote = {
  id: string;
  content: string;
  actor: string;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  status: string;
  revision: number;
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
  events: OrderEvent[];
  internalNotes: OrderNote[];
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

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const unwrapped =
    params && typeof (params as Promise<{ id: string }>).then === "function"
      ? use(params as Promise<{ id: string }>)
      : (params as { id: string });
  const id = unwrapped.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Modal state for cancel / reopen reasons
  const [reasonModal, setReasonModal] = useState<{
    open: boolean;
    targetStatus: "CANCELLED" | "NEW";
    title: string;
    reasonText: string;
  }>({
    open: false,
    targetStatus: "CANCELLED",
    title: "",
    reasonText: "",
  });

  const loadOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setOrder(result.data);
        setConflictError(null);
      } else {
        setFeedback({
          type: "error",
          text: result?.error || "Không thể tải thông tin đơn hàng.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi tải đơn hàng." });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let canceled = false;
    fetch(`/api/orders/${id}`, {
      headers: { "Cache-Control": "no-cache" },
    })
      .then((res) => res.json())
      .then((result) => {
        if (!canceled && result.success && result.data) {
          setOrder(result.data);
          setConflictError(null);
        } else if (!canceled) {
          setFeedback({
            type: "error",
            text: result?.error || "Không thể tải thông tin đơn hàng.",
          });
        }
      })
      .catch(() => {
        if (!canceled) {
          setFeedback({ type: "error", text: "Lỗi kết nối khi tải đơn hàng." });
        }
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [id]);

  const handleExecuteTransition = async (
    targetStatus: "NEW" | "CONTACTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED",
    reason?: string
  ) => {
    if (!order || transitioning) return;
    setTransitioning(true);
    setFeedback(null);
    setConflictError(null);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          expectedRevision: order.revision,
          reason: reason?.trim() || undefined,
          actor: "Nhân viên vận hành",
        }),
      });

      const result = await response.json();

      if (response.status === 409) {
        // Optimistic concurrency conflict!
        setConflictError(
          result?.error?.message ||
            "Đơn hàng vừa được chỉnh sửa bởi phiên làm việc khác. Bản nháp ghi chú của bạn đã được bảo toàn."
        );
        return;
      }

      if (response.ok && result.success) {
        setOrder(result.data);
        setFeedback({
          type: "success",
          text: `Đã cập nhật trạng thái đơn hàng sang "${targetStatus}".`,
        });
        if (reasonModal.open) {
          setReasonModal((m) => ({ ...m, open: false, reasonText: "" }));
        }
      } else {
        setFeedback({
          type: "error",
          text: result?.error?.message || result?.error || "Không thể chuyển trạng thái đơn hàng.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi cập nhật đơn hàng." });
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || addingNote) return;

    setAddingNote(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/orders/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteContent.trim(),
          actor: "Nhân viên vận hành",
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setNewNoteContent("");
        setFeedback({ type: "success", text: "Đã thêm ghi chú nội bộ thành công." });
        // Refresh to show new note in timeline
        void loadOrder();
      } else {
        setFeedback({
          type: "error",
          text: result?.error || "Không thể thêm ghi chú nội bộ.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi gửi ghi chú." });
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-32 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="font-medium text-sm">Đang tải thông tin chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-6xl mx-auto py-32 text-center bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-slate-600 mb-4 text-base">Không tìm thấy đơn hàng trong hệ thống.</p>
        <Link
          href="/admin/orders"
          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const currentStatus = order.status;

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/admin/orders"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
            title="Quay lại danh sách đơn hàng"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {order.orderNumber || order.id}
              </h1>
              <StatusBadge status={order.status} />
              <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Rev: {order.revision}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày đặt:{" "}
              {new Date(order.createdAt).toLocaleString("vi-VN")}
              {order.completedAt && (
                <span className="text-emerald-700 ml-2">
                  • Hoàn tất lúc: {new Date(order.completedAt).toLocaleString("vi-VN")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Transition Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* NEW (Mới) */}
          {(currentStatus === "NEW" || currentStatus === "PENDING") && (
            <>
              <button
                type="button"
                id="btn-transition-contacted"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONTACTED")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Đã liên hệ</span>
              </button>

              <button
                type="button"
                id="btn-transition-confirmed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận đơn</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={transitioning}
                onClick={() =>
                  setReasonModal({
                    open: true,
                    targetStatus: "CANCELLED",
                    title: "Hủy đơn hàng",
                    reasonText: "",
                  })
                }
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-2 px-3 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

          {/* CONTACTED (Đã liên hệ) */}
          {currentStatus === "CONTACTED" && (
            <>
              <button
                type="button"
                id="btn-transition-confirmed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận đơn</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={transitioning}
                onClick={() =>
                  setReasonModal({
                    open: true,
                    targetStatus: "CANCELLED",
                    title: "Hủy đơn hàng",
                    reasonText: "",
                  })
                }
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-2 px-3 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

          {/* CONFIRMED (Đã xác nhận) */}
          {currentStatus === "CONFIRMED" && (
            <>
              <button
                type="button"
                id="btn-transition-completed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("COMPLETED")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hoàn tất xử lý yêu cầu</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={transitioning}
                onClick={() =>
                  setReasonModal({
                    open: true,
                    targetStatus: "CANCELLED",
                    title: "Hủy đơn hàng",
                    reasonText: "",
                  })
                }
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-2 px-3 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

          {/* CANCELLED (Đã hủy) */}
          {currentStatus === "CANCELLED" && (
            <button
              type="button"
              id="btn-transition-reopen"
              disabled={transitioning}
              onClick={() =>
                setReasonModal({
                  open: true,
                  targetStatus: "NEW",
                  title: "Mở lại đơn hàng đã hủy",
                  reasonText: "",
                })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3.5 rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mở lại đơn</span>
            </button>
          )}

          {/* COMPLETED (Hoàn tất) */}
          {currentStatus === "COMPLETED" && (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Hoàn tất xử lý yêu cầu
            </span>
          )}
        </div>
      </div>

      {/* 409 Conflict Banner */}
      {conflictError && (
        <div
          id="concurrency-conflict-banner"
          className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Xung đột phiên làm việc (409 Conflict)</p>
              <p className="text-xs text-amber-800 mt-0.5">{conflictError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadOrder()}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
          >
            Tải lại dữ liệu mới nhất
          </button>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.text}
        </InlineAlert>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items + Internal Notes (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Items Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Sản phẩm trong đơn ({order.items.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const image = getFirstImage(item.product?.images);
                const itemName = item.productNameSnapshot || item.productName || item.product?.name || "Sản phẩm";
                const itemSku = item.skuSnapshot || item.sku;
                const unitPrice = item.priceSnapshot || item.price;
                const lineTotal = item.lineTotal || unitPrice * item.quantity;

                return (
                  <div key={item.id} className="p-4.5 flex items-center gap-4 text-sm">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 relative flex items-center justify-center">
                      {image ? (
                        <Image src={image} alt="" fill sizes="64px" className="object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Không có ảnh</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{itemName}</span>
                        {item.product && (
                          <Link
                            href={`/laptop/${item.product.slug}`}
                            target="_blank"
                            className="text-slate-400 hover:text-blue-600 transition"
                            title="Xem trang sản phẩm hiện tại"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                      {itemSku && <div className="text-xs text-blue-700 font-mono mt-0.5">SKU: {itemSku}</div>}
                      {item.variantNameSnapshot && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Cấu hình: {item.variantNameSnapshot}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Đơn giá lúc đặt: {unitPrice.toLocaleString("vi-VN")}đ × <strong>{item.quantity}</strong>
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

            {/* Totals Summary */}
            <div className="bg-slate-50/80 p-5 border-t border-slate-200">
              <div className="flex flex-col gap-2.5 max-w-xs ml-auto text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính ({order.items.reduce((s, i) => s + i.quantity, 0)} SP):</span>
                  <span className="font-bold text-slate-900">{order.subtotalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-slate-900">
                    {order.shippingFee === 0 ? "Xác nhận với khách" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="font-black text-slate-900 uppercase text-xs">Tổng đơn hàng:</span>
                  <span className="text-xl font-black text-red-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Staff Notes Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Ghi chú nội bộ nhân viên
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chỉ lưu hành nội bộ bộ phận tư vấn & vận hành, không gửi cho khách hàng.
                </p>
              </div>
            </div>

            {/* Note form */}
            <form onSubmit={handleAddInternalNote} className="space-y-2">
              <textarea
                id="internal-note-input"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Nhập ghi chú vận hành (ví dụ: đã gọi khách hẹn 14h, khách yêu cầu cài thêm Windows 11 Pro)..."
                className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-slate-50/50"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{newNoteContent.length}/2000 ký tự</span>
                <button
                  type="submit"
                  id="btn-add-internal-note"
                  disabled={!newNoteContent.trim() || addingNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{addingNote ? "Đang lưu..." : "Lưu ghi chú"}</span>
                </button>
              </div>
            </form>

            {/* List of internal notes */}
            <div className="space-y-3 pt-2">
              {order.internalNotes?.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có ghi chú nội bộ nào.</p>
              ) : (
                order.internalNotes?.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span className="font-bold text-slate-700">{n.actor}</span>
                      <span>{new Date(n.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info, Shipping & Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3.5 text-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <User className="w-4 h-4 text-blue-600" /> Khách hàng
            </h2>

            <div>
              <div className="font-bold text-slate-900 text-base">{order.customerName}</div>
              <div className="flex items-center gap-2 text-slate-600 mt-1 font-mono text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${order.customerPhone}`} className="hover:text-blue-600 hover:underline">
                  {order.customerPhone}
                </a>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-slate-600 mt-1 text-xs">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-600 hover:underline truncate">
                    {order.customerEmail}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <MapPin className="w-4 h-4 text-blue-600" /> Địa chỉ giao nhận
            </h2>
            <p className="text-slate-800 leading-relaxed text-xs">
              {order.shippingAddress || "Khách nhận tại cửa hàng / chưa có địa chỉ."}
            </p>
          </div>

          {/* Customer Note */}
          {order.note && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-2 text-sm">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <FileText className="w-4 h-4 text-blue-600" /> Ghi chú từ khách
              </h2>
              <p className="text-slate-700 italic text-xs leading-relaxed bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                &ldquo;{order.note}&rdquo;
              </p>
            </div>
          )}

          {/* Payment & Shipping */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-2.5 text-xs text-slate-600">
            <h2 className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Truck className="w-4 h-4 text-blue-600" /> Hình thức thanh toán
            </h2>
            <div className="flex justify-between">
              <span>Phương thức:</span>
              <strong className="text-slate-900">{order.paymentMethod || "COD"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Trạng thái:</span>
              <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Thu tiền khi nhận máy
              </span>
            </div>
          </div>

          {/* Order Event Timeline Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3.5 text-xs">
            <h2 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <History className="w-4 h-4 text-blue-600" /> Lịch sử thao tác ({order.events?.length || 0})
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {order.events?.map((ev) => (
                <div key={ev.id} className="relative pl-5 border-l-2 border-slate-200 space-y-1">
                  <span className="absolute -left-1.5 top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{ev.actor}</span>
                    <span>{new Date(ev.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {ev.action === "CREATED" && "Tiếp nhận đơn hàng mới"}
                    {ev.action === "STATUS_CHANGE" && `Chuyển trạng thái: ${ev.fromStatus} → ${ev.toStatus}`}
                    {ev.action === "CANCELLED" && `Hủy đơn: ${ev.reason}`}
                    {ev.action === "REOPENED" && `Mở lại đơn: ${ev.reason}`}
                    {ev.action === "NOTE_ADDED" && "Thêm ghi chú nội bộ"}
                  </div>
                  {ev.reason && ev.action !== "CANCELLED" && ev.action !== "REOPENED" && (
                    <p className="text-[11px] text-slate-600 italic">Lý do: {ev.reason}</p>
                  )}
                  {ev.note && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                      {ev.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Reason Modal for Cancel / Reopen */}
      {reasonModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">{reasonModal.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Vui lòng nhập lý do bắt buộc để ghi nhận vào lịch sử kiểm toán của đơn hàng.
            </p>

            <textarea
              id="reason-modal-input"
              rows={3}
              value={reasonModal.reasonText}
              onChange={(e) => setReasonModal((m) => ({ ...m, reasonText: e.target.value }))}
              placeholder="Nhập lý do cụ thể (tối thiểu 3 ký tự)..."
              className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setReasonModal((m) => ({ ...m, open: false }))}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-reason-submit"
                disabled={reasonModal.reasonText.trim().length < 3 || transitioning}
                onClick={() =>
                  void handleExecuteTransition(reasonModal.targetStatus, reasonModal.reasonText)
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {transitioning ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
