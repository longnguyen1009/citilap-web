"use client";
import { businessProfile } from "@/config/business-profile";

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
  Printer,
  CreditCard,
  X,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { StatusBadge, InlineAlert, useToast } from "@/components/admin/ui";

type AvailableSerial = {
  id: string;
  productId: string;
  variantId?: string | null;
  serialNumber: string;
  status: string;
  condition: string;
  warrantyMonths: number;
  warehouseName: string | null;
  publicCode: string | null;
};

type OrderItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  serialUnitId?: string | null;
  serialUnit?: {
    id: string;
    productId?: string;
    variantId?: string | null;
    serialNumber: string;
    status: string;
    condition: string;
    warrantyMonths: number;
    warehouse?: { id: string; name: string; code: string } | null;
  } | null;
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
    kind?: string | null;
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
  availableSerials?: AvailableSerial[];
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
  const toast = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingBilling, setUpdatingBilling] = useState(false);
  const [shippingFeeDraft, setShippingFeeDraft] = useState<string>("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const isMutating = transitioning || updatingBilling || addingNote;

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
          text: result?.error?.message || result?.error || "Không thể tải thông tin đơn hàng.",
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
            text: result?.error?.message || result?.error || "Không thể tải thông tin đơn hàng.",
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
    if (!order || isMutating) return;
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
        const msg =
          result?.error?.message ||
          "Đơn hàng vừa được chỉnh sửa bởi phiên làm việc khác. Bản nháp của bạn đã được bảo toàn.";
        setConflictError(msg);
        toast.error(msg);
        return;
      }

      if (response.ok && result.success) {
        setOrder(result.data);
        const msg = `Đã cập nhật trạng thái đơn hàng sang "${targetStatus}".`;
        setFeedback({
          type: "success",
          text: msg,
        });
        toast.success(msg);
        if (reasonModal.open) {
          setReasonModal((m) => ({ ...m, open: false, reasonText: "" }));
        }
      } else {
        const errMsg = result?.error?.message || result?.error || "Không thể chuyển trạng thái đơn hàng.";
        setFeedback({
          type: "error",
          text: errMsg,
        });
        toast.error(errMsg);
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi cập nhật đơn hàng." });
      toast.error("Lỗi kết nối khi cập nhật đơn hàng.");
    } finally {
      setTransitioning(false);
    }
  };

  const handleUpdateBilling = async (payload: { paymentStatus?: string; shippingFee?: number }) => {
    if (!order || isMutating) return;
    setUpdatingBilling(true);
    setFeedback(null);
    setConflictError(null);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_BILLING",
          expectedRevision: order.revision,
          ...payload,
        }),
      });
      const result = await response.json();
      if (response.status === 409) {
        const msg =
          result?.error?.message ||
          "Đơn hàng vừa được chỉnh sửa bởi phiên làm việc khác. Nội dung bạn đang sửa đã được bảo toàn.";
        setConflictError(msg);
        toast.error(msg);
        return;
      }
      if (response.ok && result.success && result.data) {
        setOrder(result.data);
        setEditingShipping(false);
        setFeedback({
          type: "success",
          text: "Đã cập nhật thông tin thanh toán / phí vận chuyển.",
        });
        toast.success("Đã cập nhật thông tin thanh toán / phí vận chuyển.");
      } else {
        const errMsg =
          result?.error?.message || result?.error || "Không thể cập nhật thông tin thanh toán.";
        setFeedback({
          type: "error",
          text: errMsg,
        });
        toast.error(errMsg);
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi cập nhật thanh toán." });
      toast.error("Lỗi kết nối khi cập nhật thanh toán.");
    } finally {
      setUpdatingBilling(false);
    }
  };

  const handleAssignSerial = async (orderItemId: string, serialUnitId: string) => {
    if (!order || isMutating) return;
    setUpdatingBilling(true);
    setFeedback(null);
    setConflictError(null);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_SERIAL",
          expectedRevision: order.revision,
          orderItemId,
          serialUnitId: serialUnitId || null,
        }),
      });
      const result = await response.json();
      if (response.status === 409) {
        const msg =
          result?.error?.message ||
          "Đơn hàng hoặc Serial vừa được chỉnh sửa bởi phiên làm việc khác. Dữ liệu đang sửa được bảo toàn.";
        setConflictError(msg);
        toast.error(msg);
        return;
      }
      if (response.ok && result.success && result.data) {
        setOrder(result.data);
        const msg = serialUnitId
          ? "Đã gán Serial máy & Hồ sơ kiểm định vào đơn hàng."
          : "Đã gỡ gán Serial máy khỏi dòng sản phẩm.";
        setFeedback({
          type: "success",
          text: msg,
        });
        toast.success(msg);
      } else {
        const errMsg =
          result?.error?.message || result?.error || "Không thể gán Serial cho sản phẩm.";
        setFeedback({
          type: "error",
          text: errMsg,
        });
        toast.error(errMsg);
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi gán Serial." });
      toast.error("Lỗi kết nối khi gán Serial.");
    } finally {
      setUpdatingBilling(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || isMutating) return;

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
        toast.success("Đã thêm ghi chú nội bộ.");
        void loadOrder();
      } else {
        const errMsg =
          result?.error?.message || result?.error || "Không thể thêm ghi chú nội bộ.";
        setFeedback({
          type: "error",
          text: errMsg,
        });
        toast.error(errMsg);
      }
    } catch {
      setFeedback({ type: "error", text: "Lỗi kết nối khi gửi ghi chú." });
      toast.error("Lỗi kết nối khi gửi ghi chú.");
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
        <div className="flex items-center gap-1.5 flex-wrap print:hidden">
          <button
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-1.5 px-2.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Xem trước & In hóa đơn / Phiếu giao hàng"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>In hóa đơn / Phiếu giao hàng</span>
          </button>
          {(currentStatus === "NEW" || currentStatus === "PENDING") && (
            <>
              <button
                type="button"
                id="btn-transition-contacted"
                disabled={isMutating}
                onClick={() => void handleExecuteTransition("CONTACTED")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Đã liên hệ</span>
              </button>

              <button
                type="button"
                id="btn-transition-confirmed"
                disabled={isMutating}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận đơn</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={isMutating}
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
                disabled={isMutating}
                onClick={() => void handleExecuteTransition("CONFIRMED")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận đơn</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={isMutating}
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
                disabled={isMutating}
                onClick={() => void handleExecuteTransition("COMPLETED")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-2xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hoàn tất xử lý yêu cầu</span>
              </button>

              <button
                type="button"
                id="btn-transition-cancel"
                disabled={isMutating}
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
              disabled={isMutating}
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

      {/* Visual Order Lifecycle Pipeline Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs print:hidden">
        {currentStatus === "CANCELLED" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>CANCELLED · Đã hủy:</strong> Đơn hàng đã bị hủy. Vui lòng xem lý do trong lịch sử bên dưới hoặc mở lại đơn nếu khách đổi ý.
              </span>
            </div>
            <button
              type="button"
              disabled={isMutating}
              onClick={() =>
                setReasonModal({
                  open: true,
                  targetStatus: "NEW",
                  title: "Mở lại đơn hàng đã hủy",
                  reasonText: "",
                })
              }
              className="inline-flex items-center gap-1 rounded-md bg-white border border-rose-300 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Chuyển về Mới (NEW)</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-xs">
            {([
              { id: "NEW", stepNum: "1", code: "NEW", title: "Mới (Tiếp nhận)", desc: "Khách vừa gửi yêu cầu", nextActionLabel: "Chuyển sang Đã liên hệ" },
              { id: "CONTACTED", stepNum: "2", code: "CONTACTED", title: "Đã liên hệ", desc: "Tư vấn & chốt cấu hình", nextActionLabel: "Chuyển sang Đã xác nhận" },
              { id: "CONFIRMED", stepNum: "3", code: "CONFIRMED", title: "Đã xác nhận", desc: "Gán máy QC & đóng gói", nextActionLabel: "Chuyển sang Hoàn tất" },
              { id: "COMPLETED", stepNum: "4", code: "COMPLETED", title: "Hoàn tất", desc: "Bàn giao & kích hoạt BH", nextActionLabel: "" },
            ] as const).map((step, idx) => {
              const stepRanks: Record<string, number> = {
                NEW: 0,
                PENDING: 0,
                CONTACTED: 1,
                CONFIRMED: 2,
                COMPLETED: 3,
              };
              const activeRank = stepRanks[currentStatus] ?? 0;
              const isPast = idx < activeRank;
              const isCurrent = idx === activeRank;
              const isNextStep = idx === activeRank + 1;

              return (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                    isCurrent
                      ? "bg-blue-50/70 border-blue-400 text-blue-900 shadow-2xs"
                      : isPast
                      ? "bg-slate-50 border-emerald-300 text-slate-800"
                      : "bg-slate-50/50 border-slate-200 text-slate-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold ${
                          isCurrent
                            ? "bg-blue-600 text-white"
                            : isPast
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isPast ? "✓" : step.stepNum}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isCurrent ? "text-blue-700" : isPast ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {isCurrent ? "Đang xử lý" : isPast ? "Đã xong" : step.code}
                      </span>
                    </div>
                    <div className={`font-bold truncate ${isCurrent ? "text-blue-950 font-black" : "text-slate-900"}`}>
                      {step.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">{step.desc}</div>
                  </div>
                  {isNextStep && (
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => void handleExecuteTransition(step.id)}
                      className="mt-2 inline-flex items-center justify-center gap-1 rounded border border-blue-300 bg-white px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                    >
                      <span>Chuyển bước này</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
                        <Link
                          href={`/admin/products/${item.productId}`}
                          className="truncate hover:text-blue-600 hover:underline"
                          title="Mở sản phẩm trong Admin"
                        >
                          {itemName}
                        </Link>
                        {item.product && (
                          <Link
                            href={
                              item.product.kind === "ACCESSORY"
                                ? `/accessories/${item.product.slug}`
                                : `/laptop/${item.product.slug}`
                            }
                            target="_blank"
                            className="text-slate-400 hover:text-blue-600 transition shrink-0"
                            title="Xem trên Storefront"
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

                      {/* Serial & Public Code Assignment */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                        {(() => {
                          const productSerials = (order.availableSerials || []).filter((su) => {
                            if (su.id === item.serialUnitId) return true;
                            if (su.productId !== item.productId) return false;
                            if (item.variantId) {
                              if (su.variantId !== item.variantId) return false;
                            } else if (su.variantId) {
                              return false;
                            }
                            const assignedToOtherItem = order.items.some(
                              (other) => other.id !== item.id && other.serialUnitId === su.id
                            );
                            return !assignedToOtherItem;
                          });
                          const assignedInfo = productSerials.find(
                            (su) => su.id === item.serialUnitId
                          );
                          const serialLocked =
                            isMutating ||
                            currentStatus === "COMPLETED" ||
                            currentStatus === "CANCELLED";
                          return (
                            <>
                              <label className="text-[11px] font-semibold text-slate-600">
                                Gán máy (Serial / QC):
                              </label>
                              <select
                                aria-label={`Chọn Serial cho ${itemName}`}
                                disabled={serialLocked}
                                value={item.serialUnitId || ""}
                                onChange={(e) => void handleAssignSerial(item.id, e.target.value)}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-800 focus:border-blue-500 focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <option value="">
                                  {productSerials.length > 0
                                    ? `-- Chọn Serial (${productSerials.length} máy sẵn kho) --`
                                    : "-- Chưa chọn Serial (hoặc không quản lý theo Serial) --"}
                                </option>
                                {productSerials.map((su) => (
                                  <option key={su.id} value={su.id}>
                                    SN: {su.serialNumber}
                                    {su.publicCode ? ` · QC: ${su.publicCode}` : ""}
                                    {su.warehouseName ? ` (${su.warehouseName})` : ""}
                                  </option>
                                ))}
                              </select>
                              {productSerials.length === 0 && (
                                <Link
                                  href="/admin/inventory"
                                  target="_blank"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                                  title="Kho hiện không có sẵn máy cho sản phẩm này. Bấm để nhập máy mới."
                                >
                                  + Nhập máy vào kho ↗
                                </Link>
                              )}
                              {assignedInfo?.publicCode && (
                                <Link
                                  href={`/order-tracking?code=${encodeURIComponent(assignedInfo.publicCode)}`}
                                  target="_blank"
                                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold hover:underline"
                                >
                                  Hồ sơ QC: #{assignedInfo.publicCode} ↗
                                </Link>
                              )}
                            </>
                          );
                        })()}
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
          <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden p-4 space-y-3 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Ghi chú nội bộ ({order.internalNotes?.length || 0})
              </h2>
              <div className="flex flex-wrap items-center gap-1">
                {[
                  "Đã gọi xác nhận cấu hình",
                  "Khách hẹn giao giờ hành chính",
                  "Đã kiểm tra QC & đóng gói",
                  "Đã nhận chuyển khoản đủ",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setNewNoteContent((prev) =>
                        prev.trim() ? `${prev.trim()} · ${preset}` : preset
                      )
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[10px] font-medium text-slate-600 transition cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddInternalNote} className="space-y-2">
              <textarea
                id="internal-note-input"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Thêm ghi chú vận hành nội bộ (chỉ quản trị viên nhìn thấy)..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50/50"
              />
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 tabular-nums">{newNoteContent.length}/2000</span>
                <button
                  type="submit"
                  id="btn-add-internal-note"
                  disabled={!newNoteContent.trim() || isMutating}
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
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
                {order.customerPhone && (
                  <Link
                    href={`/admin/customers?search=${encodeURIComponent(order.customerPhone)}`}
                    className="text-[11px] font-semibold text-blue-600 hover:underline print:hidden"
                    title="Xem lịch sử mua hàng & liên hệ của khách này"
                  >
                    Hồ sơ khách ↗
                  </Link>
                )}
              </div>
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

            <div className="pt-2.5 border-t border-slate-100 space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-500">
                  <CreditCard className="w-3 h-3" /> Phương thức:
                </span>
                <strong className="text-slate-900">
                  {order.paymentMethod === "BANK_TRANSFER"
                    ? "Chuyển khoản VietQR"
                    : order.paymentMethod === "COD" || !order.paymentMethod
                    ? "Thanh toán khi nhận hàng (COD)"
                    : order.paymentMethod}
                </strong>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">Trạng thái thu tiền:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded border text-[11px] ${
                      order.paymentStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {order.paymentStatus === "PAID"
                      ? "Đã thanh toán"
                      : order.paymentMethod === "BANK_TRANSFER"
                      ? "Chờ xác nhận CK"
                      : "Thu tiền khi nhận máy"}
                  </span>
                  <button
                    type="button"
                    disabled={
                      isMutating ||
                      currentStatus === "CANCELLED" ||
                      (currentStatus === "COMPLETED" && order.paymentStatus === "PAID")
                    }
                    onClick={() =>
                      void handleUpdateBilling({
                        paymentStatus: order.paymentStatus === "PAID" ? "PENDING" : "PAID",
                      })
                    }
                    className="text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer print:hidden"
                  >
                    {order.paymentStatus === "PAID" ? "Đánh dấu chưa thu" : "Xác nhận đã thu"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center gap-2 pt-1">
                <span className="flex items-center gap-1 text-slate-500">
                  <Truck className="w-3 h-3" /> Phí giao hàng:
                </span>
                {editingShipping ? (
                  <div className="flex items-center gap-1 print:hidden">
                    <input
                      type="number"
                      min={0}
                      max={50000000}
                      step={1000}
                      value={shippingFeeDraft}
                      onChange={(e) => setShippingFeeDraft(e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-mono text-right"
                    />
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => {
                        const trimmed = shippingFeeDraft.trim();
                        const parsed = Number(trimmed);
                        if (
                          !trimmed ||
                          !Number.isSafeInteger(parsed) ||
                          parsed < 0 ||
                          parsed > 50_000_000
                        ) {
                          const msg =
                            "Phí giao hàng phải là số nguyên VNĐ hợp lệ từ 0đ đến 50.000.000đ.";
                          setFeedback({ type: "error", text: msg });
                          toast.error(msg);
                          return;
                        }
                        void handleUpdateBilling({ shippingFee: parsed });
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => setEditingShipping(false)}
                      className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[11px] disabled:opacity-50 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <strong className="text-slate-900">
                      {order.shippingFee === 0 ? "Miễn phí / Xác nhận sau" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}
                    </strong>
                    <button
                      type="button"
                      disabled={
                        isMutating ||
                        currentStatus === "COMPLETED" ||
                        currentStatus === "CANCELLED" ||
                        order.paymentStatus === "PAID" ||
                        order.shippingMethod === "pickup"
                      }
                      onClick={() => {
                        setShippingFeeDraft(String(order.shippingFee || 0));
                        setEditingShipping(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer print:hidden"
                    >
                      Sửa phí
                    </button>
                  </div>
                )}
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
                    {ev.action === "BILLING_UPDATED" && "Cập nhật thanh toán / phí giao hàng"}
                    {ev.action === "SERIAL_ASSIGNED" && "Gán Serial máy vào đơn hàng"}
                    {ev.action === "SERIAL_UNASSIGNED" && "Gỡ Serial máy khỏi đơn hàng"}
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

      {/* Printable Invoice / Delivery Slip Preview Modal */}
      {showInvoiceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs print:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInvoiceModal(false);
          }}
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">
                  Xem trước Hóa đơn / Phiếu giao hàng &amp; Bảo hành
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ngay (Ctrl+P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  aria-label="Đóng xem trước hóa đơn"
                  className="inline-grid place-items-center size-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-900 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div>
                  <div className="text-lg font-black uppercase tracking-wider">
                    CITILAP.VN — HỆ THỐNG LAPTOP TUYỂN CHỌN
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Showroom HN: Số 23/40 Tạ Quang Bửu, Bạch Mai, Hà Nội | Showroom BN: Số 40 Trần Hưng Đạo, TP. Bắc Ninh
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Hotline bảo hành &amp; kỹ thuật: {businessProfile.displayPhone} — Website: {businessProfile.canonicalSiteUrl}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm uppercase">Hóa đơn / Phiếu giao hàng</div>
                  <div className="font-mono font-bold text-blue-700">Mã đơn: #{order.orderNumber || order.id}</div>
                  <div>Ngày lập: {new Date(order.createdAt).toLocaleString("vi-VN")}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div><strong>Khách hàng:</strong> {order.customerName}</div>
                  <div><strong>Điện thoại:</strong> {order.customerPhone}</div>
                  {order.customerEmail && <div><strong>Email:</strong> {order.customerEmail}</div>}
                  <div><strong>Địa chỉ nhận:</strong> {order.shippingAddress || "Nhận tại Showroom CitiLap"}</div>
                </div>
                <div className="space-y-1">
                  <div>
                    <strong>Phương thức thanh toán:</strong>{" "}
                    {order.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản VietQR" : "Thanh toán khi nhận hàng (COD)"}
                  </div>
                  <div>
                    <strong>Trạng thái thanh toán:</strong>{" "}
                    {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Thu tiền khi giao"}
                  </div>
                  <div>
                    <strong>Trạng thái đơn hàng:</strong> {order.status}
                  </div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2.5 py-1.5 text-center w-10">#</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-left">Sản phẩm / Cấu hình</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-left">SKU / Serial / QC</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-right">Đơn giá</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-center">SL</th>
                    <th className="border border-slate-300 px-2.5 py-1.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, index) => {
                    const assignedSu = (order.availableSerials || []).find((s) => s.id === it.serialUnitId);
                    const sn = assignedSu?.serialNumber || it.serialUnit?.serialNumber || "Theo tem BH";
                    const qcCode = assignedSu?.publicCode;
                    const unitPrice = it.priceSnapshot || it.price;
                    const sku = it.skuSnapshot || it.sku;
                    return (
                      <tr key={it.id}>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-center tabular-nums">{index + 1}</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 font-semibold">
                          {it.productNameSnapshot || it.productName || "Sản phẩm"}
                          {it.variantNameSnapshot ? ` (${it.variantNameSnapshot})` : ""}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 font-mono">
                          {sku ? `SKU: ${sku} · ` : ""}SN: {sn}
                          {qcCode ? ` · QC: #${qcCode}` : ""}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                          {unitPrice.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-center tabular-nums">{it.quantity}</td>
                        <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold tabular-nums">
                          {it.lineTotal.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="border border-slate-300 px-2.5 py-1.5 text-right font-semibold">
                      Tạm tính:
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold tabular-nums">
                      {order.subtotalAmount.toLocaleString("vi-VN")}đ
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="border border-slate-300 px-2.5 py-1.5 text-right font-semibold">
                      Phí vận chuyển:
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold tabular-nums">
                      {order.shippingFee === 0 ? "Miễn phí" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="border border-slate-300 px-2.5 py-2 text-right font-black uppercase">
                      Tổng cộng thanh toán:
                    </td>
                    <td className="border border-slate-300 px-2.5 py-2 text-right font-black text-red-600 text-sm tabular-nums">
                      {order.totalAmount.toLocaleString("vi-VN")}đ
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="border-t border-slate-300 pt-3 text-[11px] space-y-1">
                <div className="font-bold uppercase">Cam kết bảo hành &amp; Đổi trả CitiLap:</div>
                <p>• Bảo hành phần cứng theo gói bảo hành ghi nhận trên đơn hàng (3 – 12 tháng), lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi kỹ thuật phần cứng do nhà sản xuất.</p>
                <p>• Hỗ trợ cài đặt phần mềm, vệ sinh tra keo tản nhiệt miễn phí trọn đời máy tại hệ thống showroom CitiLap.</p>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-4 text-center">
                <div>
                  <div className="font-bold">Khách hàng ký nhận</div>
                  <div className="text-[10px] text-slate-500">(Đã kiểm tra ngoại quan &amp; cấu hình máy)</div>
                  <div className="h-14" />
                </div>
                <div>
                  <div className="font-bold">Đại diện CitiLap</div>
                  <div className="text-[10px] text-slate-500">(Ký &amp; ghi rõ họ tên)</div>
                  <div className="h-14" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only Warranty & Delivery Slip */}
      <div className="hidden print:block bg-white p-6 border border-slate-300 rounded-xl text-xs text-slate-900 space-y-4">
        <div className="flex justify-between items-start border-b border-slate-300 pb-3">
          <div>
            <div className="text-lg font-black uppercase tracking-wider">CITILAP.VN — HỆ THỐNG LAPTOP TUYỂN CHỌN</div>
            <div className="text-[11px] text-slate-600">
              Showroom HN: Số 23/40 Tạ Quang Bửu, Bạch Mai, Hà Nội | Showroom BN: Số 40 Trần Hưng Đạo, TP. Bắc Ninh
            </div>
            <div className="text-[11px] text-slate-600">Hotline bảo hành &amp; kỹ thuật: {businessProfile.displayPhone} — Website: {businessProfile.canonicalSiteUrl}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm">PHIẾU GIAO HÀNG &amp; BẢO HÀNH</div>
            <div className="font-mono">Mã đơn: #{order.orderNumber || order.id}</div>
            <div>Ngày lập: {new Date(order.createdAt).toLocaleString("vi-VN")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div><strong>Khách hàng:</strong> {order.customerName}</div>
            <div><strong>Điện thoại:</strong> {order.customerPhone}</div>
            <div><strong>Địa chỉ nhận:</strong> {order.shippingAddress || "Nhận tại Showroom CitiLap"}</div>
          </div>
          <div>
            <div><strong>Phương thức thanh toán:</strong> {order.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản VietQR" : "COD"}</div>
            <div><strong>Trạng thái thanh toán:</strong> {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Thu tiền khi giao"}</div>
            <div><strong>Tổng thanh toán:</strong> <span className="font-bold">{order.totalAmount.toLocaleString("vi-VN")}đ</span></div>
          </div>
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Sản phẩm / Cấu hình</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-left">Serial / Mã Kiểm định (QC)</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-right">Đơn giá</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-center">SL</th>
              <th className="border border-slate-300 px-2.5 py-1.5 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => {
              const assignedSu = (order.availableSerials || []).find((s) => s.id === it.serialUnitId);
              const sn = assignedSu?.serialNumber || it.serialUnit?.serialNumber || "Theo tem bảo hành";
              const qcCode = assignedSu?.publicCode;
              const unitPrice = it.priceSnapshot || it.price;
              return (
                <tr key={it.id}>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-semibold">
                    {it.productNameSnapshot || it.productName || "Sản phẩm"}
                    {it.variantNameSnapshot ? ` (${it.variantNameSnapshot})` : ""}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-mono">
                    SN: {sn}
                    {qcCode ? ` · QC: #${qcCode}` : ""}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                    {unitPrice.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center">{it.quantity}</td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-right font-bold">
                    {it.lineTotal.toLocaleString("vi-VN")}đ
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-slate-300 px-2.5 py-1 text-right font-semibold">Tạm tính:</td>
              <td className="border border-slate-300 px-2.5 py-1 text-right font-bold">{order.subtotalAmount.toLocaleString("vi-VN")}đ</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-slate-300 px-2.5 py-1 text-right font-semibold">Phí giao hàng:</td>
              <td className="border border-slate-300 px-2.5 py-1 text-right font-bold">{order.shippingFee === 0 ? "Miễn phí" : `${order.shippingFee.toLocaleString("vi-VN")}đ`}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-slate-300 px-2.5 py-1.5 text-right font-black uppercase">Tổng thanh toán:</td>
              <td className="border border-slate-300 px-2.5 py-1.5 text-right font-black">{order.totalAmount.toLocaleString("vi-VN")}đ</td>
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-slate-300 pt-3 text-[11px] space-y-1">
          <div className="font-bold uppercase">Cam kết bảo hành &amp; Đổi trả CitiLap:</div>
          <p>• Bảo hành phần cứng theo gói bảo hành ghi nhận trên đơn hàng (3 – 12 tháng), lỗi 1 đổi 1 trong 7 ngày đầu tiên nếu phát sinh lỗi kỹ thuật phần cứng do nhà sản xuất.</p>
          <p>• Hỗ trợ cài đặt phần mềm, vệ sinh tra keo tản nhiệt miễn phí trọn đời máy tại hệ thống showroom CitiLap.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 pt-4 text-center">
          <div>
            <div className="font-bold">Khách hàng ký nhận</div>
            <div className="text-[10px] text-slate-500">(Đã kiểm tra ngoại quan &amp; cấu hình máy)</div>
            <div className="h-16" />
          </div>
          <div>
            <div className="font-bold">Đại diện CitiLap</div>
            <div className="text-[10px] text-slate-500">(Ký &amp; ghi rõ họ tên)</div>
            <div className="h-16" />
          </div>
        </div>
      </div>

      {/* Mandatory Reason Modal for Cancel / Reopen */}
      {reasonModal.open && (
        <dialog
          ref={reasonDialogRef}
          id="order-reason-dialog"
          aria-labelledby="reason-modal-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!isMutating) {
              setReasonModal((m) => ({ ...m, open: false }));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (!isMutating) {
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
            if (e.target === e.currentTarget && !isMutating) {
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
                disabled={isMutating}
                onClick={() => setReasonModal((m) => ({ ...m, open: false }))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-reason-submit"
                disabled={reasonModal.reasonText.trim().length < 3 || isMutating}
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
