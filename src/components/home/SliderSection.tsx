'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SlideItem {
  id: string;
  title: string;
  subtitle?: string;
  mobileTitle?: string;
  mobileSubtitle?: string;
  badge?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  buttonText?: string;
}

export interface SliderSectionData {
  autoplay?: boolean;
  intervalSec?: number;
  slides?: SlideItem[];
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(callback);
    return () => mediaQuery.removeListener(callback);
  }
  return () => {};
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function SliderSection({ data }: { data: SliderSectionData }) {
  const slides = Array.isArray(data.slides) && data.slides.length > 0 ? data.slides : [];
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDistance = useRef(0);
  const isHorizontalDrag = useRef(false);
  const suppressClick = useRef(false);
  const activePointerId = useRef<number | null>(null);

  const total = slides.length;
  const autoplay = data.autoplay ?? true;
  const intervalSec = Math.max(2, Math.min(20, data.intervalSec ?? 5));
  const isPaused = isHovered || isFocused;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrent((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrent((prev) => (prev - 1 + total) % total);
  }, [total]);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Autoplay effect - pauses when hovered OR focused OR dragging OR reduced motion is active
  useEffect(() => {
    if (!autoplay || total <= 1 || isPaused || isDragging || prefersReducedMotion) {
      return;
    }

    const timer = setInterval(nextSlide, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [autoplay, total, isPaused, isDragging, prefersReducedMotion, intervalSec, nextSlide]);

  if (total === 0) return null;

  const resetGesture = (target?: HTMLDivElement, pointerId = activePointerId.current) => {
    dragStartX.current = null;
    dragStartY.current = null;
    dragDistance.current = 0;
    isHorizontalDrag.current = false;
    activePointerId.current = null;
    setIsDragging(false);

    if (target && pointerId !== null) {
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch {
        // Ignore
      }
    }

    // Keep click suppression active briefly to prevent synthetic click from opening links
    if (suppressClick.current) {
      setTimeout(() => {
        suppressClick.current = false;
      }, 150);
    }
  };

  // Pointer drag gestures with pointer capture and mobile scroll protection
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;

    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragDistance.current = 0;
    isHorizontalDrag.current = false;
    suppressClick.current = false;
    activePointerId.current = e.pointerId;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if element is not capture-ready
    }
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || activePointerId.current !== e.pointerId || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);

    // If gesture is predominantly vertical, cancel drag immediately to let mobile scroll smoothly
    if (!isHorizontalDrag.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
      resetGesture(e.currentTarget, e.pointerId);
      return;
    }

    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      isHorizontalDrag.current = true;
      suppressClick.current = true;
    }
    dragDistance.current = dx;
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || activePointerId.current !== e.pointerId || dragStartX.current === null) return;
    const distance = dragDistance.current;
    const shouldAdvance = isHorizontalDrag.current && Math.abs(distance) > 40;

    resetGesture(e.currentTarget, e.pointerId);

    if (shouldAdvance) {
      if (distance > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    resetGesture(e.currentTarget, e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  const activeSlide = slides[current];
  const activeHasLink = Boolean(activeSlide?.link && activeSlide.link.trim());

  return (
    <section
      className="py-6 bg-slate-900 overflow-hidden"
      aria-label="Slider quảng cáo"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
    >
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div
          ref={containerRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Banner quảng cáo nổi bật"
          onKeyDown={handleKeyDown}
          className={`relative rounded-2xl overflow-hidden shadow-lg border border-slate-800 select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 ${
            total > 1
              ? isDragging
                ? 'cursor-grabbing'
                : activeHasLink
                ? 'cursor-pointer'
                : 'cursor-grab'
              : activeHasLink
              ? 'cursor-pointer'
              : 'cursor-default'
          }`}
          onPointerDown={total > 1 ? handlePointerDown : undefined}
          onPointerMove={total > 1 ? handlePointerMove : undefined}
          onPointerUp={total > 1 ? handlePointerEnd : undefined}
          onPointerCancel={total > 1 ? handlePointerCancel : undefined}
          onLostPointerCapture={total > 1 ? handlePointerCancel : undefined}
          style={{ touchAction: 'pan-y pinch-zoom' }}
        >
          {/* Slides track */}
          <div className="relative h-56 sm:h-72 md:h-88 lg:h-96 w-full">
            {slides.map((slide, idx) => {
              const isActive = idx === current;
              const hasLink = Boolean(slide.link && slide.link.trim());
              const slideKey = slide.id || `slide-${idx}`;
              const isImageBroken = Boolean(imageErrors[slideKey]);

              return (
                <div
                  key={slideKey}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                    isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* Whole slide clickable overlay if link exists */}
                  {hasLink && (
                    <Link
                      href={slide.link!}
                      aria-label={slide.title || 'Xem chi tiết'}
                      tabIndex={isActive ? 0 : -1}
                      onClick={(e) => {
                        if (suppressClick.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="absolute inset-0 z-[5] cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset"
                    />
                  )}

                  {!isImageBroken && slide.imageUrl ? (() => {
                    const mobileSlideImg =
                      slide.mobileImageUrl?.trim() ||
                      (slide.imageUrl === '/brand/citilap-hero.webp' || slide.imageUrl === '/brand/marketing-banner.webp'
                        ? '/brand/citilap-hero-mobile.webp'
                        : '');
                    const hasSeparateMobileSlide = Boolean(mobileSlideImg && mobileSlideImg !== slide.imageUrl);
                    return (
                      <>
                        {hasSeparateMobileSlide && (
                          <Image
                            src={mobileSlideImg}
                            alt={slide.mobileTitle || slide.title || 'Slide quảng cáo'}
                            width={800}
                            height={540}
                            priority={idx === 0}
                            fetchPriority={idx === 0 ? 'high' : 'low'}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            unoptimized={mobileSlideImg.startsWith('/brand/')}
                            className="sm:hidden absolute inset-0 w-full h-full object-cover object-right"
                            sizes="100vw"
                            onError={() => setImageErrors((prev) => ({ ...prev, [slideKey]: true }))}
                          />
                        )}
                        <Image
                          src={slide.imageUrl}
                          alt={slide.title || 'Slide quảng cáo'}
                          width={1920}
                          height={600}
                          priority={idx === 0}
                          fetchPriority={idx === 0 ? 'high' : 'low'}
                          loading={idx === 0 ? 'eager' : 'lazy'}
                          unoptimized={slide.imageUrl.startsWith('/brand/')}
                          className={`${hasSeparateMobileSlide ? 'hidden sm:block ' : ''}absolute inset-0 w-full h-full object-cover`}
                          sizes="(max-width: 768px) 100vw, 1370px"
                          onError={() => setImageErrors((prev) => ({ ...prev, [slideKey]: true }))}
                        />
                      </>
                    );
                  })() : (
                    <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-slate-500">
                      <div className="text-center p-4">
                        <p className="text-xs sm:text-sm font-semibold">{slide.title || 'Hình ảnh đang cập nhật'}</p>
                      </div>
                    </div>
                  )}

                  {/* Gradient backdrop for readable typography */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-5 sm:p-10 text-white z-[6] pointer-events-none">
                    <div className="max-w-2xl">
                      {slide.badge && (
                        <span className="inline-block px-2.5 sm:px-3 py-1 mb-2 sm:mb-2.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {slide.badge}
                        </span>
                      )}
                      <h3 className="font-black text-lg sm:text-3xl md:text-4xl drop-shadow-md tracking-tight leading-tight">
                        {slide.mobileTitle ? (
                          <>
                            <span className="sm:hidden">{slide.mobileTitle}</span>
                            <span className="hidden sm:inline">{slide.title}</span>
                          </>
                        ) : (
                          slide.title
                        )}
                      </h3>
                      {(slide.subtitle || slide.mobileSubtitle) && (
                        <p className="text-xs sm:text-base text-slate-200 mt-1 sm:mt-2 line-clamp-2 leading-relaxed">
                          {slide.mobileSubtitle ? (
                            <>
                              <span className="sm:hidden">{slide.mobileSubtitle}</span>
                              <span className="hidden sm:inline">{slide.subtitle}</span>
                            </>
                          ) : (
                            slide.subtitle
                          )}
                        </p>
                      )}

                      {hasLink && (
                        <div className="mt-4 pointer-events-auto">
                          <Link
                            href={slide.link!}
                            tabIndex={isActive ? 0 : -1}
                            onClick={(e) => {
                              if (suppressClick.current) {
                                e.preventDefault();
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                          >
                            <span>{slide.buttonText || 'Xem ngay'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation arrows (Only if more than 1 slide) */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Slide trước"
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 active:scale-95 text-white flex items-center justify-center transition backdrop-blur-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Slide tiếp theo"
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 active:scale-95 text-white flex items-center justify-center transition backdrop-blur-xs focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dots / Pagination with generous hit areas (32x32px) and small visual dots */}
              <nav
                className="absolute bottom-3 sm:bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-1 pointer-events-auto"
                aria-label="Điều hướng slide"
              >
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-current={idx === current ? 'true' : undefined}
                    aria-label={`Chuyển đến slide ${idx + 1}`}
                    onClick={() => setCurrent(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-full group cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    <span
                      className={`h-2 rounded-full transition-all duration-200 ${
                        idx === current
                          ? 'w-6 bg-blue-500 shadow-xs'
                          : 'w-2 bg-white/50 group-hover:bg-white/80'
                      }`}
                    />
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
