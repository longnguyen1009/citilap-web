import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Calendar, User, ArrowRight, TrendingUp, Newspaper, AlertCircle } from "lucide-react";
import { mediaEnvironment } from "@/server/media-http";
import { publicPostList, publicFeaturedPosts, listPostCategories } from "@/server/services/post.service";

export const metadata = {
  title: "Tin tức & Đánh giá công nghệ | CITILAP.VN",
  description: "Tin tức công nghệ mới nhất, đánh giá laptop gaming, ultrabook, mẹo mua sắm và thủ thuật hữu ích từ CITILAP.VN.",
};

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
        <div className="container mx-auto px-4 max-w-[1240px] text-center">
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

  // Fetch active categories
  const categories = await listPostCategories(env.DB, "ACTIVE");
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;

  // Fetch featured posts (only when browsing all categories on page 1)
  const featuredPosts = (!categorySlug && currentPage === 1) ? await publicFeaturedPosts(env.DB, 1) : [];
  const primaryFeatured = featuredPosts[0] || null;

  // Fetch paginated posts
  const { items, total, totalPages, page } = await publicPostList(env.DB, {
    categoryId: activeCategory?.id,
    page: currentPage,
    limit: 12,
  });

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="container mx-auto px-4 max-w-[1280px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1.5 text-gray-400" />
            <Link href="/news" className={activeCategory ? "hover:text-blue-600 transition" : "text-gray-900 font-bold"}>
              Tin tức & Đánh giá
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

      <div className="container mx-auto px-4 max-w-[1280px]">
        {/* Categories Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar mb-8 gap-2 pb-2">
          <Link
            href="/news"
            className={`flex-shrink-0 px-5 py-2 rounded-full font-bold text-xs md:text-sm transition-all ${
              !categorySlug
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "bg-white border border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600 shadow-2xs"
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
                className={`flex-shrink-0 px-5 py-2 rounded-full font-bold text-xs md:text-sm transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-blue-600 hover:text-blue-600 shadow-2xs"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>

        {/* Featured Article Hero (Page 1 without category filter) */}
        {primaryFeatured && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-200/80 mb-10 group">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-7 relative overflow-hidden min-h-[280px] lg:min-h-[380px] bg-slate-100">
                {primaryFeatured.coverImage ? (
                  <Image
                    src={primaryFeatured.coverImage.url}
                    alt={primaryFeatured.coverImage.alt || primaryFeatured.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Newspaper className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Bài viết nổi bật
                </div>
              </div>
              <div className="lg:col-span-5 p-6 lg:p-10 flex flex-col justify-center">
                {primaryFeatured.category && (
                  <div className="flex items-center gap-3 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
                    <span>{primaryFeatured.category.name}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="flex items-center gap-1 text-gray-500 font-normal">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(primaryFeatured.publishedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                )}
                <h2 className="text-xl lg:text-3xl font-black text-gray-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                  <Link href={`/news/${primaryFeatured.slug}`}>
                    {primaryFeatured.title}
                  </Link>
                </h2>
                {primaryFeatured.excerpt && (
                  <p className="text-gray-600 text-sm lg:text-base mb-6 line-clamp-3 leading-relaxed">
                    {primaryFeatured.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    {primaryFeatured.authorName || "Ban biên tập CitiLap"}
                  </div>
                  <Link
                    href={`/news/${primaryFeatured.slug}`}
                    className="text-blue-600 font-bold uppercase text-xs tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Đọc tiếp <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-blue-600 w-full">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase">
              {activeCategory ? activeCategory.name : "Tất cả bài viết"}
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {total} bài viết
          </span>
        </div>

        {/* Post Grid or Empty State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center my-8">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-800 mb-1">
              Chưa có bài viết nào được xuất bản
            </h4>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl overflow-hidden shadow-2xs border border-gray-200/80 group hover:shadow-md transition-all flex flex-col"
              >
                <Link href={`/news/${post.slug}`} className="relative h-48 overflow-hidden bg-slate-100 block">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage.url}
                      alt={post.coverImage.alt || post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Newspaper className="w-10 h-10" />
                    </div>
                  )}
                  {post.category && (
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                      {post.category.name}
                    </div>
                  )}
                </Link>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(post.publishedAt).toLocaleDateString("vi-VN")}</span>
                    {post.authorName && (
                      <>
                        <span>•</span>
                        <span>{post.authorName}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    <Link href={`/news/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h3>

                  {post.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 text-[11px]">
                      {post.isFeatured ? "★ Nổi bật" : ""}
                    </span>
                    <Link
                      href={`/news/${post.slug}`}
                      className="text-blue-600 font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all"
                    >
                      Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Server Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
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
    </div>
  );
}
