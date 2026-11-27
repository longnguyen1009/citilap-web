'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import type { publicPostList } from '@/server/services/post.service';
import {
  getPostCategoryHref,
  getPostHref,
  isCustomerExperienceCategory,
} from '@/lib/customer-experience';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export type MediaPostCategoryTab = {
  id: string;
  name: string;
  slug: string;
  posts: MediaPost[];
};

function resolvePostBadge(
  post: MediaPost,
  fallbackCategoryName?: string,
): { label: string; className: string } {
  const rawName = (post.category?.name || fallbackCategoryName || '').trim();
  const rawSlug = (post.category?.slug || '').toLowerCase();
  const probe = `${rawName} ${rawSlug} ${post.title}`.toLowerCase();

  if (/review|đánh\s*giá|danh-gia|trải\s*nghiệm/.test(probe)) {
    return {
      label: 'Review',
      className: 'bg-indigo-600/95 text-white border-indigo-400/40',
    };
  }
  if (/tư\s*vấn|tu-van|chọn\s*mua|hướng\s*dẫn|kinh\s*nghiệm|so\s*sánh/.test(probe)) {
    return {
      label: 'Tư vấn',
      className: 'bg-emerald-600/95 text-white border-emerald-400/40',
    };
  }
  if (/tin\s*tức|tin-tuc|công\s*nghệ|cong-nghe|news/.test(probe)) {
    return {
      label: 'Tin tức',
      className: 'bg-blue-600/95 text-white border-blue-400/40',
    };
  }
  if (rawName) {
    return {
      label: rawName,
      className: 'bg-slate-900/90 text-white border-white/20',
    };
  }
  return {
    label: 'Tin tức',
    className: 'bg-blue-600/95 text-white border-blue-400/40',
  };
}

export default function MediaSectionView({
  posts,
  categories = [],
  title = 'TIN TỨC CÔNG NGHỆ',
  subtitle,
  viewAllLink = '/news',
}: {
  posts: MediaPost[];
  categories?: MediaPostCategoryTab[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [bounds, setBounds] = useState({ start: true, end: false });

  const filteredCategories = useMemo(
    () => categories.filter((c) => !isCustomerExperienceCategory(c)),
    [categories],
  );
  const filteredPosts = useMemo(
    () => posts.filter((p) => !isCustomerExperienceCategory(p.category)),
    [posts],
  );

  const activeCategory = filteredCategories.find((c) => c.id === selectedCategoryId);
  const visiblePosts = activeCategory ? activeCategory.posts : filteredPosts;
  const activeViewAllLink = activeCategory ? getPostCategoryHref(activeCategory) : viewAllLink || '/news';

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    el.scrollTo({ left: 0 });
    const update = () => {
      const start = el.scrollLeft <= 2;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setBounds((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [visiblePosts]);

  if (!posts.length) return null;

  const scrollByAmount = (direction: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={title}>
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="rounded-xl lg:rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-white p-3 md:p-5 shadow-xs">
          {/* Header */}
          <div className="mb-3 md:mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                <span className="inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                  <Flame className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase tracking-tight text-slate-900 leading-snug">
                      {title}
                    </h2>
                    <span className="hidden md:inline h-4 w-px bg-slate-300" aria-hidden="true" />
                    <Link
                      href={activeViewAllLink}
                      className="hidden md:inline-flex min-h-9 items-center gap-0.5 px-2 rounded-lg text-[12px] lg:text-[13px] font-bold text-blue-600 hover:text-blue-700 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                    >
                      Xem tất cả <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {subtitle && <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>}
                </div>
              </div>

              <Link
                href={activeViewAllLink}
                className="md:hidden min-h-10 inline-flex items-center gap-0.5 px-2 -mr-1 rounded-lg text-[12px] font-bold text-blue-600 shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
              >
                <span>Tất cả</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right side: Category Filter Pills + Desktop Scroll Controls */}
            <div className="flex items-center justify-between lg:justify-end gap-2 min-w-0">
              {filteredCategories.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Phân loại tin tức"
                  className="flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar py-0.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategoryId === 'all'}
                    onClick={() => setSelectedCategoryId('all')}
                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                      selectedCategoryId === 'all'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    Tất cả
                  </button>
                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Header Quick Scroll Buttons (Desktop/Tablet) */}
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  aria-label="Cuộn tin tức về trước"
                  disabled={bounds.start}
                  onClick={() => scrollByAmount(-1)}
                  className="flex min-h-9 min-w-9 h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-blue-500 hover:text-blue-600 active:scale-95 transition disabled:opacity-35 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Cuộn tin tức tiếp theo"
                  disabled={bounds.end}
                  onClick={() => scrollByAmount(1)}
                  className="flex min-h-9 min-w-9 h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-blue-500 hover:text-blue-600 active:scale-95 transition disabled:opacity-35 disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Scroll Rail */}
          <div className="relative">
            <div
              ref={rail}
              role="region"
              aria-label={`Danh sách ${title}`}
              tabIndex={0}
              className="grid grid-flow-col auto-cols-[74%] sm:auto-cols-[calc((100%-10px)/2)] md:auto-cols-[calc((100%-24px)/3)] lg:auto-cols-[calc((100%-48px)/4)] xl:auto-cols-[calc((100%-64px)/5)] gap-2.5 md:gap-3 lg:gap-4 overflow-x-auto overscroll-x-contain hide-scrollbar snap-x snap-mandatory scroll-px-1 scroll-smooth motion-reduce:scroll-auto py-0.5 md:py-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              {visiblePosts.map((post) => {
                const badge = resolvePostBadge(post, activeCategory?.name);
                return (
                <Link
                  key={post.id}
                  href={getPostHref(post)}
                  prefetch={false}
                  className="group flex min-w-0 snap-start flex-col rounded-lg lg:rounded-xl border border-slate-200/90 bg-white p-2 md:p-2.5 shadow-2xs transition duration-200 motion-reduce:transition-none hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 hover:border-blue-500 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden"
                >
                  <div className="relative aspect-[16/9] sm:aspect-[16/10] shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <span
                      className={`absolute top-2 left-2 z-10 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wide shadow-xs backdrop-blur-xs ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {post.coverImage ? (() => {
                      const coverSrc = post.coverImage.thumbnailUrl || post.coverImage.url;
                      return (
                        <Image
                          src={coverSrc}
                          alt={post.coverImage.alt || post.title}
                          fill
                          loading="lazy"
                          unoptimized={coverSrc.startsWith('/api/library/') || coverSrc.startsWith('/brand/')}
                          sizes="(max-width: 640px) 74vw, (max-width: 1024px) 33vw, 260px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                        />
                      );
                    })() : (
                      <BookOpen className="m-auto h-full w-7 text-slate-400" />
                    )}
                  </div>
                  <h3 className="mt-2 md:mt-2.5 line-clamp-2 md:line-clamp-3 text-[12px] md:text-[13px] lg:text-[14px] font-semibold leading-snug text-slate-800 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                </Link>
                );
              })}
            </div>

            {/* Overlay Side Arrows (Desktop/Tablet) */}
            {visiblePosts.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Tin tức trước"
                  disabled={bounds.start}
                  onClick={() => scrollByAmount(-1)}
                  className="hidden md:flex absolute -left-2 top-1/2 min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Tin tức tiếp theo"
                  disabled={bounds.end}
                  onClick={() => scrollByAmount(1)}
                  className="hidden md:flex absolute -right-2 top-1/2 min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
