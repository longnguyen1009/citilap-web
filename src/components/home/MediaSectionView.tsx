'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import type { publicPostList } from '@/server/services/post.service';

type MediaPost = Awaited<ReturnType<typeof publicPostList>>['items'][number];

export default function MediaSectionView({
  posts,
  title = 'TIN TỨC CÔNG NGHỆ',
  subtitle,
  viewAllLink = '/news',
}: {
  posts: MediaPost[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () =>
      setBounds({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [posts]);

  if (!posts.length) return null;

  const scrollByAmount = (direction: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <section className="pb-5 sm:pb-10" aria-label={title}>
      <div className="container mx-auto max-w-[1370px] px-2.5 sm:px-4">
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/70 via-white to-white p-3 sm:p-5 shadow-xs sm:shadow-sm">
          {/* Header */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h2 className="text-[15px] font-black uppercase tracking-tight text-slate-900 sm:text-xl">
                    {title}
                  </h2>
                  <span className="hidden sm:inline h-4 w-px bg-slate-300" aria-hidden="true" />
                  <Link
                    href={viewAllLink || '/news'}
                    className="hidden sm:inline-flex items-center gap-0.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    Xem tất cả <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>}
              </div>
            </div>

            <Link
              href={viewAllLink || '/news'}
              className="sm:hidden inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 shrink-0 whitespace-nowrap"
            >
              <span>Tất cả</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>

            {/* Header Quick Scroll Buttons (Desktop/Tablet) */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Cuộn tin tức về trước"
                disabled={bounds.start}
                onClick={() => scrollByAmount(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-blue-500 hover:text-blue-600 active:scale-95 transition disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Cuộn tin tức tiếp theo"
                disabled={bounds.end}
                onClick={() => scrollByAmount(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-blue-500 hover:text-blue-600 active:scale-95 transition disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Rail */}
          <div className="relative">
            <div
              ref={rail}
              role="region"
              aria-label={`Danh sách ${title}`}
              tabIndex={0}
              className="grid grid-flow-col auto-cols-[72%] sm:auto-cols-[calc((100%-12px)/2)] md:auto-cols-[calc((100%-24px)/3)] lg:auto-cols-[calc((100%-48px)/5)] gap-2.5 sm:gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar snap-x snap-mandatory scroll-px-1 scroll-smooth motion-reduce:scroll-auto py-0.5 sm:py-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            >
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news/${post.slug}`}
                  className="group flex min-w-0 snap-start flex-col rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-2xs sm:shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden"
                >
                  <div className="relative aspect-[16/9] sm:aspect-[16/10] shrink-0 overflow-hidden rounded-lg sm:rounded-xl bg-slate-100">
                    {post.coverImage ? (() => {
                      const coverSrc = post.coverImage.thumbnailUrl || post.coverImage.url;
                      return (
                        <Image
                          src={coverSrc}
                          alt={post.coverImage.alt || post.title}
                          fill
                          unoptimized={coverSrc.includes('size=thumb') || coverSrc.startsWith('/brand/')}
                          sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 260px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                        />
                      );
                    })() : (
                      <BookOpen className="m-auto h-full w-7 text-slate-400" />
                    )}
                  </div>
                  <h3 className="mt-2 sm:mt-2.5 line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm font-semibold leading-snug text-slate-800 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                </Link>
              ))}
            </div>

            {/* Overlay Side Arrows (Desktop/Tablet) */}
            {posts.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Tin tức trước"
                  disabled={bounds.start}
                  onClick={() => scrollByAmount(-1)}
                  className="hidden sm:flex absolute -left-2 top-1/2 h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Tin tức tiếp theo"
                  disabled={bounds.end}
                  onClick={() => scrollByAmount(1)}
                  className="hidden sm:flex absolute -right-2 top-1/2 h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
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
