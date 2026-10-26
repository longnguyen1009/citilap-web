"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Layers, type LucideIcon } from "lucide-react";
import { SHOWCASE_CATEGORIES } from "@/config/category-showcase";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";

type DisplayCategory = { id: string; name: string; href: string; icon: LucideIcon; image?: string | null; alt?: string; badge?: string; badgeColor?: string };

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
    ? navigation.categories.filter(cat => !cat.parentId).map((cat) => ({ id: cat.id, name: cat.name, href: cat.href, icon: Layers, image: cat.image, alt: cat.alt }))
    : SHOWCASE_CATEGORIES;
  const rows = Array.from({ length: Math.ceil(displayCategories.length / 8) }, (_, index) =>
    displayCategories.slice(index * 8, (index + 1) * 8)
  );

  return (
    <section
      aria-label="Khám phá danh mục CitiLap"
      className="pb-10 pt-2"
    >
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 md:p-6 relative overflow-hidden">
          {/* Header thanh danh mục */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-slate-900">
                    DANH MỤC NỔI BẬT
                  </h2>
                  <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    Laptop & Phụ Kiện Tech
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  Laptop chính hãng, phụ kiện tuyển chọn và đồ chơi công nghệ setup bàn làm việc
                </p>
              </div>
            </div>

            {/* Điều hướng & Link xem tất cả */}
            <div className="flex items-center gap-3">
              <Link
                href="/phan-loai"
                className="hidden sm:inline-flex items-center gap-1 text-xs md:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
              >
                <span>Xem tất cả danh mục</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Nút lướt ngang (Chỉ hiển thị khi nội dung cần cuộn) */}
              {canScroll && (
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={() => scroll("left")}
                    disabled={!canScrollLeft}
                    aria-label="Cuộn danh mục sang trái"
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scroll("right")}
                    disabled={!canScrollRight}
                    aria-label="Cuộn danh mục sang phải"
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
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
            className="overflow-x-auto scrollbar-none pb-2 -mx-2 px-2 snap-x snap-mandatory scroll-smooth focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden rounded-xl"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex flex-col gap-4 min-w-[760px] md:min-w-[980px] lg:min-w-full">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-8 gap-2 md:gap-3">
                {row.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group flex flex-col items-center p-2 rounded-xl hover:bg-slate-50 active:scale-95 transition-all duration-150 snap-start text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                    >
                      {/* Vòng tròn Icon */}
                      <div className="relative mb-2">
                        <div className="w-13 h-13 md:w-16 md:h-16 rounded-full bg-slate-100/80 border border-slate-200/70 flex items-center justify-center text-slate-700 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-indigo-50 group-hover:border-blue-400 group-hover:text-blue-600 group-hover:scale-105 motion-reduce:group-hover:scale-100 group-hover:shadow-md group-hover:shadow-blue-500/10">
                          {item.image
                            ? <Image src={item.image} alt={item.alt || item.name} width={64} height={64} unoptimized className="w-full h-full rounded-full object-cover" />
                            : <Icon className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100" />}
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
                      <span className="text-xs md:text-sm font-semibold text-slate-800 leading-tight line-clamp-2 max-w-[85px] md:max-w-[105px] group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
                </div>
              ))}
            </div>
          </div>

          {/* Link Xem tất cả cho Mobile */}
          <div className="sm:hidden pt-3 mt-1 border-t border-slate-100 text-center">
            <Link
              href="/phan-loai"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"
            >
              <span>Xem tất cả danh mục sản phẩm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
