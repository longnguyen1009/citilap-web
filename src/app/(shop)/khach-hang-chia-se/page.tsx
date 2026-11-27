import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ChevronRight } from "lucide-react";
import { mediaEnvironment } from "@/server/media-http";
import {
  enrichPostsWithPrimaryProduct,
  getCachedPublicPostCategories,
  getCachedPublicPostList,
} from "@/server/services/storefront-cms.service";
import { businessProfile } from "@/config/business-profile";
import {
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/lib/seo-helpers";
import {
  CUSTOMER_EXPERIENCE_BASE_PATH,
  getPostCategoryHref,
  isCustomerExperienceCategory,
} from "@/lib/customer-experience";
import CustomerJournalView from "@/components/news/CustomerJournalView";

interface CustomerStoriesPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: CustomerStoriesPageProps): Promise<Metadata> {
  const query = await searchParams;
  const pageNum = Math.max(1, parseInt(query.page || "1", 10) || 1);

  const categories = await getCachedPublicPostCategories().catch(() => []);
  const expCategory = categories.find((c) => isCustomerExperienceCategory(c));
  const categoryName = expCategory?.name || "Trải nghiệm khách hàng";

  const baseTitle = `${categoryName} — Nhật ký bàn giao & Chia sẻ thực tế`;
  const rawTitle = pageNum > 1 ? `${baseTitle} – Trang ${pageNum}` : baseTitle;
  const titleString = formatSeoTitleString(rawTitle);
  const description =
    "Nhật ký trải nghiệm khách hàng thực tế tại CitiLap: hình ảnh bàn giao laptop, quy trình kiểm tra máy và chia sẻ cảm nhận từ người mua.";

  const canonicalPath =
    pageNum > 1
      ? `${CUSTOMER_EXPERIENCE_BASE_PATH}?page=${pageNum}`
      : CUSTOMER_EXPERIENCE_BASE_PATH;
  const canonicalUrl = `${businessProfile.canonicalSiteUrl}${canonicalPath}`;
  const ogImage = `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

  return {
    title: formatSeoTitle(rawTitle),
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: titleString,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: businessProfile.brandName,
      locale: "vi_VN",
      images: [{ url: ogImage, alt: baseTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: titleString,
      description,
      images: [ogImage],
    },
  };
}

export default async function CustomerStoriesPage({
  searchParams,
}: CustomerStoriesPageProps) {
  const query = await searchParams;
  const currentPage = Math.max(1, parseInt(query.page || "1", 10) || 1);

  try {
    await mediaEnvironment();
  } catch {
    return (
      <div className="bg-[#f1f5f9] min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-[1370px] text-center">
          <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-xs max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              Không thể tải danh sách trải nghiệm khách hàng
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Hệ thống cơ sở dữ liệu hiện không khả dụng. Vui lòng thử lại sau giây lát.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const categories = await getCachedPublicPostCategories();
  const expCategory = categories.find((c) => isCustomerExperienceCategory(c));
  const categoryName = expCategory?.name || "Trải nghiệm khách hàng";

  const { items, total, totalPages, page } = expCategory
    ? await getCachedPublicPostList(expCategory.id, currentPage, 10)
    : { items: [], total: 0, totalPages: 1, page: 1 };

  const journalEntries = await enrichPostsWithPrimaryProduct(
    items,
    total,
    (page - 1) * 10
  );

  const jsonLd = [
    generateBreadcrumbJsonLd([
      { name: "Trang chủ", href: "/" },
      { name: "Tin tức & Đánh giá", href: "/news" },
      { name: categoryName, href: CUSTOMER_EXPERIENCE_BASE_PATH },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": `${businessProfile.canonicalSiteUrl}${CUSTOMER_EXPERIENCE_BASE_PATH}#blog`,
      name: `${categoryName} | CitiLap`,
      url: `${businessProfile.canonicalSiteUrl}${CUSTOMER_EXPERIENCE_BASE_PATH}`,
      publisher: { "@id": `${businessProfile.canonicalSiteUrl}/#organization` },
      blogPost: items.slice(0, 10).map((post) => ({
        "@type": "BlogPosting",
        headline: post.title,
        url: `${businessProfile.canonicalSiteUrl}${CUSTOMER_EXPERIENCE_BASE_PATH}/${post.slug}`,
        datePublished: post.publishedAt,
      })),
    },
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center flex-wrap">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-1.5 text-gray-400" />
            <Link href="/news" className="hover:text-blue-600 transition">
              Tin tức &amp; Đánh giá
            </Link>
            <ChevronRight className="w-4 h-4 mx-1.5 text-gray-400" />
            <span className="text-gray-900 font-bold">{categoryName}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {categoryName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tổng hợp nhật ký bàn giao máy, hình ảnh thực tế và chia sẻ cảm nhận từ khách hàng đã tin chọn CitiLap.
          </p>
        </div>

        {/* Shared News Categories Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            <Link
              href="/news"
              className="flex-shrink-0 px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all bg-white border border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600"
            >
              Tất cả bài viết
            </Link>
            {categories.map((cat) => {
              const isSelected = expCategory?.id === cat.id;
              return (
                <Link
                  key={cat.id}
                  href={getPostCategoryHref(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
            {!expCategory && (
              <span className="flex-shrink-0 px-4 py-2 rounded-full font-bold text-xs md:text-sm bg-blue-600 text-white shadow-sm shadow-blue-600/25">
                {categoryName}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Hiển thị {items.length} / {total} bài viết
          </span>
        </div>

        {/* 2-Column Journal Timeline Layout */}
        <CustomerJournalView
          entries={journalEntries}
          categoryName={categoryName}
          total={total}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={
                  page - 1 === 1
                    ? CUSTOMER_EXPERIENCE_BASE_PATH
                    : `${CUSTOMER_EXPERIENCE_BASE_PATH}?page=${page - 1}`
                }
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Trang trước
              </Link>
            )}

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === page;
                return (
                  <Link
                    key={p}
                    href={
                      p === 1
                        ? CUSTOMER_EXPERIENCE_BASE_PATH
                        : `${CUSTOMER_EXPERIENCE_BASE_PATH}?page=${p}`
                    }
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>

            {page < totalPages && (
              <Link
                href={`${CUSTOMER_EXPERIENCE_BASE_PATH}?page=${page + 1}`}
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Trang sau
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
