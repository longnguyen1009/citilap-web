import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { 
  ArrowRight, 
  Laptop, 
  Gamepad2, 
  Briefcase, 
  Apple, 
  Palette, 
  Sparkles, 
  ShieldCheck, 
  RotateCcw, 
  CreditCard, 
  Truck, 
  Mouse, 
  Zap, 
  Cable, 
  Fan, 
  Headphones, 
  Backpack, 
  Layers,
  ChevronRight,
  HardDrive
} from "lucide-react";
import Breadcrumb from "@/components/layout/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { getPublishedNavigation } from "@/server/services/storefront-cms.service";
import { getActiveCategories } from "@/server/services/catalog.service";
import { ACCESSORY_TYPES } from "@/config/accessory-taxonomy";
import { businessProfile } from "@/config/business-profile";

export const metadata: Metadata = {
  title: "Phân loại sản phẩm | Thế giới Laptop & Phụ kiện CitiLap",
  description: "Khám phá danh mục Laptop Gaming, Ultrabook Văn phòng, MacBook, Máy Trạm Đồ Họa và Hệ sinh thái Phụ kiện chính hãng tại CitiLap.",
  alternates: { canonical: `${businessProfile.canonicalSiteUrl}/phan-loai` },
};

// Map icons to laptop categories
function getLaptopCategoryIcon(slug: string) {
  if (slug.includes("gaming")) return <Gamepad2 className="w-7 h-7 text-blue-600" aria-hidden="true" />;
  if (slug.includes("van-phong")) return <Briefcase className="w-7 h-7 text-blue-600" aria-hidden="true" />;
  if (slug.includes("macbook")) return <Apple className="w-7 h-7 text-blue-600" aria-hidden="true" />;
  if (slug.includes("do-hoa")) return <Palette className="w-7 h-7 text-blue-600" aria-hidden="true" />;
  if (slug.includes("cu") || slug.includes("like-new")) return <Sparkles className="w-7 h-7 text-amber-600" aria-hidden="true" />;
  return <Laptop className="w-7 h-7 text-blue-600" aria-hidden="true" />;
}

// Map icons to accessory types
function getAccessoryIcon(slug: string) {
  switch (slug) {
    case "mouse-keyboard":
      return <Mouse className="w-6 h-6 text-blue-600" aria-hidden="true" />;
    case "charger":
      return <Zap className="w-6 h-6 text-amber-500" aria-hidden="true" />;
    case "hub":
      return <Cable className="w-6 h-6 text-blue-600" aria-hidden="true" />;
    case "bag":
      return <Backpack className="w-6 h-6 text-indigo-600" aria-hidden="true" />;
    case "stand":
      return <Fan className="w-6 h-6 text-cyan-600" aria-hidden="true" />;
    case "audio":
      return <Headphones className="w-6 h-6 text-purple-600" aria-hidden="true" />;
    case "hardware":
      return <HardDrive className="w-6 h-6 text-emerald-600" aria-hidden="true" />;
    default:
      return <Layers className="w-6 h-6 text-blue-600" aria-hidden="true" />;
  }
}

