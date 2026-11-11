'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

type GalleryImage = { url: string; alt: string; href?: string; enabled?: boolean };

export default function CustomerGallery({
  title,
  subtitle,
  limit,
  images,
}: {
  title: string;
  subtitle?: string;
  limit?: number;
  images: GalleryImage[];
}) {
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });

  // Render exactly what admin configured (skip disabled or empty URLs)
  const enabledImages = images.filter((img) => Boolean(img?.url?.trim()) && img.enabled !== false);
  const uniqueImages = limit && limit > 0 ? enabledImages.slice(0, limit) : enabledImages;

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft <= 1;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
      setBounds((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [images]);

  function open(image: GalleryImage, event?: React.MouseEvent) {
    triggerRef.current = (event?.currentTarget as HTMLElement) || null;
    setSelected(image);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
    setSelected(null);
    triggerRef.current?.focus();
  }

  const scrollByAmount = (direction: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.6));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return <section className="py-4 md:py-6 lg:py-8" aria-label={title}>
    <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
      <div className="rounded-xl lg:rounded-2xl bg-white p-3 md:p-5 shadow-xs border border-slate-200/80">
        <div className="mb-3 md:mb-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
            <h2 className="max-w-[85%] text-center text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase tracking-tight text-slate-900 leading-snug">{title}</h2>
            <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
          </div>
          {subtitle && <p className="text-center text-[12px] md:text-[13px] text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="relative">
          <div
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label="Ảnh khách hàng, cuộn ngang để xem thêm"
            className="flex snap-x snap-mandatory scroll-px-1 gap-2.5 md:gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar p-1 scroll-smooth motion-reduce:scroll-auto rounded-xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 focus-visible:outline-hidden"
          >
            {uniqueImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={(e) => open(image, e)}
                aria-label={`Phóng to ảnh ${index + 1}: ${image.alt || title}`}
                className="group relative aspect-[16/10] w-[75%] shrink-0 snap-start overflow-hidden rounded-lg lg:rounded-xl border border-slate-200 bg-slate-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 focus-visible:outline-hidden active:scale-[0.98] transition duration-150 sm:w-[calc((100%-12px)/2)] md:w-[calc((100%-24px)/3)] lg:w-[calc((100%-36px)/4)] xl:w-[calc((100%-48px)/5)]"
              >
                <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 75vw, (max-width: 1024px) 33vw, 260px" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
              </button>
            ))}
          </div>
          {uniqueImages.length > 1 && <>
            <button
              type="button"
              aria-label="Cuộn ảnh về trước"
              disabled={bounds.start}
              onClick={() => scrollByAmount(-1)}
              className="flex absolute -left-2 top-1/2 min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden cursor-pointer disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Cuộn ảnh tiếp theo"
              disabled={bounds.end}
              onClick={() => scrollByAmount(1)}
              className="flex absolute -right-2 top-1/2 min-h-11 min-w-11 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-900 shadow-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden cursor-pointer disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>}
        </div>
      </div>
    </div>
    <dialog
      ref={dialog}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-label={selected?.alt || title}
      onClose={() => { setSelected(null); triggerRef.current?.focus(); }}
      onClick={event => {
        if (event.target !== event.currentTarget || !dialog.current) return;
        const rect = dialog.current.getBoundingClientRect();
        const inBox =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!inBox) close();
      }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(1100px,94vw)] max-w-none overflow-auto rounded-xl bg-slate-950 p-4 text-white backdrop:bg-black/80"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">{selected?.alt || title}</p>
          {selected?.href && (
            <Link
              href={selected.href}
              onClick={close}
              className="min-h-11 inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              Xem liên kết <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <button
          type="button"
          autoFocus
          aria-label="Đóng ảnh"
          onClick={close}
          className="min-h-11 min-w-11 inline-flex items-center justify-center shrink-0 rounded-lg p-2 hover:bg-white/10 active:scale-95 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      {selected && <div className="relative h-[75dvh]"><Image src={selected.url} alt={selected.alt} fill sizes="(max-width: 1170px) 94vw, 1100px" className="object-contain" /></div>}
    </dialog>
  </section>;
}
