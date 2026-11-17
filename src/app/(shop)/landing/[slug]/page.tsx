import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Eye } from 'lucide-react';
import { getPublishedLandingPage, getStorefrontSettings } from '@/server/services/storefront-cms.service';
import BlockRenderer from '@/components/builder/BlockRenderer';
import FlashSaleSection from '@/components/home/FlashSaleSection';
import { businessProfile } from '@/config/business-profile';
import {
  cleanSeoDescription,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo-helpers';

interface LandingPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params, searchParams }: LandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp.preview === 'true';

  try {
    const page = await getPublishedLandingPage(slug);
    if (!page) {
      return {
        title: formatSeoTitle('Trang không tồn tại'),
        robots: { index: false, follow: false },
      };
    }

    const rawTitle = page.seo.title || page.title;
    const titleString = formatSeoTitleString(rawTitle);
    const description = cleanSeoDescription(
      page.seo.description,
      `Khám phá ${page.title} — Chương trình và bộ sưu tập laptop tuyển chọn tại ${businessProfile.brandName}.`
    );
    const canonicalUrl = `${businessProfile.canonicalSiteUrl}/landing/${page.slug}`;
    const rawOg = page.seo.ogImageUrl || businessProfile.bannerAsset;
    const ogImage = /^https?:\/\//i.test(rawOg)
      ? rawOg
      : `${businessProfile.canonicalSiteUrl}${rawOg.startsWith('/') ? '' : '/'}${rawOg}`;

    return {
      title: formatSeoTitle(rawTitle),
      description,
      robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
      openGraph: {
        title: titleString,
        description,
        type: 'website',
        siteName: businessProfile.brandName,
        locale: 'vi_VN',
        url: canonicalUrl,
        images: [{ url: ogImage, alt: page.title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: titleString,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch {
    return {
      title: formatSeoTitle('Trang không tồn tại'),
      robots: { index: false, follow: false },
    };
  }
}

export default async function StorefrontLandingPage({ params, searchParams }: LandingPageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp.preview === 'true';

  const [initialPage, settings] = await Promise.all([
    getPublishedLandingPage(slug),
    getStorefrontSettings().catch(() => null),
  ]);
  let page = initialPage;

  // If in preview mode and not published, try resolving preview
  if (!page && isPreview) {
    try {
      const { mediaEnvironment } = await import('@/server/media-http');
      const { getPreviewLandingPage } = await import('@/server/services/site-builder.service');
      const env = await mediaEnvironment();
      page = await getPreviewLandingPage(env.DB, slug);
    } catch {
      // Ignore preview failure and 404 below
    }
  }

  if (!page) {
    notFound();
  }

  const jsonLd = generateBreadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: page.title, href: `/landing/${page.slug}` },
  ]);

  return (
    <div className="bg-surface-subtle min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* Preview mode notification banner */}
      {isPreview && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2.5 text-center text-xs md:text-sm flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <Eye className="w-4 h-4 shrink-0" />
          <span>BẠN ĐANG XEM BẢN NHÁP (PREVIEW) — Nội dung này chưa được xuất bản chính thức ra công chúng.</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-xs md:text-sm text-slate-500 py-3 font-medium items-center" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 mx-2 text-slate-400" />
            <span className="text-slate-900 font-bold line-clamp-1">{page.title}</span>
          </nav>
        </div>
      </div>

      {/* Dynamic Sections */}
      <BlockRenderer sections={page.sections} settings={settings} flashSale={<FlashSaleSection settings={settings} />} />
    </div>
  );
}
