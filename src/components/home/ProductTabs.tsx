'use client';
import { useEffect, useRef, useState, useId } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
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
            className={`min-w-36 flex-1 rounded-t-2xl border-2 px-3 py-4 text-sm font-black uppercase transition sm:text-base lg:text-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${active === index ? 'border-blue-400 border-b-blue-50 bg-blue-50 text-blue-600' : 'border-transparent border-b-blue-400 bg-slate-100 text-sky-600 hover:bg-blue-100'}`}>{t.label}</button>)}
        </div>
        <div role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-tab-${tab.id}`} tabIndex={0} className="rounded-b-2xl border-2 border-blue-400 bg-gradient-to-b from-blue-50 to-white px-3 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6 focus-visible:outline-hidden">
          {tab.products.length ? <ProductCarousel key={tab.id} products={tab.products} label={tab.label} /> : <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-600">{tab.id === 'clearance' ? 'Chưa có sản phẩm xả hàng được công bố.' : `Nhóm ${tab.label} đang cập nhật sản phẩm.`} Xem các nhóm laptop khác để chọn cấu hình phù hợp.</p>}
          <div className="mt-4 text-center"><Link href={tab.href} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold uppercase text-white hover:bg-blue-700 active:scale-95 transition duration-150 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden">Xem {tab.label}<ChevronRight className="h-4 w-4" /></Link></div>
        </div>
      </div>
    </div>
  </section>;
}

export function ProductCarousel({ products, label, oneAtATime = false }: { products: ProductCardProduct[]; label: string; oneAtATime?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [bounds, setBounds] = useState({ start: true, end: false });
  function move(direction: number) {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * ((el.firstElementChild?.getBoundingClientRect().width || 0) + 12), behavior: 'auto' });
  }
  useEffect(() => {
    const root = container.current, el = rail.current;
    if (!root || !el || !autoplay) return;
    let visible = false, touching = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.15 });
    observer.observe(root);
    const down = () => { touching = true; }, up = () => { touching = false; };
    root.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    const timer = setInterval(() => {
      if (!visible || touching || document.hidden || root.matches(':hover, :focus-within') || matchMedia('(prefers-reduced-motion: reduce)').matches || el.scrollWidth <= el.clientWidth + 1) return;
      const left = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 ? 0 : el.scrollLeft + (el.firstElementChild?.getBoundingClientRect().width || 0) + 12;
      el.scrollTo({ left, behavior: 'auto' });
    }, 5000);
    return () => { clearInterval(timer); observer.disconnect(); root.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [autoplay, products]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setBounds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    const observer = new ResizeObserver(update);
    observer.observe(el); el.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener('scroll', update); };
  }, [products]);
  return <div ref={container} className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-1 sm:grid-cols-[36px_minmax(0,1fr)_36px] sm:gap-2">
    <div
      ref={rail}
      tabIndex={0}
      role="region"
      aria-label={`Sản phẩm ${label}`}
      className={`col-start-2 row-start-1 grid ${oneAtATime ? 'auto-cols-[90%] sm:auto-cols-[calc((100%-12px)/2)]' : 'auto-cols-[calc((100%-12px)/2)]'} grid-flow-col gap-3 overflow-x-auto scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory scroll-px-1 hide-scrollbar px-1 pt-2 pb-4 md:auto-cols-[calc((100%-24px)/3)] lg:auto-cols-[calc((100%-48px)/5)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden`}
    >
      {products.map(p => <div key={`${p.id}:${p.variantId || ''}`} className="min-w-0 snap-start"><ProductCard product={p} /></div>)}
    </div>
    <button
      type="button"
      aria-label="Sản phẩm trước"
      disabled={bounds.start}
      onClick={() => move(-1)}
      className="col-start-1 row-start-1 flex h-14 w-full cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
    <button
      type="button"
      aria-label="Sản phẩm tiếp theo"
      disabled={bounds.end}
      onClick={() => move(1)}
      className="col-start-3 row-start-1 flex h-14 w-full cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
    >
      <ChevronRight className="h-6 w-6" />
    </button>
    <button type="button" aria-label={autoplay ? 'Tạm dừng tự cuộn sản phẩm' : 'Bật tự cuộn sản phẩm'} aria-pressed={!autoplay} onClick={() => setAutoplay(value => !value)} className="col-start-2 justify-self-end rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600">
      {autoplay ? <Pause aria-hidden="true" className="mr-1 inline h-3 w-3" /> : <Play aria-hidden="true" className="mr-1 inline h-3 w-3" />}{autoplay ? 'Tạm dừng' : 'Tự cuộn'}
    </button>
  </div>;
}
