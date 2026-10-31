import type { Metadata } from 'next';
import ComparePageClient from '@/components/product/ComparePageClient';

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>;
}

export const metadata: Metadata = {
  title: 'So sánh laptop & thiết bị công nghệ chính hãng | CitiLap',
  description: 'Bảng đối chiếu chi tiết thông số kỹ thuật, cấu hình, màn hình, hiệu năng và mức giá giữa các dòng laptop tại CitiLap.',
  alternates: {
    canonical: 'https://citilap.vn/so-sanh',
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: 'So sánh laptop & cấu hình chi tiết | CitiLap',
    description: 'Đối chiếu thông số kỹ thuật, màn hình và giá bán giữa các mẫu máy tại CitiLap.',
    url: 'https://citilap.vn/so-sanh',
    images: ['/brand/marketing-banner.webp'],
  },
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const sp = await searchParams;
  const idsParam = typeof sp.ids === 'string' ? sp.ids.trim() : '';
  const initialIds = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return <ComparePageClient key={idsParam} initialIds={initialIds} />;
}

