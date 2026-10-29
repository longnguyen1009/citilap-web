import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Newspaper,
  AlertCircle,
  Flame,
  Hash,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { mediaEnvironment } from "@/server/media-http";
import { publicPostList, listPostCategories } from "@/server/services/post.service";
import { getPublishedHomepage, getStorefrontSettings } from "@/server/services/storefront-cms.service";
import { videoReviewsSectionDataSchema } from "@/contracts/cms/site-builder";
import { DEFAULT_REVIEW_VIDEOS } from "@/contracts/cms/settings";
import { businessProfile } from "@/config/business-profile";
import NewsVideoSidebarWidget, { type SidebarVideoItem } from "@/components/news/NewsVideoSidebarWidget";

export const metadata = {
  title: "Tin tức & Đánh giá công nghệ | CITILAP.VN",
  description:
    "Tin tức công nghệ mới nhất, đánh giá laptop gaming, ultrabook, mẹo mua sắm và thủ thuật hữu ích từ CITILAP.VN.",
};

const DEFAULT_SIDEBAR_VIDEOS: SidebarVideoItem[] = DEFAULT_REVIEW_VIDEOS;

const HOT_TOPICS = [
  { label: "#laptop-gaming", href: "/laptop-gaming" },
  { label: "#macbook", href: "/macbook" },
  { label: "#laptop-van-phong", href: "/laptop-van-phong" },
  { label: "#workstation-do-hoa", href: "/laptop-do-hoa" },
  { label: "#rtx-4060", href: "/search?q=rtx+4060" },
  { label: "#lenovo-legion", href: "/search?q=legion" },
  { label: "#thinkpad", href: "/search?q=thinkpad" },
  { label: "#phu-kien-setup", href: "/phu-kien" },
];

interface NewsPageProps {
  searchParams: Promise<{
    category?: string;
    page?: string;
  }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const query = await searchParams;
  const currentPage = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const categorySlug = query.category?.trim();

