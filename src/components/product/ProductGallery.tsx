"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

export interface GalleryImageItem {
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  variantId?: string | null;
}

interface ProductGalleryProps {
  images: Array<string | GalleryImageItem>;
  productName: string;
  discount?: string;
  selectedImage?: string | null;
}

const PLACEHOLDER_IMAGE = "/images/placeholder-laptop.svg";

export default function ProductGallery({
  images,
  productName,
  discount,
  selectedImage,
}: ProductGalleryProps) {
  // Normalize images to GalleryImageItem array
  const normalizedImages: GalleryImageItem[] = images
    .map((img) => (typeof img === "string" ? { url: img, alt: productName } : img))
    .filter((img) => Boolean(img.url && img.url.trim() !== ""));

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Sync active index if selectedImage from variant is provided
  useEffect(() => {
    if (selectedImage) {
      const idx = normalizedImages.findIndex((img) => img.url === selectedImage);
      if (idx !== -1) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync active image on variant selection
        setActiveIndex(idx);
      }
    }
  }, [selectedImage, normalizedImages]);

  const total = normalizedImages.length;

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, handlePrev, handleNext]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  if (normalizedImages.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-28 h-28 opacity-40 mb-3">
          <Image src={PLACEHOLDER_IMAGE} alt={productName} fill className="object-contain" />
        </div>
        <p className="text-sm font-medium text-gray-500">Hình ảnh đang được cập nhật</p>
      </div>
    );
  }

  const currentImage = normalizedImages[activeIndex] || normalizedImages[0];
  const currentImageUrl = failedImages[activeIndex] ? PLACEHOLDER_IMAGE : currentImage.url;

  return (
    <div className="w-full select-none">
      {/* 1. Main Display Viewport */}
      <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-xl bg-white border border-gray-200 p-4 overflow-hidden group flex items-center justify-center shadow-xs">
        {/* Discount Badge */}
        {discount && (
          <span className="absolute top-3 left-3 z-10 bg-red-600 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-sm tracking-wide">
            {discount}
          </span>
        )}

        {/* Zoom Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label="Phóng to ảnh sản phẩm"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Main Image */}
        <div
          className="relative w-full h-full cursor-zoom-in"
          onClick={() => setIsLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsLightboxOpen(true);
            }
          }}
          aria-label={`Nhấn để phóng to ảnh: ${currentImage.alt || productName}`}
        >
          <Image
            src={currentImageUrl}
            alt={currentImage.alt || productName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            priority={activeIndex === 0}
            onError={() => setFailedImages((prev) => ({ ...prev, [activeIndex]: true }))}
            className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>

        {/* Previous / Next Arrows (visible on hover if > 1 images) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
              aria-label="Ảnh trước đó"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
              aria-label="Ảnh tiếp theo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* 2. Thumbnails List */}
      {total > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label="Danh sách ảnh thu nhỏ">
          {normalizedImages.map((img, idx) => {
            const isSelected = idx === activeIndex;
            const thumbUrl = failedImages[idx] ? PLACEHOLDER_IMAGE : img.url;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg p-1 border-2 transition-all bg-white overflow-hidden ${
                  isSelected
                    ? "border-blue-600 ring-2 ring-blue-600/20 shadow-xs"
                    : "border-gray-200 hover:border-gray-400 opacity-75 hover:opacity-100"
                }`}
                role="tab"
                aria-selected={isSelected}
                aria-label={`Xem ảnh ${idx + 1}/${total}`}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={thumbUrl}
                    alt={img.alt || `Ảnh ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Lightbox Modal */}
      {isLightboxOpen && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Phóng to ảnh ${productName}`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Đóng phóng to ảnh"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Lightbox Content */}
          <div className="relative w-full max-w-4xl h-[70vh] sm:h-[80vh] flex items-center justify-center">
            <Image
              src={currentImageUrl}
              alt={currentImage.alt || productName}
              fill
              sizes="90vw"
              className="object-contain select-none"
            />
          </div>

          {/* Navigation Arrows in Lightbox */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/90 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/25 transition-colors"
                aria-label="Ảnh sau"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image index counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
            {activeIndex + 1} / {total}
          </div>
        </div>
      )}
    </div>
  );
}
