"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Layers, Gamepad2, Briefcase, Palette, Laptop, RefreshCw, Cpu, type LucideIcon } from "lucide-react";
import { SHOWCASE_CATEGORIES } from "@/config/category-showcase";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";

type DisplayCategory = { id: string; name: string; href: string; icon: LucideIcon; image?: string | null; alt?: string; badge?: string; badgeColor?: string };

function resolveCategoryIcon(slug: string, href: string): LucideIcon {
  const matched = SHOWCASE_CATEGORIES.find((item) => item.href === href || item.slug === slug || item.id === slug);
  if (matched) return matched.icon;
  const key = `${slug} ${href}`.toLowerCase();
  if (key.includes("gaming")) return Gamepad2;
  if (key.includes("van-phong")) return Briefcase;
  if (key.includes("do-hoa") || key.includes("workstation")) return Palette;
  if (key.includes("macbook") || key.includes("mong-nhe") || key.includes("sinh-vien")) return Laptop;
  if (key.includes("likenew") || key.includes("cu")) return RefreshCw;
  if (key.includes("phu-kien") || key.includes("linh-kien")) return Cpu;
  return Layers;
}

export default function CategoryGridSection({ navigation }: { navigation?: ResolvedNavigation | null }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const isScrollable = scrollWidth > clientWidth + 10;
      setCanScroll(isScrollable);
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Chia 16 danh mục thành 2 hàng đều đặn (mỗi hàng 8 mục)
  const displayCategories: DisplayCategory[] = navigation
    ? navigation.categories.filter(cat => !cat.parentId).map((cat) => ({
        id: cat.id,
        name: cat.name,
        href: cat.href,
        icon: resolveCategoryIcon(cat.slug, cat.href),
        image: cat.image,
        alt: cat.alt,
      }))
    : SHOWCASE_CATEGORIES;
  const rows = Array.from({ length: Math.ceil(displayCategories.length / 6) }, (_, index) =>
    displayCategories.slice(index * 6, (index + 1) * 6)
  );

  return (
    <section
      aria-label="Khám phá danh mục CitiLap"
      className="py-4 md:py-6"
    >
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200/90 shadow-xs p-3 md:p-5 lg:p-6 relative overflow-hidden">
          {/* Header thanh danh mục */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 md:pb-4 md:mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-xl font-black uppercase tracking-wider text-slate-900 truncate">
                    DANH MỤC NỔI BẬT
                  </h2>
                  <span className="hidden md:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                    Laptop & Phụ Kiện Tech
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden lg:block">
                  Laptop chính hãng, phụ kiện tuyển chọn và đồ chơi công nghệ setup bàn làm việc
                </p>
              </div>
            </div>

            {/* Điều hướng & Link xem tất cả */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/phan-loai"
                prefetch={false}
                className="min-h-11 inline-flex items-center gap-1 text-xs md:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                <span className="md:hidden">Tất cả</span>
                <span className="hidden md:inline">Xem tất cả danh mục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Nút lướt ngang (Chỉ hiển thị trên tablet/desktop khi nội dung cần cuộn) */}
              {canScroll && (
                <div className="hidden md:flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => scroll("left")}
                    disabled={!canScrollLeft}
                    aria-label="Cuộn danh mục sang trái"
                    className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scroll("right")}
                    disabled={!canScrollRight}
                    aria-label="Cuộn danh mục sang phải"
                    className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Container danh mục 2 hàng (Horizontal Scrollable) */}
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            role="region"
            aria-label="Danh mục nổi bật"
            className="overflow-x-auto overscroll-x-contain hide-scrollbar pb-1 md:pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden rounded-xl"
          >
            {/* Smartphone (< 768px): 2-row horizontal grid with 4 columns */}
            <div className="grid md:hidden grid-rows-2 grid-flow-col auto-cols-[calc((100%-24px)/4)] gap-2 pt-1">
              {displayCategories.map((item) => {
                const Icon = item.icon;
                const thumbSrc =
                  item.image && item.image.startsWith("/api/library/") && !item.image.includes("?")
                    ? `${item.image}?size=thumb&v=2`
                    : item.image;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={false}
                    className="group min-h-11 min-w-0 flex flex-col items-center justify-start p-1 rounded-lg active:scale-95 transition-all duration-150 motion-reduce:transition-none snap-start text-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                  >
                    <div className="relative mb-1.5">
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-700 shadow-xs">
                        {thumbSrc ? (
                          <Image src={thumbSrc} alt={item.alt || item.name} width={56} height={56} loading="lazy" decoding="async" unoptimized className="w-full h-full rounded-xl object-contain p-1" />
                        ) : (
                          <Icon className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      {item.badge && (
                        <span
                          className={`absolute -top-1.5 -right-2 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-2xs uppercase tracking-tight whitespace-nowrap ${
                            item.badgeColor || "bg-red-500 text-white"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2 w-full">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* PC / Tablet (>= 768px): 6-column grid per row */}
            <div className="hidden md:flex flex-col gap-3 min-w-[720px] lg:min-w-full">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-6 gap-2.5 lg:gap-3">
                  {row.map((item) => {
                    const Icon = item.icon;
                    const thumbSrc =
                      item.image && item.image.startsWith("/api/library/") && !item.image.includes("?")
                        ? `${item.image}?size=thumb&v=2`
                        : item.image;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        prefetch={false}
                        className="group min-h-11 flex flex-col items-center p-2 lg:p-2.5 rounded-2xl border-2 border-slate-300/90 bg-gradient-to-b from-white via-slate-50/70 to-blue-50/40 hover:border-blue-500 hover:from-blue-50/60 hover:to-white hover:-translate-y-1 hover:shadow-md motion-reduce:hover:translate-y-0 active:scale-95 transition-all duration-150 motion-reduce:transition-none snap-start text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden shadow-xs"
                      >
                        {/* Icon / Ảnh (không border, padding nhỏ) */}
                        <div className="relative mb-1.5">
                          <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center text-slate-700 transition-all duration-300 group-hover:text-blue-600">
                            {thumbSrc ? (
                              <Image src={thumbSrc} alt={item.alt || item.name} width={80} height={80} loading="lazy" decoding="async" unoptimized className="w-full h-full object-contain p-0.5 mix-blend-multiply" />
                            ) : (
                              <Icon className="w-7 h-7 lg:w-8 lg:h-8 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
                            )}
                          </div>
                          {item.badge && (
                            <span
                              className={`absolute -top-1 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs uppercase tracking-tight ${
                                item.badgeColor || "bg-red-500 text-white"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {/* Tên danh mục */}
                        <span className="text-xs lg:text-sm font-semibold text-slate-800 leading-tight line-clamp-2 max-w-[105px] group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
