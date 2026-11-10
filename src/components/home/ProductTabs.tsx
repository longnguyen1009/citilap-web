'use client';
import { useEffect, useRef, useState, useId } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard';

type Tab = {
  id: string;
  label: string;
  href: string;
  deviceVisibility?: 'all' | 'desktop' | 'mobile';
  limit?: number;
  mobileLimit?: number | null;
  enabled?: boolean;
  products: ProductCardProduct[];
};

function normalizeTabHref(tab: Tab): string {
  if (tab.href === '/search?sort=newest') return '/search?category=laptop&sort=newest';
  if (tab.href === '/search?condition=NEW') return '/search?category=laptop-moi';
  if (tab.href === '/search?condition=LIKE_NEW') return '/search?category=laptop-likenew';
  return tab.href;
}

export default function ProductTabs({
  title,
  subtitle,
  tabs: rawTabs,
  eagerImages = false,
}: {
  title: string;
  subtitle?: string;
  tabs: Tab[];
  eagerImages?: boolean;
}) {
  const tabs = rawTabs.filter((t) => t.enabled !== false);
  const [active, setActive] = useState(0);
  const prefix = useId();
  const safeIndex = active < tabs.length ? active : 0;
  const rawTab = tabs[safeIndex];
  if (!rawTab) return null;
  const isLaptopTab =
    ['new-arrivals', 'new', 'new-laptops', 'like-new', 'likenew', 'clearance'].includes(rawTab.id) ||
    /laptop/i.test(rawTab.label);
  const filteredProducts = isLaptopTab
    ? rawTab.products.filter((p) => p.template !== 'ACCESSORY' && !p.href?.startsWith('/phu-kien/'))
    : rawTab.products;
  const tab = {
    ...rawTab,
    href: normalizeTabHref(rawTab),
    products: rawTab.limit && rawTab.limit > 0 ? filteredProducts.slice(0, rawTab.limit) : filteredProducts,
  };
  function select(index: number) {
    setActive(index);
    document
      .getElementById(`${prefix}-tab-${tabs[index].id}`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={title}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        {subtitle && (
          <div className="mb-2.5 md:mb-3.5">
            <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase text-slate-900 leading-snug">{title}</h2>
            <p className="text-[12px] md:text-[13px] text-slate-600 mt-0.5">{subtitle}</p>
          </div>
        )}
        <div>
          <div role="tablist" aria-label={title} className="relative z-10 -mb-0.5 flex gap-1 md:gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar">
            {tabs.map((t, index) => {
              const visCls =
                t.deviceVisibility === 'desktop'
                  ? 'hidden md:inline-flex'
                  : t.deviceVisibility === 'mobile'
                    ? 'md:hidden'
                    : 'inline-flex';
              return (
                <button
                  key={t.id}
                  id={`${prefix}-tab-${t.id}`}
                  role="tab"
                  type="button"
                  aria-selected={safeIndex === index}
                  aria-controls={`${prefix}-panel`}
                  tabIndex={safeIndex === index ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={(e) => {
                    const next =
                      e.key === 'ArrowRight'
                        ? (index + 1) % tabs.length
                        : e.key === 'ArrowLeft'
                          ? (index - 1 + tabs.length) % tabs.length
                          : e.key === 'Home'
                            ? 0
                            : e.key === 'End'
                              ? tabs.length - 1
                              : -1;
                    if (next >= 0) {
                      e.preventDefault();
                      select(next);
                      document.getElementById(`${prefix}-tab-${tabs[next].id}`)?.focus();
                    }
                  }}
                  className={`${visCls} min-h-11 flex-1 shrink-0 items-center justify-center rounded-t-xl md:rounded-t-2xl border-2 px-2.5 md:px-4 py-1.5 md:py-2.5 text-[12px] md:text-[14px] lg:text-[16px] font-black uppercase whitespace-nowrap transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${
                    safeIndex === index
                      ? 'border-blue-500 border-b-blue-50 bg-blue-50 text-blue-700 shadow-2xs'
                      : 'border-slate-200/90 border-b-blue-500 bg-white text-slate-700 hover:bg-blue-50/60 hover:text-blue-700'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div
            role="tabpanel"
            id={`${prefix}-panel`}
            aria-labelledby={`${prefix}-tab-${tab.id}`}
            tabIndex={0}
            className="rounded-b-xl md:rounded-b-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-50 via-white to-white px-2.5 pb-3.5 pt-3 md:px-5 md:pb-5 md:pt-5 shadow-xs focus-visible:outline-hidden"
          >
            {tab.products.length ? (
              <ProductCarousel
                key={tab.id}
                products={tab.products}
                label={tab.label}
                mobileLimit={tab.mobileLimit}
                eagerImages={eagerImages}
              />
            ) : (
              <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-slate-600">
                {tab.id === 'clearance'
                  ? 'Chưa có sản phẩm xả hàng được công bố.'
                  : `Nhóm ${tab.label} đang cập nhật sản phẩm.`}{' '}
                Xem các nhóm laptop khác để chọn cấu hình phù hợp.
              </p>
            )}
            {tab.href && (
              <div className="mt-3 md:mt-4 text-center">
                <Link
                  href={tab.href}
                  className="min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 md:px-6 py-2.5 text-[12px] md:text-[14px] font-bold uppercase text-white hover:bg-blue-700 active:scale-95 transition duration-150 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                >
                  Xem {tab.label}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductCarousel({
  products,
  label,
  oneAtATime = false,
  mobileLimit = null,
  eagerImages = false,
  cardVariant = 'default',
}: {
  products: ProductCardProduct[];
  label: string;
  oneAtATime?: boolean;
  mobileLimit?: number | null;
  eagerImages?: boolean;
  cardVariant?: 'default' | 'flash';
}) {
  const isFlash = cardVariant === 'flash';
  const container = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [bounds, setBounds] = useState({ start: true, end: false });
  const getStep = (el: HTMLElement) => (el.firstElementChild?.getBoundingClientRect().width || 0) + (parseFloat(getComputedStyle(el).columnGap) || 0);
  function move(direction: number) {
    const el = rail.current;
    if (!el) return;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: direction * getStep(el), behavior });
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
      const left = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 ? 0 : el.scrollLeft + getStep(el);
      el.scrollTo({ left, behavior: 'smooth' });
    }, 5000);
    return () => { clearInterval(timer); observer.disconnect(); root.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [autoplay, products]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => {
      const start = el.scrollLeft <= 1, end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      setBounds(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el); el.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); el.removeEventListener('scroll', update); };
  }, [products]);
  const spColsClass = isFlash
    ? 'auto-cols-[calc((100%-16px)/2.3)] gap-2'
    : oneAtATime
      ? 'auto-cols-[calc((100%-10px)/2)] gap-2.5'
      : 'auto-cols-[calc((100%-10px)/2)] gap-2.5';
  return <div ref={container} className="grid grid-cols-1 md:grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1 md:gap-2">
    <div
      ref={rail}
      tabIndex={0}
      role="region"
      aria-label={`Sản phẩm ${label}`}
      className={`md:col-start-2 md:row-start-1 grid ${spColsClass} grid-flow-col overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory scroll-px-1 hide-scrollbar px-0.5 md:px-1 pt-1.5 md:pt-2 pb-2 md:pb-4 md:gap-3 md:auto-cols-[calc((100%-24px)/3)] lg:gap-4 lg:auto-cols-[calc((100%-48px)/4)] xl:auto-cols-[calc((100%-64px)/5)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden`}
    >
      {products.map((p, idx) => {
        const hideOnMobile = Boolean(mobileLimit && mobileLimit > 0 && idx >= mobileLimit);
        return (
          <div key={`${p.id}:${p.variantId || ''}`} className={`min-w-0 snap-start h-full ${hideOnMobile ? 'hidden md:block' : ''}`}>
            <ProductCard product={p} variant={cardVariant} imageLoading={eagerImages && idx < 5 ? 'eager' : 'lazy'} />
          </div>
        );
      })}
    </div>
    <button
      type="button"
      aria-label="Sản phẩm trước"
      disabled={bounds.start}
      onClick={() => move(-1)}
      className="hidden md:flex md:col-start-1 md:row-start-1 min-h-11 min-w-11 h-14 w-full cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
    <button
      type="button"
      aria-label="Sản phẩm tiếp theo"
      disabled={bounds.end}
      onClick={() => move(1)}
      className="hidden md:flex md:col-start-3 md:row-start-1 min-h-11 min-w-11 h-14 w-full cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
    >
      <ChevronRight className="h-6 w-6" />
    </button>
    <button type="button" aria-label={autoplay ? 'Tạm dừng tự cuộn sản phẩm' : 'Bật tự cuộn sản phẩm'} aria-pressed={!autoplay} onClick={() => setAutoplay(value => !value)} className="md:col-start-2 min-h-11 justify-self-start md:justify-self-end rounded-full border border-slate-200 bg-white/95 px-3 md:px-3.5 py-1.5 text-[11px] md:text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600">
      {autoplay ? <Pause aria-hidden="true" className="mr-1 inline h-3 w-3" /> : <Play aria-hidden="true" className="mr-1 inline h-3 w-3" />}{autoplay ? 'Tạm dừng' : 'Tự cuộn'}
    </button>
  </div>;
}
