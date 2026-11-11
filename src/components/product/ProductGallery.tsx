'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface GalleryImageItem {
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  variantId?: string | null;
}

interface ProductGalleryProps {
  productName: string;
  conditionLabel?: string;
  discount?: string;
  inStock?: boolean;
  images: (string | GalleryImageItem)[];
  selectedImage?: string;
}

export function ProductGallery({
  productName,
  conditionLabel,
  discount,
  inStock = true,
  images,
  selectedImage,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, images.filter(item => typeof item === 'string' ? item : item.url).findIndex(item => (typeof item === 'string' ? item : item.url) === selectedImage)));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previousImage, setPreviousImage] = useState(selectedImage);
  const touchStartRef = useRef<{ x: number; y: number; multi: boolean } | null>(null);
  const swipedRef = useRef(false);
  const swipeTimeRef = useRef(0);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const zoomButtonRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Memoize normalized images so array reference stays stable across re-renders
  const normalizedImages: GalleryImageItem[] = useMemo(() => {
    const list = images
      .map((item) => {
        if (typeof item === 'string') {
          return { url: item, alt: productName };
        }
        return { url: item.url, alt: item.alt || productName };
      })
      .filter((item) => Boolean(item.url));

    if (list.length === 0) {
      return [{ url: '/images/placeholder-laptop.svg', alt: productName }];
    }
    return list;
  }, [images, productName]);

  if (selectedImage !== previousImage) {
    setPreviousImage(selectedImage);
    const index = normalizedImages.findIndex(img => img.url === selectedImage);
    setActiveIndex(Math.max(0, index));
  }

  // Ensure activeIndex stays within bounds if image list changes
  const safeActiveIndex =
    activeIndex >= 0 && activeIndex < normalizedImages.length ? activeIndex : 0;
  const activeImg = normalizedImages[safeActiveIndex] || {
    url: '/images/placeholder-laptop.svg',
    alt: productName,
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) =>
      prev <= 0 ? normalizedImages.length - 1 : prev - 1
    );
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) =>
      prev >= normalizedImages.length - 1 ? 0 : prev + 1
    );
  };

  const consumeSuppressedClick = () => {
    if (swipedRef.current && performance.now() - swipeTimeRef.current < 400) {
      swipedRef.current = false;
      return true;
    }
    swipedRef.current = false;
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    swipedRef.current = false;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      multi: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    if (e.touches.length > 1) {
      start.multi = true;
      return;
    }
    const deltaX = e.touches[0].clientX - start.x;
    const deltaY = e.touches[0].clientY - start.y;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      swipedRef.current = true;
      swipeTimeRef.current = performance.now();
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || start.multi || e.touches.length > 0 || e.changedTouches.length === 0) {
      return;
    }
    const deltaX = e.changedTouches[0].clientX - start.x;
    const deltaY = e.changedTouches[0].clientY - start.y;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      swipedRef.current = true;
      swipeTimeRef.current = performance.now();
    }
    if (
      normalizedImages.length > 1 &&
      Math.abs(deltaX) > 40 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.5
    ) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
  };

  useEffect(() => {
    const thumb = thumbRefs.current[safeActiveIndex];
    const rail = thumb?.parentElement;
    if (!thumb || !rail) return;
    const thumbRect = thumb.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    const delta =
      thumbRect.left < railRect.left
        ? thumbRect.left - railRect.left
        : thumbRect.right > railRect.right
          ? thumbRect.right - railRect.right
          : 0;
    if (delta !== 0) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rail.scrollBy({
        left: delta,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [safeActiveIndex]);

  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (!lightboxOpen) {
      if (node?.open) node.close();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const active = document.activeElement as HTMLElement | null;
    const opener =
      openerRef.current ||
      (active && active !== document.body && !node?.contains(active)
        ? active
        : zoomButtonRef.current);

    if (node && !node.open) {
      node.showModal();
    }

    return () => {
      if (node?.open) node.close();
      document.body.style.overflow = previousOverflow;
      if (opener && window.getComputedStyle(opener).display !== 'none') {
        opener.focus();
      }
    };
  }, [lightboxOpen]);

  return (
    <div className="flex flex-col">
      {/* Main Image Box */}
      <div
        onClick={() => {
          if (consumeSuppressedClick()) return;
          openerRef.current = zoomButtonRef.current;
          setLightboxOpen(true);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="group relative flex h-[290px] sm:h-[430px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white p-3 pt-11 sm:p-6 cursor-zoom-in touch-pan-y touch-pinch-zoom select-none"
      >
        {/* Top Badges Bar (Single non-overlapping row on mobile & desktop) */}
        <div className="absolute top-2.5 inset-x-2.5 sm:top-3.5 sm:inset-x-3.5 z-10 flex items-start justify-between gap-1.5 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {conditionLabel && (
              <span
                data-testid="hero-condition-label"
                className="rounded-lg bg-[#2563EB] px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white shadow-xs truncate max-w-[165px] sm:max-w-none"
              >
                {conditionLabel}
              </span>
            )}
            {discount && (
              <span className="rounded-lg bg-rose-600 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-white shadow-xs shrink-0">
                {discount}
              </span>
            )}
          </div>

          <div className="shrink-0">
            {inStock ? (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/95 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-emerald-700 shadow-2xs">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="sm:hidden">Sẵn hàng HN &amp; BN</span>
                <span className="hidden sm:inline">Sẵn hàng tại HN &amp; Bắc Ninh</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-amber-200 bg-amber-50/95 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-amber-700 shadow-2xs">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 shrink-0" />
                <span className="sm:hidden">Đặt trước · Liên hệ</span>
                <span className="hidden sm:inline">Đặt trước · Liên hệ kiểm tra kho</span>
              </span>
            )}
          </div>
        </div>

        {/* Prev / Next Navigation Buttons */}
        {normalizedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 active:scale-95 transition hover:bg-white hover:text-blue-600 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 active:scale-95 transition hover:bg-white hover:text-blue-600 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Main Image (Uniform container size) */}
        <div className="relative flex h-[215px] sm:h-[330px] w-full max-w-[460px] items-center justify-center">
          {activeImg.url.startsWith('/api/library/') ? (
            <Image
              src={activeImg.url}
              alt={activeImg.alt || productName}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) calc(100vw - 32px), 460px"
              style={{ objectFit: 'contain' }}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <img
              src={activeImg.url}
              alt={activeImg.alt || productName}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>

        {/* Zoom Button */}
        <button
          ref={zoomButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openerRef.current = e.currentTarget;
            setLightboxOpen(true);
          }}
          className="absolute bottom-2 right-2 sm:bottom-3.5 sm:right-3.5 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 sm:bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs backdrop-blur-xs transition hover:border-blue-500 hover:text-blue-600 active:scale-95 cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="sm:hidden">Phóng to</span>
            <span className="hidden sm:inline">Xem ảnh to</span>
            {normalizedImages.length > 1
              ? ` (${safeActiveIndex + 1}/${normalizedImages.length})`
              : ""}
          </span>
        </button>
      </div>

      {/* Thumbnails Strip */}
      {normalizedImages.length > 1 && (
        <div className="mt-3 flex items-center gap-2 sm:gap-2.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory hide-scrollbar pb-1">
          {normalizedImages.map((img, idx) => {
            const isActive = idx === safeActiveIndex;
            const thumbUrl =
              img.url.startsWith('/api/library/') && !img.url.includes('?')
                ? `${img.url}?size=thumb&v=2`
                : img.url;
            return (
              <button
                key={`${img.url}-${idx}`}
                ref={(el) => {
                  thumbRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => {
                  if (img.url !== thumbUrl && typeof window !== 'undefined') {
                    const preloader = new window.Image();
                    preloader.src = img.url;
                  }
                }}
                aria-label={`Xem ảnh ${idx + 1}`}
                aria-pressed={isActive}
                className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#2563EB] ring-2 ring-blue-100 opacity-100 shadow-xs'
                    : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-blue-400'
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={img.alt || `${productName} - ảnh ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <dialog
          ref={dialogRef}
          aria-modal="true"
          aria-label={`Ảnh phóng to: ${productName}`}
          onCancel={(e) => {
            e.preventDefault();
            setLightboxOpen(false);
          }}
          onClose={() => {
            if (lightboxOpen) setLightboxOpen(false);
          }}
          onKeyDown={(e) => {
            if (normalizedImages.length <= 1) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              handlePrev();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              handleNext();
            }
          }}
          onClick={() => {
            if (consumeSuppressedClick()) return;
            setLightboxOpen(false);
          }}
          className="fixed inset-0 z-50 m-0 h-dvh max-h-none w-full max-w-none flex-col items-center justify-center bg-slate-950/90 p-2 sm:p-4 backdrop-blur-xs overscroll-contain open:flex backdrop:bg-transparent"
        >
          <button
            autoFocus
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 cursor-pointer"
            aria-label="Đóng ảnh phóng to"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="relative flex w-full max-w-[880px] items-center justify-center gap-1.5 sm:gap-3">
            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 cursor-pointer"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Fixed-dimension stage so every zoomed image scales uniformly */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                consumeSuppressedClick();
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              className="flex flex-col h-[min(58dvh,calc(100dvh-9rem))] sm:h-[min(68dvh,calc(100dvh-9rem))] max-h-[640px] min-w-0 flex-1 max-w-[760px] items-center justify-between overflow-hidden rounded-2xl bg-white p-3 sm:p-6 shadow-2xl touch-pan-y touch-pinch-zoom"
            >
              <div className="flex-1 w-full min-h-0 flex items-center justify-center p-2">
                <img
                  src={activeImg.url}
                  alt={activeImg.alt || productName}
                  className="h-full w-full object-contain select-none"
                />
              </div>

              {/* Image Caption / Title (ALT) */}
              <div className="w-full pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 text-left">
                  {activeImg.alt || productName}
                </p>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold shrink-0">
                  {safeActiveIndex + 1} / {normalizedImages.length}
                </span>
              </div>
            </div>

            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 cursor-pointer"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {normalizedImages.length > 1 && (
            <div
              className="mt-4 flex items-center gap-2 overflow-x-auto max-w-full px-4 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              {normalizedImages.map((img, idx) => (
                <button
                  key={`lb-${img.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition cursor-pointer ${
                    idx === safeActiveIndex
                      ? 'border-blue-500 ring-2 ring-blue-400 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.alt || `${productName} - ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </dialog>
      )}
    </div>
  );
}

export default ProductGallery;

