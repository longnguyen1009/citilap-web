"use client";

import Link from "next/link";
import { use, useEffect, useState, useCallback, useRef } from "react";
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
  const reasonDialogRef = useRef<HTMLDialogElement | null>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!reasonModal.open) return;
    const dialog = reasonDialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    reasonInputRef.current?.focus();
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
      opener?.focus();
    };
  }, [reasonModal.open]);

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
        setFeedback({ type: "success", text: "Đã thêm ghi chú nội bộ." });
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
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="font-medium text-xs">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-slate-600 mb-3 text-sm">Không tìm thấy đơn hàng.</p>
        <Link
          href="/admin/orders"
          className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const currentStatus = order.status;

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-4">
      {/* Compact 1-Line Header */}
      <div className="admin-page-header flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/orders"
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition"
            title="Quay lại danh sách đơn hàng"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-bold text-slate-900 tracking-tight font-mono">
            #{order.orderNumber || order.id}
          </h1>
          <StatusBadge status={order.status} />
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            #v{order.revision}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1 tabular-nums">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </span>
          {order.completedAt && (
            <span className="text-xs text-emerald-700 font-medium tabular-nums">
              • Xong: {new Date(order.completedAt).toLocaleString("vi-VN")}
            </span>
          )}
        </div>

        {/* Transition Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(currentStatus === "NEW" || currentStatus === "PENDING") && (
            <>
              <button
                type="button"
                id="btn-transition-contacted"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONTACTED")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Đã liên hệ</span>
              </button>

              <button
                type="button"
                id="btn-transition-confirmed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-1.5 px-2.5 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

          {currentStatus === "CONTACTED" && (
            <>
              <button
                type="button"
                id="btn-transition-confirmed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-1.5 px-2.5 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

          {currentStatus === "CONFIRMED" && (
            <>
              <button
                type="button"
                id="btn-transition-completed"
                disabled={transitioning}
                onClick={() => void handleExecuteTransition("COMPLETED")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold py-1.5 px-2.5 rounded-lg text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            </>
          )}

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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mở lại đơn</span>
            </button>
          )}

          {currentStatus === "COMPLETED" && (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Hoàn tất xử lý yêu cầu
            </span>
          )}
        </div>
      </div>

      {/* 409 Conflict Banner */}
      {conflictError && (
        <div
          id="concurrency-conflict-banner"
          className="p-3.5 bg-amber-50 border border-amber-400 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Xung đột phiên làm việc (409 Conflict)</p>
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

      {feedback && (
        <InlineAlert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.text}
        </InlineAlert>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Items + Internal Notes (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Items Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Sản phẩm ({order.items.length})
              </h2>
              <span className="text-xs text-slate-500 tabular-nums">
                Tổng SL: <strong>{order.items.reduce((s, i) => s + i.quantity, 0)}</strong>
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const image = getFirstImage(item.product?.images);
                const itemName = item.productNameSnapshot || item.productName || item.product?.name || "Sản phẩm";
                const itemSku = item.skuSnapshot || item.sku;
                const unitPrice = item.priceSnapshot || item.price;
                const lineTotal = item.lineTotal || unitPrice * item.quantity;

                return (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3 text-xs">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 relative flex items-center justify-center">
                      {image ? (
                        <Image src={image} alt="" fill sizes="48px" className="object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400">SP</span>
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="truncate">{itemName}</span>
                        {item.product && (
                          <Link
                            href={`/laptop/${item.product.slug}`}
                            target="_blank"
                            className="text-slate-400 hover:text-blue-600 transition shrink-0"
                            title="Xem trên web"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {itemSku && <span className="text-blue-700 font-mono">SKU: {itemSku}</span>}
                        {item.variantNameSnapshot && <span>• {item.variantNameSnapshot}</span>}
                        <span className="tabular-nums">
                          • {unitPrice.toLocaleString("vi-VN")}đ × <strong>{item.quantity}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <div className="font-bold text-red-600 text-sm">
                        {lineTotal.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200">
              <div className="flex flex-col gap-1.5 max-w-xs ml-auto text-xs tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính:</span>
                  <span className="font-bold text-slate-900">{order.subtotalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí giao hàng:</span>
                  <span className="font-medium text-slate-900">
                    {order.shippingFee === 0 ? "Xác nhận với khách" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 uppercase text-xs">Tổng cộng:</span>
                  <span className="text-base font-black text-red-600">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Staff Notes Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden p-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Ghi chú nội bộ ({order.internalNotes?.length || 0})
            </h2>

            <form onSubmit={handleAddInternalNote} className="space-y-2">
              <textarea
                id="internal-note-input"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Thêm ghi chú vận hành nội bộ..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50/50"
              />
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 tabular-nums">{newNoteContent.length}/2000</span>
                <button
                  type="submit"
                  id="btn-add-internal-note"
                  disabled={!newNoteContent.trim() || addingNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{addingNote ? "Đang lưu..." : "Lưu ghi chú"}</span>
                </button>
              </div>
            </form>

            {!order.internalNotes || order.internalNotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic pt-1">Chưa có ghi chú nội bộ nào.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {order.internalNotes.map((n) => (
                  <div key={n.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">{n.actor}</span>
                      <span className="tabular-nums">{new Date(n.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Unified Customer & Delivery + Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Unified Customer + Delivery + Payment Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-4 space-y-3.5 text-xs">
            <h2 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-blue-600" /> Khách hàng & Giao nhận
            </h2>

            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
              <div className="flex flex-wrap items-center gap-3 text-slate-600 font-mono">
                <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline">
                  <Phone className="w-3 h-3" />
                  {order.customerPhone}
                </a>
                {order.customerEmail && (
                  <a href={`mailto:${order.customerEmail}`} className="inline-flex items-center gap-1 hover:text-blue-600 hover:underline truncate">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {order.customerEmail}
                  </a>
                )}
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Địa chỉ giao hàng
              </div>
              <p className="text-slate-800 leading-relaxed">
                {order.shippingAddress || "Nhận tại cửa hàng / chưa có địa chỉ."}
              </p>
            </div>

            {order.note && (
              <div className="pt-2.5 border-t border-slate-100 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Lời nhắn từ khách</div>
                <p className="text-slate-700 italic bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                  &ldquo;{order.note}&rdquo;
                </p>
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-500">
                  <Truck className="w-3 h-3" /> Thanh toán:
                </span>
                <strong className="text-slate-900">{order.paymentMethod || "COD"}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Thu hộ:</span>
                <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                  Thu tiền khi nhận máy
                </span>
              </div>
            </div>
          </div>

          {/* Order Event Timeline Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-4 space-y-3 text-xs">
            <h2 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <History className="w-3.5 h-3.5 text-blue-600" /> Lịch sử thao tác ({order.events?.length || 0})
            </h2>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {order.events?.map((ev) => (
                <div key={ev.id} className="relative pl-4 border-l-2 border-slate-200 space-y-0.5">
                  <span className="absolute -left-1.5 top-1 w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{ev.actor}</span>
                    <span className="tabular-nums">{new Date(ev.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {ev.action === "CREATED" && "Tiếp nhận đơn hàng mới"}
                    {ev.action === "STATUS_CHANGE" && `${ev.fromStatus} → ${ev.toStatus}`}
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
        <dialog
          ref={reasonDialogRef}
          id="order-reason-dialog"
          aria-modal="true"
          aria-labelledby="reason-modal-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!transitioning) {
              setReasonModal((m) => ({ ...m, open: false }));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (!transitioning) {
                setReasonModal((m) => ({ ...m, open: false }));
              }
              return;
            }
            if (e.key === "Tab" && reasonDialogRef.current) {
              const focusables = Array.from(
                reasonDialogRef.current.querySelectorAll<HTMLElement>(
                  "textarea:not(:disabled), button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])"
                )
              );
              if (focusables.length === 0) return;
              const first = focusables[0];
              const last = focusables[focusables.length - 1];
              const active = document.activeElement as HTMLElement | null;
              if (e.shiftKey) {
                if (!active || active === first || !reasonDialogRef.current.contains(active)) {
                  e.preventDefault();
                  last.focus();
                }
              } else {
                if (!active || active === last || !reasonDialogRef.current.contains(active)) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !transitioning) {
              setReasonModal((m) => ({ ...m, open: false }));
            }
          }}
          className="fixed inset-0 z-50 m-auto max-w-md w-[calc(100%-2rem)] rounded-xl bg-white p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
        >
          <div className="p-5 space-y-3.5">
            <h3 id="reason-modal-title" className="text-sm font-bold text-slate-900">
              {reasonModal.title}
            </h3>
            <div className="space-y-1.5">
              <label
                htmlFor="reason-modal-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Lý do thao tác (bắt buộc)
              </label>
              <textarea
                ref={reasonInputRef}
                id="reason-modal-input"
                rows={3}
                value={reasonModal.reasonText}
                onChange={(e) => setReasonModal((m) => ({ ...m, reasonText: e.target.value }))}
                placeholder="Nhập lý do cụ thể (tối thiểu 3 ký tự)..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                id="btn-cancel-reason-modal"
                disabled={transitioning}
                onClick={() => setReasonModal((m) => ({ ...m, open: false }))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
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
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {transitioning ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
