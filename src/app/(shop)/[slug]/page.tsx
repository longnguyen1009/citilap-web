import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import PolicyLayout from "@/components/policy/PolicyLayout";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { businessProfile } from "@/config/business-profile";
import { getPublishedNavigation, getCachedPublicPage } from '@/server/services/storefront-cms.service';
import CategoryPage, { generateMetadata as categoryMetadata } from '@/components/category/CategoryPage';
import {
  cleanSeoDescription,
  extractFaqsFromHtml,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
  serializeJsonLd,
} from "@/lib/seo-helpers";

interface CustomPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: CustomPageProps): Promise<Metadata> {
  const { slug } = await params;
  const navigation = await getPublishedNavigation();
  if (navigation?.categories.some(c => c.href === '/' + slug)) return categoryMetadata({params: Promise.resolve({category:[slug]}),searchParams});
  try {
    const page = await getCachedPublicPage(slug);
    if (!page) throw new Error("not found");
    const rawTitle = page.seo.title || page.title;
    const titleString = formatSeoTitleString(rawTitle);
    const description = cleanSeoDescription(
      page.seo.description,
      `${page.title} — Thông tin chính thức từ ${businessProfile.brandName}.`,
      { rejectPolicyBoilerplate: true }
    );
    const canonicalUrl = `${businessProfile.canonicalSiteUrl}/${page.slug}`;
    const ogImage = page.seo.ogImageUrl || `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

    return {
      title: formatSeoTitle(rawTitle),
      description,
      openGraph: {
        title: titleString,
        description,
        url: canonicalUrl,
        type: "article",
        siteName: businessProfile.brandName,
        locale: "vi_VN",
        publishedTime: page.publishedAt,
        modifiedTime: page.updatedAt,
        images: [{ url: ogImage, alt: page.title }],
      },
      twitter: {
        card: "summary_large_image",
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
      title: formatSeoTitle("Trang không tồn tại"),
      robots: { index: false, follow: false },
    };
  }
}

export default async function CustomCmsPage({ params, searchParams }: CustomPageProps) {
  const { slug } = await params;
  const navigation = await getPublishedNavigation();
  if (navigation?.categories.some(c => c.href === '/' + slug)) return CategoryPage({params: Promise.resolve({category:[slug]}),searchParams});

  let page;
  try {
    page = await getCachedPublicPage(slug);
  } catch {
    notFound();
  }
  if (!page) notFound();

  // Historical alias handling: if the slug accessed matches an old published revision,
  // Next.js App Router permanentRedirect issues HTTP 308
  if (page.slug !== slug) {
    permanentRedirect(`/${encodeURIComponent(page.slug)}`);
  }

  const faqs = extractFaqsFromHtml(page.contentHtml, page.slug === 'cau-hoi-thuong-gap');
  const faqJsonLd = faqs.length > 0 ? generateFaqJsonLd(faqs) : null;
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Trang chủ", href: "/" },
    { name: page.title, href: `/${page.slug}` },
  ]);

  return (
    <PolicyLayout
      currentSlug={page.slug}
      title={page.title}
      subtitle={cleanSeoDescription(page.seo.description, `${page.title} tại ${businessProfile.brandName}.`, { rejectPolicyBoilerplate: true })}
      isPublished={true}
      lastUpdated={new Date(page.updatedAt).toLocaleDateString("vi-VN")}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(faqJsonLd ? [breadcrumbJsonLd, faqJsonLd] : breadcrumbJsonLd),
        }}
      />
      <div
        className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }}
      />
    </PolicyLayout>
  );
}