  let env;
  try {
    env = await mediaEnvironment();
  } catch {
    return (
      <div className="bg-[#f1f5f9] min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-[1370px] text-center">
          <div className="bg-white rounded-2xl p-10 border border-slate-200 shadow-xs max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Không thể tải danh sách tin tức</h1>
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

  const [categories, cmsHomepage, settings] = await Promise.all([
    listPostCategories(env.DB, "ACTIVE"),
    getPublishedHomepage().catch(() => null),
    getStorefrontSettings().catch(() => null),
  ]);

  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;

  const { items, total, totalPages, page } = await publicPostList(env.DB, {
    categoryId: activeCategory?.id,
    page: currentPage,
    limit: 10,
  });

  // Extract videos from Settings or CMS Homepage video_reviews block
  let sidebarVideos: SidebarVideoItem[] =
    settings?.reviewVideos && settings.reviewVideos.length > 0
      ? settings.reviewVideos
      : DEFAULT_SIDEBAR_VIDEOS;
  const videoSec = cmsHomepage?.sections?.find((s) => s.type === "video_reviews" && s.enabled);
  if (videoSec) {
    const parsedVideoSec = videoReviewsSectionDataSchema.safeParse(videoSec.data);
    if (parsedVideoSec.success && parsedVideoSec.data.videos.length > 0) {
      const cleanCms = parsedVideoSec.data.videos.filter(
        (v) => !/cellphones/i.test(v.title) && !/cellphones/i.test(v.url)
      );
      if (cleanCms.length > 0) {
        const merged = new Map<string, SidebarVideoItem>();
        for (const v of [...cleanCms, ...sidebarVideos]) {
          if (v?.url && !merged.has(v.url)) merged.set(v.url, v);
        }
        sidebarVideos = Array.from(merged.values());
      }
    }
  }

  const youtubeUrl =
    settings?.youtubeUrl && !/cellphones/i.test(settings.youtubeUrl)
      ? settings.youtubeUrl
      : businessProfile.socialProfiles.youtube || "https://www.youtube.com/@thinkview/videos";
  const tiktokUrl = settings?.tiktokUrl || businessProfile.socialProfiles.tiktok;
  const customPromo = settings?.productBanners?.[0];
  const topPromoBanner = {
    imageUrl:
      settings?.subBanner1Image ||
      "https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop",
    title: customPromo?.title || settings?.subBanner1Title || "Săn Deal Laptop Chính Hãng Giá Tốt",
    subtitle: customPromo?.description || settings?.subBanner1Subtitle || "Ưu đãi CitiLap",
    href: customPromo?.href || settings?.subBanner1Link || "/hot-sale",
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-1.5 text-gray-400" />
            <Link
              href="/news"
              className={activeCategory ? "hover:text-blue-600 transition" : "text-gray-900 font-bold"}
            >
              Tin tức &amp; Đánh giá
            </Link>
            {activeCategory && (
              <>
                <ChevronRight className="w-4 h-4 mx-1.5 text-gray-400" />
                <span className="text-gray-900 font-bold">{activeCategory.name}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeCategory ? `Chuyên mục: ${activeCategory.name}` : "Tin tức & Đánh giá Công nghệ"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Đánh giá chi tiết laptop gaming, ultrabook, tư vấn cấu hình và kinh nghiệm sử dụng từ đội ngũ CitiLap.
          </p>
        </div>

        {/* Categories Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
            <Link
              href="/news"
              className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-xs md:text-sm transition-all ${
                !categorySlug
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600"
              }`}
            >
              Tất cả bài viết
            </Link>
            {categories.map((cat) => {
              const isSelected = categorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/news?category=${cat.slug}`}
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
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Hiển thị {items.length} / {total} bài viết
          </span>
        </div>

        {/* 2-COLUMN MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (8 cols): VERTICAL ARTICLE FEED */}
          <div className="lg:col-span-8 min-w-0">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
                <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h2 className="text-base font-bold text-gray-800 mb-1">
                  Chưa có bài viết nào được xuất bản
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                  {activeCategory
                    ? `Hiện chưa có bài viết nào thuộc chuyên mục "${activeCategory.name}". Bạn có thể khám phá các chuyên mục khác.`
                    : "Các bài viết đánh giá và tin tức mới nhất đang được cập nhật. Vui lòng quay lại sau."}
                </p>
                {activeCategory && (
                  <Link
                    href="/news"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition"
                  >
                    Xem tất cả bài viết
                  </Link>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs divide-y divide-slate-100">
                {items.map((post, idx) => {
                  const authorName = post.authorName || "Ban biên tập CitiLap";
                  const authorInitial = authorName.trim().charAt(0).toUpperCase();
                  const formattedDate = new Date(post.publishedAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });

                  return (
                    <article
                      key={post.id}
                      className="group flex flex-col sm:flex-row gap-4 sm:gap-5 py-5 first:pt-0 last:pb-0"
                    >
                      {/* Left Thumbnail */}
                      <Link
                        href={`/news/${post.slug}`}
                        className="relative w-full sm:w-[240px] md:w-[270px] aspect-[16/10] shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 block"
                      >
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage.url}
                            alt={post.coverImage.alt || post.title}
                            fill
                            priority={idx < 2}
                            sizes="(max-width: 640px) 100vw, 270px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Newspaper className="w-10 h-10" />
                          </div>
                        )}
                        {(post.isFeatured || idx === 0) && (
                          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                            <Flame className="w-3 h-3 fill-current" /> HOT
                          </span>
                        )}
                      </Link>

                      {/* Right Text Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h2 className="text-base sm:text-[18px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                            <Link href={`/news/${post.slug}`}>{post.title}</Link>
                          </h2>

                          {post.excerpt && (
                            <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                        </div>

                        {/* Author & Meta Footer */}
                        <div className="mt-3 pt-1 flex flex-wrap items-center gap-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                              {authorInitial}
                            </span>
                            <span className="font-bold text-blue-600">{authorName}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <time dateTime={post.publishedAt} className="text-slate-400 font-medium">
                            {formattedDate}
                          </time>
                          {post.category && (
                            <>
                              <span className="text-slate-300">•</span>
                              <Link
                                href={`/news?category=${post.category.slug}`}
                                className="text-slate-500 hover:text-blue-600 font-semibold transition"
                              >
                                {post.category.name}
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Server Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/news?${new URLSearchParams({
                      ...(categorySlug ? { category: categorySlug } : {}),
                      page: String(page - 1),
                    }).toString()}`}
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
                        href={`/news?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          page: String(p),
                        }).toString()}`}
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
                    href={`/news?${new URLSearchParams({
                      ...(categorySlug ? { category: categorySlug } : {}),
                      page: String(page + 1),
                    }).toString()}`}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Trang sau
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR (4 cols): BANNERS, HOT TAGS & VIDEO REVIEWS */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* 1. Quick Model / Series Box */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs text-center">
              <Link
                href="/laptop-gaming?brand=lenovo"
                className="rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 p-2.5 text-xs font-bold text-slate-800 hover:text-blue-700 transition"
              >
                Laptop Lenovo LOQ &amp; Legion
              </Link>
              <Link
                href="/laptop-gaming?brand=acer"
                className="rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 p-2.5 text-xs font-bold text-slate-800 hover:text-blue-700 transition"
              >
                Laptop Acer Nitro &amp; Aspire Gaming
              </Link>
            </div>

            {/* 2. Top Promotional Banner */}
            <Link
              href={topPromoBanner.href}
              className="group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={topPromoBanner.imageUrl}
                alt={topPromoBanner.title}
                loading="lazy"
                className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 flex flex-col justify-end text-white">
                <span className="inline-block w-fit rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                  {topPromoBanner.subtitle}
                </span>
                <h3 className="text-base font-black leading-snug">
                  {topPromoBanner.title}
                </h3>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-300 group-hover:text-white transition">
                  Khám phá ngay <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            {/* 3. #TAG ĐANG HOT Box (matches reference screenshot) */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-100/80 p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-3.5">
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-xs">
                  <span>#TAG ĐANG HOT</span>
                </div>
                <span className="inline-flex h-7 w-7 -rotate-6 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                  <Hash className="h-4 w-4" />
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/news?category=${cat.slug}`}
                    className="rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:text-blue-600 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition"
                  >
                    #{cat.slug}
                  </Link>
                ))}
                {HOT_TOPICS.map((tag) => (
                  <Link
                    key={tag.label}
                    href={tag.href}
                    className="rounded-xl bg-white border border-slate-200/90 hover:border-blue-500 hover:text-blue-600 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition"
                  >
                    {tag.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 4. Video Review YouTube & TikTok Widget */}
            <NewsVideoSidebarWidget
              videos={sidebarVideos}
              youtubeChannelUrl={youtubeUrl}
              tiktokChannelUrl={tiktokUrl}
            />

            {/* 5. Bottom Advisor / Promo Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0b1221] via-blue-950 to-indigo-950 p-5 text-white shadow-md border border-blue-900/50">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" /> Trợ lý cấu hình
              </div>
              <h3 className="text-base font-black leading-snug">
                Chưa biết chọn Laptop nào phù hợp ngân sách?
              </h3>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Gợi ý tự động các mẫu máy Gaming, Văn phòng, Đồ họa theo đúng tầm giá và nhu cầu thực tế của bạn.
              </p>
              <Link
                href="/chon-laptop"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 px-4 text-xs font-bold text-white transition shadow-sm"
              >
                Mở công cụ chọn Laptop <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
