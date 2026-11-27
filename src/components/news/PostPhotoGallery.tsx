'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface PostGalleryImage {
  url: string;
  alt: string;
  thumbnailUrl?: string;
}

export default function PostPhotoGallery({
  images,
  title,
}: {
  images: PostGalleryImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) return null;

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const active = images[safeIndex];

  const prev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setActiveIndex((i) => (i + 1) % images.length);

  return (
    <div className="mb-8 space-y-3">
      {/* Main Active Photo */}
      <div className="group relative aspect-16/10 sm:aspect-16/9 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Phóng to ảnh ${safeIndex + 1} trên ${images.length}`}
          className="relative block w-full h-full cursor-zoom-in focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
        >
          <Image
            src={active.url}
            alt={active.alt || title}
            fill
            priority
            unoptimized={active.url.startsWith('/api/library/') || active.url.startsWith('/brand/')}
            sizes="(max-width: 1024px) 100vw, 800px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        {images.length > 1 && (
          <>
            <span className="absolute top-3 right-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
              {safeIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={prev}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/65 hover:bg-blue-600 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-slate-900/65 hover:bg-blue-600 text-white flex items-center justify-center shadow-md backdrop-blur-xs transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip when multiple photos exist */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {images.map((img, idx) => {
            const thumbSrc = img.thumbnailUrl || img.url;
            const isSelected = idx === safeIndex;
            return (
              <button
                key={`${img.url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative w-20 h-14 sm:w-24 sm:h-16 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600/20'
                    : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-blue-400'
                }`}
              >
                <Image
                  src={thumbSrc}
                  alt={img.alt || `${title} - ảnh ${idx + 1}`}
                  fill
                  loading="lazy"
                  unoptimized={thumbSrc.startsWith('/api/library/') || thumbSrc.startsWith('/brand/')}
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt || title}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl space-y-3"
          >
            <div className="flex items-center justify-between text-white text-xs sm:text-sm">
              <span className="font-semibold truncate pr-4">
                {active.alt || title} ({safeIndex + 1}/{images.length})
              </span>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Đóng xem ảnh"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-[75dvh] w-full rounded-xl overflow-hidden bg-black/40">
              <Image
                src={active.url}
                alt={active.alt || title}
                fill
                unoptimized={active.url.startsWith('/api/library/') || active.url.startsWith('/brand/')}
                sizes="95vw"
                className="object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Ảnh trước"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Ảnh tiếp theo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
