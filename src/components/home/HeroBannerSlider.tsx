'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatJournalDateParts,
  getPostHref,
  type CustomerExperienceCardItem,
} from '@/lib/customer-experience';

interface HeroBannerSliderProps {
  primarySlide: ReactNode;
  stories: CustomerExperienceCardItem[];
  viewAllHref: string;
  sectionTitle?: string;
  primaryDurationMs?: number;
  storiesDurationMs?: number;
}

export default function HeroBannerSlider({
  primarySlide,
  stories,
  viewAllHref,
  sectionTitle = 'Trải Nghiệm Khách Hàng',
  primaryDurationMs = 5000,
  storiesDurationMs = 15000,
}: HeroBannerSliderProps) {
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const [isPaused, setIsPaused] = useState(false);

  const visibleStories = stories.slice(0, 8);
  const hasStoriesSlide = visibleStories.length > 0;

  useEffect(() => {
    if (!hasStoriesSlide || isPaused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const delay = activeSlide === 0 ? primaryDurationMs : storiesDurationMs;
    const timer = window.setTimeout(() => {
      // Auto-slide only applies on tablet/desktop (md+); mobile stacks both sections vertically
      if (window.matchMedia('(min-width: 768px)').matches) {
        setActiveSlide((prev) => (prev === 0 ? 1 : 0));
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [hasStoriesSlide, isPaused, activeSlide, primaryDurationMs, storiesDurationMs]);

  if (!hasStoriesSlide) {
    return <>{primarySlide}</>;
  }

  const toggleSlide = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));

  return (
    <div
      className="relative group/hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      aria-label="Banner nổi bật và Trải nghiệm khách hàng"
    >
      {/* Mobile (< md): stacked vertically (Banner 1 on top, swipeable Stories below).
          Desktop (md+): stacked grid with smooth crossfade auto-slide. */}
      <div className="flex flex-col md:grid md:grid-cols-1 md:grid-rows-1">
        {/* SLIDE 1: Primary Hero Banner */}
        <div
          className={`md:col-start-1 md:row-start-1 md:transition-opacity md:duration-500 motion-reduce:transition-none ${
            activeSlide === 0
              ? 'md:opacity-100 md:z-10 md:pointer-events-auto'
              : 'md:opacity-0 md:z-0 md:pointer-events-none md:select-none'
          }`}
        >
          {primarySlide}
        </div>

        {/* SLIDE 2 (Desktop) / Below-Hero Story Strip (Mobile) */}
        <div
          className={`md:col-start-1 md:row-start-1 flex items-center bg-[#0f172a] text-white md:transition-opacity md:duration-500 motion-reduce:transition-none ${
            activeSlide === 1
              ? 'md:opacity-100 md:z-10 md:pointer-events-auto'
              : 'md:opacity-0 md:z-0 md:pointer-events-none md:select-none'
          }`}
        >
          <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4 py-3 md:py-3.5">
            {/* Minimal Header: Title + View All */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-[12px] sm:text-[13px] lg:text-[14px] font-black uppercase tracking-wide text-slate-100 truncate">
                {sectionTitle}
              </h2>
              <Link
                href={viewAllHref}
                prefetch={false}
                className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 px-3 py-1 text-[11px] font-bold text-white transition whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* Facebook Story-style swipeable rail on mobile, 6-7 cols on desktop */}
            <div
              role="region"
              aria-label="Vuốt ngang để xem trải nghiệm khách hàng"
              className="-mx-3 px-3 md:mx-0 md:px-0 grid grid-flow-col auto-cols-[118px] sm:auto-cols-[136px] md:auto-cols-[150px] lg:auto-cols-[calc((100%-60px)/6)] xl:auto-cols-[calc((100%-70px)/7)] gap-2 sm:gap-2.5 overflow-x-auto overscroll-x-contain touch-pan-x hide-scrollbar snap-x snap-proximity scroll-px-3 md:scroll-px-0 select-none py-0.5 [-webkit-overflow-scrolling:touch]"
            >
              {visibleStories.map((story, idx) => {
                const dateInfo = formatJournalDateParts(story.publishedAt);
                const coverSrc = story.coverImage?.thumbnailUrl || story.coverImage?.url;

                return (
                  <article
                    key={story.id}
                    className="group snap-start flex flex-col min-w-0"
                  >
                    {/* Compact Timeline Date Header */}
                    <div className="flex items-center gap-1.5 pb-1.5">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          idx === 0
                            ? 'bg-blue-500 ring-3 ring-blue-500/30'
                            : 'bg-slate-500 group-hover:bg-blue-400 transition-colors'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-[10px] sm:text-[10.5px] font-bold whitespace-nowrap ${
                          idx === 0 ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      >
                        {dateInfo.fullDate || 'Gần đây'}
                      </span>
                      <span className="h-px flex-1 bg-slate-700/80" aria-hidden="true" />
                    </div>

                    {/* Story Portrait Card: Image + Title only */}
                    <Link
                      href={getPostHref(story)}
                      prefetch={false}
                      draggable={false}
                      className="relative block h-[174px] sm:h-[192px] lg:h-[208px] w-full overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-sm transition duration-200 active:scale-[0.98] hover:border-blue-400/80 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-hidden"
                    >
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={story.coverImage?.alt || story.title}
                          fill
                          loading="lazy"
                          draggable={false}
                          unoptimized={
                            coverSrc.startsWith('/api/library/') ||
                            coverSrc.startsWith('/brand/')
                          }
                          sizes="(max-width: 640px) 124px, (max-width: 1024px) 156px, 200px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none pointer-events-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      )}

                      {/* Bottom dark gradient + Article Title */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2 sm:px-2.5 pb-2 sm:pb-2.5 pt-8">
                        <h3 className="text-[11px] sm:text-[12px] font-bold leading-snug text-white line-clamp-3 drop-shadow-xs">
                          {story.title}
                        </h3>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Prev / Next Arrows */}
      <button
        type="button"
        onClick={toggleSlide}
        aria-label="Chuyển banner trước"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900/65 text-white backdrop-blur-xs opacity-0 group-hover/hero-slider:opacity-100 focus-visible:opacity-100 hover:bg-blue-600 hover:border-blue-500 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={toggleSlide}
        aria-label="Chuyển banner tiếp theo"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900/65 text-white backdrop-blur-xs opacity-0 group-hover/hero-slider:opacity-100 focus-visible:opacity-100 hover:bg-blue-600 hover:border-blue-500 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
