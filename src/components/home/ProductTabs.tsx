'use client';
import { useEffect, useRef, useState, useId } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard';

type Tab = { id: string; label: string; href: string; products: ProductCardProduct[] };
export default function ProductTabs({ title, tabs }: { title: string; tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  const prefix = useId();
  const tab = tabs[active];
  if (!tab) return null;
  function select(index: number) { setActive(index); document.getElementById(`${prefix}-tab-${tabs[index].id}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
  return <section className="pb-10" aria-label={title}>
    <div className="container mx-auto max-w-[1370px] px-4">
      <div>
        <div role="tablist" aria-label={title} className="relative z-10 -mb-0.5 flex overflow-x-auto hide-scrollbar">
          {tabs.map((t, index) => <button key={t.id} id={`${prefix}-tab-${t.id}`} role="tab" type="button" aria-selected={active === index} aria-controls={`${prefix}-panel`} tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)} onKeyDown={e => {
              const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
              if (next >= 0) { e.preventDefault(); select(next); document.getElementById(`${prefix}-tab-${tabs[next].id}`)?.focus(); }
            }}
            className={`min-w-36 flex-1 rounded-t-2xl border-2 px-3 py-4 text-sm font-black uppercase transition sm:text-base lg:text-xl ${active === index ? 'border-blue-400 border-b-blue-50 bg-blue-50 text-blue-600' : 'border-transparent border-b-blue-400 bg-slate-100 text-sky-600 hover:bg-blue-100'}`}>{t.label}</button>)}
        </div>
        <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${tab.id}`} tabIndex={0} className="rounded-b-2xl border-2 border-blue-400 bg-gradient-to-b from-blue-50 to-white px-3 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6">
          {tab.products.length ? <ProductCarousel key={tab.id} products={tab.products} label={tab.label} /> : <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-600">{tab.id === 'clearance' ? 'Chưa có sản phẩm xả hàng được công bố.' : `Nhóm ${tab.label} đang cập nhật sản phẩm.`} Xem các nhóm laptop khác để chọn cấu hình phù hợp.</p>}
          <div className="mt-4 text-center"><Link href={tab.href} className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold uppercase text-white hover:bg-red-700">Xem {tab.label}<ChevronRight className="h-4 w-4" /></Link></div>
        </div>
      </div>
    </div>
  </section>;
}

export function ProductCarousel({ products, label }: { products: ProductCardProduct[]; label: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setBounds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    const observer = new ResizeObserver(update);
    observer.observe(el); el.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener('scroll', update); };
  }, [products]);
  return <div className="relative">
    <div ref={rail} className="grid auto-cols-[calc((100%-12px)/2)] grid-flow-col gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-3 md:auto-cols-[calc((100%-24px)/3)] lg:auto-cols-[calc((100%-48px)/5)]" aria-label={`Sản phẩm ${label}`}>
      {products.map(p => <div key={p.id} className="min-w-0 snap-start"><ProductCard product={p} /></div>)}
    </div>
    <button type="button" aria-label="Sản phẩm trước" disabled={bounds.start} onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: 'smooth' })} className="absolute left-0 top-1/2 flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-r-full bg-white/95 text-slate-800 shadow-lg transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"><ChevronLeft className="h-7 w-7" /></button>
    <button type="button" aria-label="Sản phẩm tiếp theo" disabled={bounds.end} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: 'smooth' })} className="absolute right-0 top-1/2 flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-l-full bg-white/95 text-slate-800 shadow-lg transition hover:bg-white disabled:pointer-events-none disabled:opacity-0"><ChevronRight className="h-7 w-7" /></button>
  </div>;
}
