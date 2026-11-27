import {
  getCachedPricingContext,
  getCachedPublicPost,
  getCachedPublicPostList,
  getCachedRelatedProducts,
  getStorefrontSettings,
} from "@/server/services/storefront-cms.service";
import { applyPricingToHomepageProducts } from "@/server/services/pricing.service";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Calendar, User, ArrowLeft, Tag, Sparkles } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import PostPhotoGallery from "@/components/news/PostPhotoGallery";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { businessProfile } from "@/config/business-profile";
import {
  cleanSeoDescription,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/lib/seo-helpers";
import {
  CUSTOMER_EXPERIENCE_BASE_PATH,
  getPostHref,
  isCustomerExperienceCategory,
} from "@/lib/customer-experience";

interface CustomerStoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CustomerStoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getCachedPublicPost(slug);
    if (!post) throw new Error("not found");
    const rawTitle = post.seo.title || post.title;
    const titleString = formatSeoTitleString(rawTitle, post.title);
    const description = cleanSeoDescription(
      post.seo.description || post.excerpt,
      `${post.title} — Nhật ký trải nghiệm thực tế của khách hàng mua laptop tại CitiLap.`
    );

    const rawOgImage =
      post.seo.ogImageUrl || post.coverImage?.url || businessProfile.bannerAsset;
    const ogImage = /^https?:\/\//i.test(rawOgImage)
      ? rawOgImage
      : `${businessProfile.canonicalSiteUrl}${rawOgImage.startsWith("/") ? "" : "/"}${rawOgImage}`;

    const canonicalUrl = `${businessProfile.canonicalSiteUrl}${CUSTOMER_EXPERIENCE_BASE_PATH}/${post.slug}`;

    return {
      title: formatSeoTitle(rawTitle, post.title),
      description,
      openGraph: {
        title: titleString,
        description,
        url: canonicalUrl,
        type: "article",
        siteName: businessProfile.brandName,
        locale: "vi_VN",
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        authors: post.authorName ? [post.authorName] : undefined,
        images: [{ url: ogImage, alt: post.title }],
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
      title: formatSeoTitle("Bài viết không tồn tại"),
      robots: { index: false, follow: false },
    };
  }
}

