'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type GalleryImage = { url: string; alt: string };

export default function CustomerGallery({ title, images }: { title: string; images: GalleryImage[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  function open(image: GalleryImage) {
    setSelected(image);
    dialog.current?.showModal();
  }

  return <section className="pb-10" aria-label={title}>
    <div className="container mx-auto max-w-[1370px] px-4">
      <div className="rounded-2xl bg-white p-3 sm:p-5">
        <div className="mb-4 flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
          <h2 className="max-w-[85%] text-center text-base font-black uppercase text-slate-900 sm:text-xl">{title}</h2>
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="relative">
          <div ref={rail} tabIndex={0} role="region" aria-label="Ảnh khách hàng, cuộn ngang để xem thêm" className="flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-2 focus-visible:outline-blue-600">
            {images.map((image, index) => <button key={`${image.url}-${index}`} type="button" onClick={() => open(image)} aria-label={`Phóng to ảnh ${index + 1}: ${image.alt || title}`} className="relative h-40 w-40 shrink-0 snap-start overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:h-48 sm:w-48">
              <Image src={image.url} alt={image.alt} fill sizes="192px" className="object-cover transition hover:scale-105" />
            </button>)}
          </div>
          {images.length > 1 && <>
            <button type="button" aria-label="Cuộn ảnh về trước" onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: 'smooth' })} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-lg bg-white/95 px-1 py-3 text-slate-800 shadow"><ChevronLeft className="h-6 w-6" /></button>
            <button type="button" aria-label="Cuộn ảnh tiếp theo" onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: 'smooth' })} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg bg-white/95 px-1 py-3 text-slate-800 shadow"><ChevronRight className="h-6 w-6" /></button>
          </>}
        </div>
      </div>
    </div>
    <dialog ref={dialog} aria-label={selected?.alt || title} onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="fixed inset-0 m-auto max-h-[94dvh] w-[min(1100px,94vw)] max-w-none overflow-auto rounded-xl bg-slate-950 p-3 text-white backdrop:bg-black/80">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm">{selected?.alt || title}</p>
        <button type="button" autoFocus aria-label="Đóng ảnh" onClick={() => dialog.current?.close()} className="shrink-0 rounded-lg p-2 hover:bg-white/10"><X className="h-6 w-6" /></button>
      </div>
      {selected && <div className="relative h-[75dvh]"><Image src={selected.url} alt={selected.alt} fill sizes="(max-width: 1170px) 94vw, 1100px" className="object-contain" /></div>}
    </dialog>
  </section>;
}
