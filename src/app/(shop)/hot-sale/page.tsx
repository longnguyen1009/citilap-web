import type { Metadata } from 'next';
import Link from 'next/link';
import FlashSaleSection from '@/components/home/FlashSaleSection';

export const metadata: Metadata = {
  title: 'HOT SALE — Các chiến dịch ưu đãi | CitiLap',
  description: 'FLASH SALE, ưu đãi tựu trường và các chiến dịch HOT SALE tại CitiLap. Xem lịch chạy và giá từng cấu hình.',
};

export default function HotSalePage() {
  return <div className="min-h-screen bg-slate-50 pb-12">
    <div className="container mx-auto max-w-[1370px] px-4 py-5">
      <nav aria-label="Đường dẫn" className="mb-4 text-sm text-slate-500"><Link href="/">Trang chủ</Link> / HOT SALE</nav>
      <h1 className="text-2xl font-black text-red-700">HOT SALE</h1>
      <p className="mt-1 text-sm text-slate-600">Các chiến dịch đang chạy và sắp bắt đầu. Giá ưu đãi áp dụng trong thời gian từng chiến dịch.</p>
    </div>
    <FlashSaleSection showEmpty />
    <p className="px-4 text-center text-sm text-slate-500">Theo dõi CitiLap để cập nhật ưu đãi mới. <Link href="/search" className="font-semibold text-red-700 underline">Khám phá sản phẩm</Link></p>
  </div>;
}