export default async function CategoriesPage() {
  const navigation = await getPublishedNavigation();
  const allCategories = navigation?.categories ?? await getActiveCategories();

  // Tách biệt nhóm Laptop và nhóm Phụ kiện
  const laptopCategories = allCategories.filter(
    (c) => !c.parentId && !["phu-kien", "linh-kien"].includes(c.slug)
  );
  const accessoryCategory = allCategories.find((c) => ["phu-kien", "linh-kien"].includes(c.slug));
  const accessorySubcategories = allCategories.filter(
    (c) => accessoryCategory && c.parentId === accessoryCategory.id
  );

  const primaryLaptopHref = laptopCategories[0]?.href || "/laptop-gaming";
  const primaryAccessoryHref = accessoryCategory?.href || "/phu-kien";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Phân loại sản phẩm", href: "/phan-loai" },
        ]}
      />

      <div className="container-shop pt-6 sm:pt-8 space-y-12">
        {/* Page Title & Intro */}
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
            Tất Cả Phân Loại Sản Phẩm
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            CitiLap mang đến hệ thống sản phẩm công nghệ tuyển chọn kỹ lưỡng: từ các dòng Laptop chuyên dụng đến hệ sinh thái phụ kiện GaN, gear công thái học chính hãng.
          </p>
        </div>

        {/* 1. Split Hero Banners: Laptop vs Phụ Kiện */}
        <section aria-label="Lối vào nổi bật" className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Banner Laptop */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-6 sm:p-8 text-white shadow-md flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 max-w-md">
              <span className="inline-block px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3">
                Tuyển chọn & Độc quyền
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Thế Giới Laptop Chính Hãng
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-blue-100 line-clamp-2">
                Trải nghiệm sức mạnh đỉnh cao: Gaming, Đồ họa kỹ thuật, Mỏng nhẹ doanh nhân và Máy Like New 99%.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs">Gaming 240Hz</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs">Ultrabook &lt;1.3kg</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs">MacBook Apple Silicon</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs">Like New 99%</span>
              </div>
            </div>
            <div className="relative z-10 mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
              <Link
                href={primaryLaptopHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                Xem tất cả laptop
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <span className="text-xs text-blue-100 font-medium">
                {laptopCategories.length} phân khúc máy
              </span>
            </div>
            {/* Background decorative glow */}
            <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          </div>

          {/* Banner Phụ Kiện */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 text-white shadow-md border border-slate-700/50 flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10 max-w-md">
              <span className="inline-block px-2.5 py-1 rounded-md bg-white/10 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3">
                Hệ sinh thái tiện ích
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Phụ Kiện & Đồ Chơi Công Nghệ
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 line-clamp-2">
                Nâng tầm trải nghiệm thiết bị: Củ sạc nhanh GaN 65W–140W, Chuột & Bàn phím cơ, Hub Type-C và Balo chống sốc.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">Sạc GaN 140W</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">Hub 4K 60Hz</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">Phím cơ & Chuột silent</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">Balo trượt nước</span>
              </div>
            </div>
            <div className="relative z-10 mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-between">
              <Link
                href={primaryAccessoryHref}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-blue-500"
              >
                Khám phá phụ kiện
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <span className="text-xs text-slate-400 font-medium">
                Chính hãng 1 đổi 1 trong 12T
              </span>
            </div>
            {/* Background decorative glow */}
            <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />
          </div>
        </section>

        {/* 2. Section: Phân Loại Laptop */}
        <section aria-label="Phân loại laptop" className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Phân Loại Laptop Theo Nhu Cầu & Dòng Máy
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Tìm kiếm chiếc laptop phù hợp nhất với công việc, giải trí và ngân sách của bạn.
                </p>
              </div>
            </div>
            <Link
              href={primaryLaptopHref}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Xem tất cả
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {laptopCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {laptopCategories.map((cat) => {
                const isLikeNew = cat.slug.includes("cu") || cat.slug.includes("like-new");
                return (
                  <Link
                    key={cat.id}
                    href={cat.href || `/${cat.slug}`}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-500 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden ${isLikeNew ? "bg-amber-50" : "bg-blue-50"}`}>
                          {cat.image ? (
                            <Image
                              src={cat.image}
                              alt={cat.name}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getLaptopCategoryIcon(cat.slug)
                          )}
                        </div>
                        {'productCount' in cat && typeof cat.productCount === 'number' && cat.productCount > 0 && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {cat.productCount} mẫu máy
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {cat.name}
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {cat.description || `Khám phá các dòng máy ${cat.name} chất lượng cao tại CitiLap.`}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Xem chi tiết dòng máy</span>
                      <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Chưa có phân loại laptop"
              description="Danh sách laptop đang được cập nhật. Vui lòng quay lại sau."
            />
          )}
        </section>

        {/* 3. Section: Phân Loại Phụ Kiện & Đồ Chơi Công Nghệ */}
        <section aria-label="Phân loại phụ kiện" className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Phân Loại Phụ Kiện & Đồ Chơi Công Nghệ
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Hệ sinh thái phụ kiện hỗ trợ tối đa cho laptop, bàn làm việc và setup công nghệ.
                </p>
              </div>
            </div>
            <Link
              href={primaryAccessoryHref}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              Xem tất cả phụ kiện
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {ACCESSORY_TYPES.slice(0, 6).map((acc) => {
              // Tìm link nếu có category tương ứng trong DB hoặc filter query
              const matchedCategory = accessorySubcategories.find(
                (c) => c.slug.includes(acc.slug) || acc.keywords.some((k) => c.slug.includes(k))
              );
              const targetHref = (matchedCategory && matchedCategory.href)
                ? matchedCategory.href
                : `${primaryAccessoryHref}?type=${acc.slug}`;

              return (
                <Link
                  key={acc.slug}
                  href={targetHref}
                  className="group flex flex-col items-center justify-center text-center rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-blue-500 hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition mb-3">
                    {getAccessoryIcon(acc.slug)}
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {acc.shortName}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                    {acc.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Section: Trust Value Bar (Cam kết của CitiLap) */}
        <section
          aria-label="Cam kết dịch vụ"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={24} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Bảo Hành 12 Tháng</h4>
                <p className="text-xs text-slate-500 mt-0.5">Phần cứng an tâm tuyệt đối</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <RotateCcw size={24} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Đổi Mới 30 Ngày</h4>
                <p className="text-xs text-slate-500 mt-0.5">Lỗi là đổi không phiền hà</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CreditCard size={24} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hỗ Trợ Trả Góp 0%</h4>
                <p className="text-xs text-slate-500 mt-0.5">Thủ tục nhanh qua thẻ tín dụng</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Truck size={24} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Giao Nhanh 2 Giờ</h4>
                <p className="text-xs text-slate-500 mt-0.5">Miễn phí ship toàn quốc</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
