"use client";

import Link from "next/link";
import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "CTL123456";

  return (
    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm text-center max-w-2xl w-full border-t-4 border-green-500">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12" />
      </div>
      
      <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">Đặt hàng thành công!</h1>
      <p className="text-gray-600 mb-6 text-lg">Cảm ơn bạn đã mua sắm tại CitiLap. Chúng tôi sẽ sớm liên hệ để xác nhận đơn hàng.</p>
      
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-left inline-block w-full max-w-md mx-auto">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
          <span className="text-gray-600">Mã đơn hàng:</span>
          <span className="font-bold text-gray-900 text-lg">{orderId}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
          <span className="text-gray-600">Thời gian đặt:</span>
          <span className="font-bold text-gray-900">{new Date().toLocaleDateString("vi-VN")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Phương thức:</span>
          <span className="font-bold text-gray-900">Thanh toán khi nhận hàng</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link href="/order-tracking" className="w-full sm:w-auto bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-6 rounded-lg transition inline-flex items-center justify-center gap-2">
          <ShoppingBag className="w-5 h-5" /> Theo dõi đơn hàng
        </Link>
        <Link href="/" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
          Tiếp tục mua sắm <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="bg-[#f1f5f9] min-h-[70vh] flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="p-8 text-center">Đang xử lý...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
