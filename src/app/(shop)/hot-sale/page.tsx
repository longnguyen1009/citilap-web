import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, ArrowRight } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import FlashSaleSection from '@/components/home/FlashSaleSection';
import { getStorefrontSettings } from '@/server/services/storefront-cms.service';
import { businessProfile } from '@/config/business-profile';
import { formatSeoTitle, formatSeoTitleString, generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo-helpers';

const hotSaleTitle = 'HOT SALE — Săn Deal Laptop & Phụ Kiện Ưu Đãi';
const hotSaleDesc = 'FLASH SALE, ưu đãi tựu trường và các chiến dịch giảm giá trực tiếp tại CitiLap. Xem lịch chạy và giá từng cấu hình laptop gaming, văn phòng chính hãng.';

export const metadata: Metadata = {
  title: formatSeoTitle(hotSaleTitle),
  description: hotSaleDesc,
  alternates: {
    canonical: `${businessProfile.canonicalSiteUrl}/hot-sale`,
  },
  openGraph: {
    title: formatSeoTitleString(hotSaleTitle),
    description: hotSaleDesc,
    url: `${businessProfile.canonicalSiteUrl}/hot-sale`,
    type: 'website',
    siteName: businessProfile.brandName,
    locale: 'vi_VN',
    images: [{ url: `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`, alt: hotSaleTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: formatSeoTitleString(hotSaleTitle),
    description: hotSaleDesc,
    images: [`${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`],
  },
};

export default async function HotSalePage() {
  const settings = await getStorefrontSettings();
  const jsonLd = generateBreadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: 'HOT SALE', href: '/hot-sale' },
  ]);
  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: '/' },
          { label: 'HOT SALE', href: '/hot-sale' },
        ]}
      />
      <div className="container mx-auto max-w-[1370px] px-4 pt-6 pb-2">
        <div className="rounded-3xl bg-gradient-to-r from-red-700 via-rose-600 to-orange-600 p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Chiến dịch ưu đãi chính hãng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">HOT SALE TẠI CITILAP</h1>
            <p className="text-xs sm:text-sm text-rose-100 max-w-2xl">
              Tổng hợp các chiến dịch giảm giá trực tiếp đang chạy và sắp bắt đầu. Giá ưu đãi tự động áp dụng cho từng cấu hình trong khung giờ chiến dịch.
            </p>
          </div>
          <Link
            href="/chon-laptop"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-red-700 font-bold text-xs sm:text-sm shadow-xs hover:bg-rose-50 transition shrink-0"
          >
            <span>Tư vấn chọn máy</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      <FlashSaleSection settings={settings} showEmpty />
      <p className="px-4 text-center text-sm text-slate-500 mt-4">
        Theo dõi CitiLap để cập nhật ưu đãi mới.{' '}
        <Link href="/search" className="font-semibold text-red-700 underline hover:text-red-800">
          Khám phá toàn bộ sản phẩm
        </Link>
      </p>
    </div>
  );
}
