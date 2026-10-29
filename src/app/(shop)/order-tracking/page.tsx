import { Suspense } from 'react';
import Link from 'next/link';
import OrderTrackingPortal from '@/components/order/OrderTrackingPortal';

export const metadata = {
  title: 'Hỗ trợ tra cứu đơn hàng & Hồ sơ kiểm định | CitiLap',
  robots: { index: false, follow: true },
};

export default function OrderTrackingPage() {
  return (
    <div className="min-h-[75vh] bg-slate-50 py-8 sm:py-10">
      <div className="container mx-auto max-w-[1370px] px-4 space-y-5">
        <div>
          <nav aria-label="Đường dẫn" className="text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-blue-600">
              Trang chủ
            </Link>{' '}
            / <span className="text-slate-700 font-medium">Tra cứu Đơn hàng & Kiểm định</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cổng Tra cứu Đơn hàng & Hồ sơ Kiểm định
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kiểm tra chứng thư test máy công khai theo Mã công khai (Public Code) hoặc theo dõi tiến độ xử lý đơn hàng bằng liên kết xác nhận.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              Đang tải cổng tra cứu...
            </div>
          }
        >
          <OrderTrackingPortal />
        </Suspense>
      </div>
    </div>
  );
}
