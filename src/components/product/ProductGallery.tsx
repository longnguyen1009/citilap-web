'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const prevSelectedImageRef = useRef<string | undefined>(selectedImage);

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

  // Only sync activeIndex when selectedImage actually changes (e.g., user picked a different color/variant)
  useEffect(() => {
    if (selectedImage && selectedImage !== prevSelectedImageRef.current) {
      prevSelectedImageRef.current = selectedImage;
      const idx = normalizedImages.findIndex((img) => img.url === selectedImage);
      if (idx !== -1) {
        setActiveIndex(idx);
      }
    }
  }, [selectedImage, normalizedImages]);

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

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) =>
          prev <= 0 ? normalizedImages.length - 1 : prev - 1
        );
      }
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) =>
          prev >= normalizedImages.length - 1 ? 0 : prev + 1
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, normalizedImages.length]);

  return (
    <div className="flex flex-col">
      {/* Main Image Box */}
      <div
        onClick={() => setLightboxOpen(true)}
        className="group relative flex h-[350px] sm:h-[430px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-6 cursor-zoom-in"
      >
        {/* Top Left Badges */}
        <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap gap-1.5">
          {conditionLabel && (
            <span
              data-testid="hero-condition-label"
              className="rounded-lg bg-[#2563EB] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs"
            >
              {conditionLabel}
            </span>
          )}
          {discount && (
            <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs">
              {discount}
            </span>
          )}
        </div>

        {/* Top Right Stock Pill */}
        <div className="absolute top-3.5 right-3.5 z-10">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Sẵn hàng tại HN &amp; Bắc Ninh
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Đặt trước · Liên hệ kiểm tra kho
            </span>
          )}
        </div>

        {/* Prev / Next Navigation Buttons */}
        {normalizedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-blue-600 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-blue-600 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Main Image (Uniform container size) */}
        <div className="flex h-[250px] sm:h-[330px] w-full max-w-[460px] items-center justify-center">
          <img
            src={activeImg.url}
            alt={activeImg.alt || productName}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Zoom Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          className="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs backdrop-blur transition hover:border-blue-500 hover:text-blue-600 cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Xem ảnh to ({safeActiveIndex + 1}/{normalizedImages.length})
        </button>
      </div>

      {/* Thumbnails Strip */}
      {normalizedImages.length > 1 && (
        <div className="mt-3.5 flex items-center gap-2.5 overflow-x-auto pb-1">
          {normalizedImages.map((img, idx) => {
            const isActive = idx === safeActiveIndex;
            return (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                aria-pressed={isActive}
                className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#2563EB] ring-2 ring-blue-100 opacity-100 shadow-xs'
                    : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-blue-400'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} - ảnh ${idx + 1}`}
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xs"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25 cursor-pointer"
            aria-label="Đóng ảnh phóng to"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 cursor-pointer"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Fixed-dimension stage so every zoomed image scales uniformly */}
            <div className="flex h-[52vh] sm:h-[64vh] max-h-[580px] w-[76vw] sm:w-[620px] md:w-[720px] items-center justify-center overflow-hidden rounded-2xl bg-white p-5 sm:p-8 shadow-2xl">
              <img
                src={activeImg.url}
                alt={activeImg.alt || productName}
                className="h-full w-full object-contain select-none"
              />
            </div>

            {normalizedImages.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 cursor-pointer"
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
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;

