import type { Metadata } from 'next';
import { advisorSchema } from '@/contracts/catalog/advisor';
import { adviseLaptops } from '@/server/services/advisor.service';
import { getStorefrontSettings } from '@/server/services/storefront-cms.service';
import LaptopAdvisorClient from '@/components/advisor/LaptopAdvisorClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasCustomFilters = Object.keys(sp).some(k => ['budget', 'need', 'condition', 'portable'].includes(k));

  return {
    title: 'Chọn laptop theo nhu cầu & ngân sách | CitiLap',
    description: 'Công cụ cố vấn cấu hình thông minh của CitiLap giúp bạn tìm kiếm chiếc laptop tối ưu nhất cho học tập, văn phòng, gaming và đồ họa.',
    alternates: { canonical: 'https://citilap.vn/chon-laptop' },
    robots: {
      index: !hasCustomFilters,
      follow: true,
    },
    openGraph: {
      title: 'Chọn laptop theo nhu cầu & ngân sách | CitiLap',
      description: 'Công cụ cố vấn cấu hình thông minh của CitiLap giúp bạn tìm kiếm chiếc laptop tối ưu nhất cho học tập, văn phòng, gaming và đồ họa.',
      url: 'https://citilap.vn/chon-laptop',
      images: ['/brand/marketing-banner.webp'],
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

  return (
    <LaptopAdvisorClient
      initialInput={input}
      initialResults={results}
      initialError={error}
      zaloUrl={settings?.zaloUrl}
    />
  );
}
