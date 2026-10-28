"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock, MapPin, Phone, User, Package, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import VietQrPaymentCard from "@/components/checkout/VietQrPaymentCard";

interface OrderDetail {
  paymentMethod: string;
  paymentStatus: string;
  checkoutSnapshot: {
    bankAccountInfo: string | null;
    vietQr?: { bankBin: string; accountNumber: string; accountName: string };
    showroom: {name:string;address:string} | null;
  } | null;
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string | null;
  note: string | null;
  subtotalAmount: number;
  shippingFee: number;
  totalAmount: number;
  items: Array<{
    id: string;
    productName: string;
    sku: string | null;
    price: number;
    quantity: number;
    lineTotal: number;
    image?: string;
  }>;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Mới tiếp nhận (NEW)",
  PENDING: "Mới tiếp nhận (PENDING)",
  CONTACTED: "Đã liên hệ (CONTACTED)",
  CONFIRMED: "Đã xác nhận (CONFIRMED)",
  COMPLETED: "Hoàn tất xử lý (COMPLETED)",
  CANCELLED: "Đã hủy (CANCELLED)",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const token = searchParams.get("token");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId && token));

  useEffect(() => {
    try {
      localStorage.removeItem("citilap-recent-orders");
    } catch {
      // Ignore storage access errors
    }

    if (!orderId || !token) {
      return;
    }

    let isMounted = true;
    fetch(`/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setOrder(data.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load order details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, token]);

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (!order) return <div role="alert" className="rounded border bg-white p-6">Chưa thể xác thực thông tin đơn hàng. Vui lòng kiểm tra đường dẫn xác nhận hoặc tải lại trang.</div>;

  const displayOrderNumber = order?.orderNumber || (orderId ? `CTL-${orderId.slice(-6).toUpperCase()}` : "CTL-ORD");
  const statusKey = (order.status || "NEW").toUpperCase();
  const statusLabel = ORDER_STATUS_LABELS[statusKey] || order.status || "Mới tiếp nhận";

  return (
    <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm max-w-2xl w-full border border-gray-100">
      {/* Icon & Heading */}
      <div className="text-center pb-6 border-b border-gray-100">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
          Đã Tiếp Nhận Đơn Đặt Hàng!
        </h1>
        <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
          Cảm ơn bạn đã lựa chọn CitiLap. Cửa hàng đã ghi nhận yêu cầu và sẽ liên hệ sớm nhất để xác nhận.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5" /> Trạng thái: {statusLabel}
        </div>
      </div>

      {/* Thông tin đơn hàng tóm tắt */}
      <div className="mt-6 space-y-4">
        <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4.5 text-sm space-y-2.5">
          <div className="flex justify-between items-center pb-2.5 border-b border-gray-200 text-xs md:text-sm">
            <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-blue-600 text-base">{displayOrderNumber}</span>
          </div>

          {order && (
            <>
              <div className="flex items-start gap-2 text-xs md:text-sm">
                <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-500">Khách hàng:</span>
                <span className="font-bold text-gray-800 ml-auto">{order.customerName}</span>
              </div>

              <div className="flex items-start gap-2 text-xs md:text-sm">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-500">Số điện thoại:</span>
                <span className="font-bold text-gray-800 ml-auto">{order.customerPhone}</span>
              </div>

              {order.shippingAddress && (
                <div className="flex items-start gap-2 text-xs md:text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-500 shrink-0">Địa chỉ:</span>
                  <span className="text-gray-800 font-medium text-right ml-auto">{order.shippingAddress}</span>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 text-xs md:text-sm">
            <span className="text-gray-500 font-medium">Hình thức thanh toán:</span>
            <span className="font-bold text-gray-800">{order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận máy (COD)'}</span>
          </div>
        </div>

        {order.paymentMethod === 'BANK_TRANSFER' && order.checkoutSnapshot?.bankAccountInfo && (
          <VietQrPaymentCard
            bankAccountInfo={order.checkoutSnapshot.bankAccountInfo}
            vietQr={order.checkoutSnapshot.vietQr}
            amount={order.totalAmount}
            transferNote={displayOrderNumber}
            paymentStatus={order.paymentStatus}
          />
        )}
        {/* Danh sách sản phẩm nếu có */}
        {order && order.items && order.items.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-600 uppercase mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-gray-500" /> Sản phẩm đã đặt ({order.items.length})
            </h3>
            <div className="divide-y divide-gray-100 text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-grow">
                    <div className="font-bold text-gray-900 text-xs md:text-sm truncate">{item.productName}</div>
                    {item.sku && <div className="text-[11px] text-gray-500 font-mono">SKU: {item.sku}</div>}
                    <div className="text-xs text-gray-500">Số lượng: x{item.quantity}</div>
                  </div>
                  <div className="font-bold text-red-600 text-xs md:text-sm shrink-0">
                    {item.lineTotal.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-700">Tổng thanh toán:</span>
              <span className="font-black text-red-600 text-base">
                {order.totalAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="text-[11px] text-gray-500 italic text-right mt-1">
              Tạm tính: {order.subtotalAmount.toLocaleString('vi-VN')}đ · Phí giao hàng: {order.shippingFee.toLocaleString('vi-VN')}đ
            </div>
          </div>
        )}

        {/* Hộp ghi chú bước tiếp theo */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs md:text-sm text-amber-900 space-y-1">
          <div className="font-bold text-amber-950">Bước tiếp theo:</div>
          <p className="leading-relaxed">
            Nhân viên kinh doanh của CitiLap sẽ gọi điện đến số điện thoại của quý khách để kiểm tra cấu hình, quà tặng kèm
            và thỏa thuận phương thức vận chuyển thuận tiện nhất.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        {orderId && token && (
          <Link
            href={`/order-tracking?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold py-3 px-6 rounded-xl transition inline-flex items-center justify-center gap-2 shadow-2xs text-sm"
          >
            <Package className="w-4 h-4 text-blue-600" /> Theo dõi tiến độ đơn hàng
          </Link>
        )}
        <Link
          href="/"
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition inline-flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          Tiếp tục mua sắm <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="bg-[#f8fafc] min-h-[75vh] flex flex-col items-center justify-center p-4 py-12">
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Đang chuẩn bị trang xác nhận...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
