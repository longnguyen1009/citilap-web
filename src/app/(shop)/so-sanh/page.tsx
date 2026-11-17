import { businessProfile } from "@/config/business-profile";
import type { Metadata } from 'next';
import ComparePageClient from '@/components/product/ComparePageClient';
import { formatSeoTitle, formatSeoTitleString } from '@/lib/seo-helpers';

interface ComparePageProps {
  searchParams: Promise<{ ids?: string }>;
}

const compareTitle = 'So sánh laptop & thiết bị công nghệ chính hãng';
const compareDesc = 'Bảng đối chiếu chi tiết thông số kỹ thuật, cấu hình, màn hình, hiệu năng và mức giá giữa các dòng laptop tại CitiLap.';

export const metadata: Metadata = {
  title: formatSeoTitle(compareTitle),
  description: compareDesc,
  alternates: {
    canonical: `${businessProfile.canonicalSiteUrl}/so-sanh`,
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: formatSeoTitleString(compareTitle),
    description: compareDesc,
    url: `${businessProfile.canonicalSiteUrl}/so-sanh`,
    type: 'website',
    siteName: businessProfile.brandName,
    locale: 'vi_VN',
    images: [{ url: `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`, alt: compareTitle }],
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

