import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mediaEnvironment } from '@/server/media-http';
import { publicPageBySlug } from '@/server/services/page.service';
import { MediaError } from '@/server/services/media-library.service';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { businessProfile } from '@/config/business-profile';
import {
  cleanSeoDescription,
  extractFaqsFromHtml,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
  serializeJsonLd,
} from '@/lib/seo-helpers';
import PolicyLayout from './PolicyLayout';

const POLICY_DESCRIPTION_FALLBACKS: Record<string, string> = {
  'chinh-sach-bao-mat':
    'Chính sách bảo vệ dữ liệu cá nhân tại CitiLap: thông tin thu thập, mục đích xử lý, phạm vi chia sẻ, thời gian lưu trữ và quyền của khách hàng.',
  'dieu-khoan-mua-hang':
    'Điều khoản mua hàng và thanh toán tại CitiLap: xác nhận cấu hình, giá niêm yết, thanh toán COD/chuyển khoản an toàn, hủy đơn và giải quyết khiếu nại.',
  'huong-dan-mua-hang':
    'Hướng dẫn đặt hàng và thanh toán tại CitiLap: cách chọn cấu hình laptop phù hợp, so sánh sản phẩm, gửi yêu cầu đặt hàng và kiểm tra khi nhận máy.',
  'cau-hoi-thuong-gap':
    'Giải đáp các câu hỏi thường gặp tại CitiLap: báo giá cấu hình, đặt lịch xem máy tại Hà Nội & Bắc Ninh, giao hàng toàn quốc, bảo hành 3–12 tháng và đổi lỗi 7 ngày.',
};

async function load(slug: string) {
  const { DB } = await mediaEnvironment();
  try { return await publicPageBySlug(DB, slug); }
  catch (error) {
    if (error instanceof MediaError && error.status === 404) notFound();
    throw error;
  }
}

export async function cmsPolicyMetadata(slug: string): Promise<Metadata> {
  const page = await load(slug);
  const rawTitle = page.seo.title || page.title;
  const titleString = formatSeoTitleString(rawTitle);
  const fallbackDesc =
    POLICY_DESCRIPTION_FALLBACKS[slug] ||
    `${page.title} — Quy định chính thức và hướng dẫn hỗ trợ khách hàng tại ${businessProfile.brandName}.`;
  const description = cleanSeoDescription(page.seo.description, fallbackDesc, {
    rejectPolicyBoilerplate: true,
  });
  const canonicalUrl = `${businessProfile.canonicalSiteUrl}/${slug}`;
  const ogImage = page.seo.ogImageUrl || `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

  return {
    title: formatSeoTitle(rawTitle),
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: titleString,
      description,
      url: canonicalUrl,
      type: 'article',
      siteName: businessProfile.brandName,
      locale: 'vi_VN',
      publishedTime: page.publishedAt,
      modifiedTime: page.updatedAt,
      images: [{ url: ogImage, alt: page.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleString,
      description,
      images: [ogImage],
    },
  };
}

export default async function CmsPolicyPage({ slug }: { slug: string }) {
  const page = await load(slug);
  const fallbackDesc =
    POLICY_DESCRIPTION_FALLBACKS[slug] ||
    `${page.title} tại ${businessProfile.brandName}.`;
  const subtitle = cleanSeoDescription(page.seo.description, fallbackDesc, {
    rejectPolicyBoilerplate: true,
  });

  const faqs = extractFaqsFromHtml(page.contentHtml, slug === 'cau-hoi-thuong-gap');
  const faqJsonLd = faqs.length > 0 ? generateFaqJsonLd(faqs) : null;
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: page.title, href: `/${slug}` },
  ]);

  return (
    <PolicyLayout
      currentSlug={slug}
      title={page.title}
      subtitle={subtitle}
      isPublished
      lastUpdated={new Date(page.updatedAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqJsonLd ? [breadcrumbJsonLd, faqJsonLd] : breadcrumbJsonLd),
        }}
      />
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }} />
    </PolicyLayout>
  );
}