export default async function CustomerStoryDetailPage({
  params,
}: CustomerStoryDetailPageProps) {
  const { slug } = await params;

  const [settings, pricingContext, post] = await Promise.all([
    getStorefrontSettings(),
    getCachedPricingContext().catch(() => null),
    getCachedPublicPost(slug).catch(() => null),
  ]);
  const phone = settings?.storePhone || businessProfile.displayPhone;
  if (!post) notFound();

  // If this post belongs to a different news category, redirect to /news/[slug]
  if (post.category && !isCustomerExperienceCategory(post.category)) {
    permanentRedirect(`/news/${encodeURIComponent(post.slug)}`);
  }

  // Historical slug alias handling
  if (post.slug !== slug) {
    permanentRedirect(
      `${CUSTOMER_EXPERIENCE_BASE_PATH}/${encodeURIComponent(post.slug)}`
    );
  }

  const evaluatedAt = new Date();
  const [rawRelatedProducts, morePostsResult] = await Promise.all([
    post.relatedProductIds.length > 0
      ? getCachedRelatedProducts("", null, null, 8, post.relatedProductIds).catch(() => [])
      : Promise.resolve([]),
    getCachedPublicPostList(post.category?.id, 1, 5).catch(() => null),
  ]);
  const relatedProducts = applyPricingToHomepageProducts(
    rawRelatedProducts,
    pricingContext,
    evaluatedAt
  );

  const morePosts = (morePostsResult?.items ?? [])
    .filter((p) => p.id !== post.id)
    .slice(0, 4);

  const safeContent = sanitizeHtml(post.contentHtml || "");
  const categoryName = post.category?.name || "Trải nghiệm khách hàng";
  const articleUrl = `${businessProfile.canonicalSiteUrl}${CUSTOMER_EXPERIENCE_BASE_PATH}/${post.slug}`;

  const breadcrumbItems = [
    { name: "Trang chủ", href: "/" },
    { name: "Tin tức & Đánh giá", href: "/news" },
    { name: categoryName, href: CUSTOMER_EXPERIENCE_BASE_PATH },
    { name: post.title, href: `${CUSTOMER_EXPERIENCE_BASE_PATH}/${post.slug}` },
  ];

  const jsonLd = [
    generateBreadcrumbJsonLd(breadcrumbItems),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${articleUrl}#article`,
      headline: post.title,
      description: post.excerpt || post.seo.description,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      url: articleUrl,
      ...(post.coverImage?.url
        ? {
            image: [
              post.coverImage.url.startsWith("http")
                ? post.coverImage.url
                : `${businessProfile.canonicalSiteUrl}${post.coverImage.url}`,
            ],
          }
        : {}),
      author: {
        "@type": "Person",
        name: post.authorName || businessProfile.brandName,
      },
      publisher: {
        "@type": "Organization",
        name: businessProfile.brandName,
        url: businessProfile.canonicalSiteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${businessProfile.canonicalSiteUrl}${businessProfile.logoAsset}`,
        },
      },
    },
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-xs md:text-sm text-gray-500 py-3.5 font-medium items-center flex-wrap gap-1">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link href="/news" className="hover:text-blue-600 transition">
              Tin tức &amp; Đánh giá
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link
              href={CUSTOMER_EXPERIENCE_BASE_PATH}
              className="hover:text-blue-600 transition"
            >
              {categoryName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-800 font-bold truncate max-w-[240px] md:max-w-md">
              {post.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Article Content (8 cols) */}
          <div className="lg:col-span-8">
            <article className="bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-6 sm:p-10 md:p-12">
              {/* Category & Date */}
              <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                <Link
                  href={CUSTOMER_EXPERIENCE_BASE_PATH}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                >
                  <Tag className="w-3 h-3" />
                  {categoryName}
                </Link>
                <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(post.publishedAt).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {post.authorName && (
                  <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                    <User className="w-3.5 h-3.5" />
                    {post.authorName}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight mb-6">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <div className="bg-slate-50 border-l-4 border-blue-600 p-4 rounded-r-2xl text-slate-700 text-sm sm:text-base font-medium leading-relaxed mb-8">
                  {post.excerpt}
                </div>
              )}

              {/* Photo Gallery (multi-image, first image is thumbnail) */}
              {(() => {
                const gallery =
                  post.galleryImages && post.galleryImages.length > 0
                    ? post.galleryImages
                    : post.coverImage
                      ? [post.coverImage]
                      : [];
                return gallery.length > 0 ? (
                  <PostPhotoGallery images={gallery} title={post.title} />
                ) : null;
              })()}

              {/* Rich Body Content */}
              <div
                className="prose prose-sm sm:prose-base md:prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-700 prose-img:rounded-2xl prose-img:shadow-2xs"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    {post.authorName ? post.authorName.charAt(0).toUpperCase() : "C"}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      {post.authorName || "Khách hàng CitiLap"}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Nhật ký trải nghiệm thực tế tại CITILAP.VN
                    </div>
                  </div>
                </div>

                <Link
                  href={CUSTOMER_EXPERIENCE_BASE_PATH}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Quay lại Nhật ký khách hàng
                </Link>
              </div>
            </article>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
              <section className="mt-12">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-black text-gray-900 uppercase">
                    Sản phẩm khách hàng đã chọn
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {relatedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar (4 cols) */}
          <aside className="lg:col-span-4 space-y-6">
            {morePosts.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-200/90 shadow-2xs p-6">
                <h3 className="font-bold text-sm uppercase text-gray-900 border-b border-gray-100 pb-3 mb-4">
                  Trải nghiệm khách hàng khác
                </h3>
                <div className="space-y-4">
                  {morePosts.map((other) => (
                    <Link
                      key={other.id}
                      href={getPostHref(other)}
                      className="group flex gap-3.5 items-start"
                    >
                      <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                        {other.coverImage ? (
                          <Image
                            src={other.coverImage.thumbnailUrl || other.coverImage.url}
                            alt={other.coverImage.alt || other.title}
                            fill
                            sizes="80px"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Tag className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                          {other.title}
                        </h4>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(other.publishedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-blue-900 rounded-3xl p-6 text-white shadow-md">
              <h3 className="text-base font-black mb-2">Cần tư vấn chọn laptop?</h3>
              <p className="text-xs text-blue-100 leading-relaxed mb-4">
                Kỹ thuật viên tại CitiLap luôn sẵn sàng hỗ trợ bạn lựa chọn cấu hình phù hợp với nhu cầu và ngân sách thực tế.
              </p>
              <a
                href={"tel:" + phone.replace(/\s+/g, "")}
                className="block text-center w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs uppercase tracking-wider transition shadow-sm"
              >
                Gọi ngay: {phone}
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
