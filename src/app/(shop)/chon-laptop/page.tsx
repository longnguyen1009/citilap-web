import { businessProfile } from "@/config/business-profile";
import type { Metadata } from 'next';
import { advisorSchema } from '@/contracts/catalog/advisor';
import { adviseLaptops } from '@/server/services/advisor.service';
import { getStorefrontSettings } from '@/server/services/storefront-cms.service';
import LaptopAdvisorClient from '@/components/advisor/LaptopAdvisorClient';
import { formatSeoTitle, formatSeoTitleString, generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo-helpers';

const advisorTitle = 'Chọn laptop theo nhu cầu & ngân sách';
const advisorDesc = 'Công cụ cố vấn cấu hình thông minh của CitiLap giúp bạn tìm kiếm chiếc laptop tối ưu nhất cho học tập, văn phòng, gaming và đồ họa theo đúng ngân sách.';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasCustomFilters = Object.keys(sp).some(k => ['budget', 'need', 'condition', 'portable'].includes(k));
  const ogImage = `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

  return {
    title: formatSeoTitle(advisorTitle),
    description: advisorDesc,
    alternates: { canonical: `${businessProfile.canonicalSiteUrl}/chon-laptop` },
    robots: {
      index: !hasCustomFilters,
      follow: true,
    },
    openGraph: {
      title: formatSeoTitleString(advisorTitle),
      description: advisorDesc,
      url: `${businessProfile.canonicalSiteUrl}/chon-laptop`,
      type: 'website',
      siteName: businessProfile.brandName,
      locale: 'vi_VN',
      images: [{ url: ogImage, alt: advisorTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: formatSeoTitleString(advisorTitle),
      description: advisorDesc,
      images: [ogImage],
    },
  };
}

export default async function LaptopAdvisor({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, settings] = await Promise.all([
    searchParams,
    getStorefrontSettings().catch(() => null),
  ]);
  const parsed = advisorSchema.safeParse(query);
  const input = parsed.success ? parsed.data : advisorSchema.parse({});
  let results: Awaited<ReturnType<typeof adviseLaptops>> = [];
  let error = parsed.success ? '' : 'Thông tin lựa chọn không hợp lệ. Ngân sách từ 5 đến 200 triệu đồng.';
  if (parsed.success) {
    try {
      results = await adviseLaptops(input);
    } catch {
      error = 'Chưa tải được danh sách máy. Vui lòng thử lại hoặc liên hệ tư vấn.';
    }
  }

  const jsonLd = generateBreadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: 'Chọn laptop theo nhu cầu', href: '/chon-laptop' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <LaptopAdvisorClient
        initialInput={input}
        initialResults={results}
        initialError={error}
        zaloUrl={settings?.zaloUrl}
      />
    </>
  );
}
