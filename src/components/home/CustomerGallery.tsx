'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type GalleryImage = { url: string; alt: string };

export default function CustomerGallery({ title, images }: { title: string; images: GalleryImage[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => {
      setBounds({
        start: el.scrollLeft <= 1,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
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

  return <section className="pb-10" aria-label={title}>
    <div className="container mx-auto max-w-[1370px] px-4">
      <div className="rounded-2xl bg-white p-3 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="mb-4 flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
          <h2 className="max-w-[85%] text-center text-base font-black uppercase text-slate-900 sm:text-xl">{title}</h2>
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="relative">
          <div
            ref={rail}
            tabIndex={0}
            role="region"
            aria-label="Ảnh khách hàng, cuộn ngang để xem thêm"
            className="flex snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto overscroll-x-contain hide-scrollbar p-1 scroll-smooth motion-reduce:scroll-auto rounded-xl focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 focus-visible:outline-hidden"
          >
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={(e) => open(image, e)}
                aria-label={`Phóng to ảnh ${index + 1}: ${image.alt || title}`}
                className="group relative aspect-[4/3] w-[85%] shrink-0 snap-start overflow-hidden rounded-xl border border-slate-300 bg-slate-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 focus-visible:outline-hidden active:scale-[0.98] transition duration-150 sm:w-[calc((100%-12px)/2)] lg:w-[calc((100%-24px)/3)]"
              >
                <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 430px" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none" />
              </button>
            ))}
          </div>
          {images.length > 1 && <>
            <button
              type="button"
              aria-label="Cuộn ảnh về trước"
              disabled={bounds.start}
              onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: 'auto' })}
              className="flex absolute left-1 top-1/2 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-800 shadow-md hover:bg-blue-50 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden cursor-pointer disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Cuộn ảnh tiếp theo"
              disabled={bounds.end}
              onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: 'auto' })}
              className="flex absolute right-1 top-1/2 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-800 shadow-md hover:bg-blue-50 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden cursor-pointer disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>}
        </div>
      </div>
    </div>
    <dialog
      ref={dialog}
      aria-label={selected?.alt || title}
      onClose={() => { setSelected(null); triggerRef.current?.focus(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(1100px,94vw)] max-w-none overflow-auto rounded-xl bg-slate-950 p-4 text-white backdrop:bg-black/80"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{selected?.alt || title}</p>
        <button
          type="button"
          autoFocus
          aria-label="Đóng ảnh"
          onClick={close}
          className="shrink-0 rounded-lg p-2 hover:bg-white/10 active:scale-95 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      {selected && <div className="relative h-[75dvh]"><Image src={selected.url} alt={selected.alt} fill sizes="(max-width: 1170px) 94vw, 1100px" className="object-contain" /></div>}
    </dialog>
  </section>;
}
