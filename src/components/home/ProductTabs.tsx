'use client';
import { useEffect, useRef, useState, useId } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

function formatTabLabel(tab: Tab): string {
  const upper = tab.label.trim().toUpperCase();
  if (tab.id === 'new-arrivals' || upper === 'LAPTOP MỚI VỀ') return 'HÀNG MỚI VỀ';
  if (tab.id === 'new' || tab.id === 'new-laptops' || upper === 'LAPTOP MỚI') return 'MỚI 100% FULLBOX';
  if (tab.id === 'like-new' || tab.id === 'likenew' || upper === 'LAPTOP LIKENEW') return 'LIKENEW 99%';
  if (tab.id === 'clearance' || upper === 'XẢ HÀNG GIÁ SỐC') return 'XẢ KHO GIÁ SỐC';
  return tab.label;
}

function deduplicateListingProducts(products: ProductCardProduct[]): ProductCardProduct[] {
  const seenKeys = new Set<string>();
  const result: ProductCardProduct[] = [];
  for (const product of products) {
    const baseName = (product.name || '')
      .toLowerCase()
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(/\s*[-–|]\s*(bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\s*$/i, '')
      .replace(/\s*\((bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = baseName || String(product.id);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(product);
  }
  return result;
}

function TabHighlightFlameIcon({ className = 'h-4 w-4 md:h-5 md:w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12.5 2C12.5 2 18.5 6.8 18.5 13.2C18.5 17.5 15.4 21 11.5 21C7.6 21 4.5 17.5 4.5 13.2C4.5 10.3 6.2 7.6 7.8 6C7.8 6 7.4 8.4 9.1 9.4C8.6 6.2 10.6 3.5 12.5 2Z"
        fill="url(#tab-flame-outer)"
      />
      <path
        d="M11.6 10.2C11.6 10.2 15 12.8 15 16C15 18.5 13.4 20.5 11.5 20.5C9.6 20.5 8 18.5 8 16C8 14.1 9.5 12 11.6 10.2Z"
        fill="url(#tab-flame-inner)"
      />
      <defs>
        <linearGradient id="tab-flame-outer" x1="11.5" y1="2" x2="11.5" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF9800" />
          <stop offset="0.6" stopColor="#FF3D00" />
          <stop offset="1" stopColor="#D50000" />
        </linearGradient>
        <linearGradient id="tab-flame-inner" x1="11.5" y1="10.2" x2="11.5" y2="20.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF59D" />
          <stop offset="1" stopColor="#FFB300" />
        </linearGradient>
      </defs>
    </svg>
  );
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
  const tabs = rawTabs
    .filter((t) => t.enabled !== false)
    .map((t) => ({ ...t, label: formatTabLabel(t) }));
  const [active, setActive] = useState(0);
  const prefix = useId();
  const safeIndex = active < tabs.length ? active : 0;
  const rawTab = tabs[safeIndex];
  if (!rawTab) return null;
  const isLaptopTab =
    ['new-arrivals', 'new', 'new-laptops', 'like-new', 'likenew', 'clearance'].includes(rawTab.id) ||
    /laptop|mới|likenew/i.test(rawTab.label);
  const filteredProducts = deduplicateListingProducts(
    isLaptopTab
      ? rawTab.products.filter((p) => p.template !== 'ACCESSORY' && !p.href?.startsWith('/phu-kien/'))
      : rawTab.products
  );
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
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
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
                  className={`${visCls} min-h-11 md:min-h-13 flex-1 shrink-0 items-center justify-center rounded-t-xl md:rounded-t-2xl border-2 px-2 md:px-3.5 py-1 md:py-1.5 text-[12px] md:text-[14px] lg:text-[16px] font-black uppercase whitespace-nowrap transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden ${
                    safeIndex === index
                      ? 'border-blue-500 border-b-blue-50 bg-blue-50 text-white'
                      : 'border-slate-200/80 border-b-blue-500 bg-slate-100/90 text-[#0284c7] shadow-[inset_0_-2px_5px_rgba(0,0,0,0.03)] hover:bg-blue-50/70 hover:text-blue-700'
                  }`}
                >
                  {safeIndex === index ? (
                    <span className="inline-flex items-center justify-center gap-1 md:gap-2 rounded-lg md:rounded-xl border border-sky-300 bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#1d4ed8] px-2.5 md:px-4 py-1 md:py-1.5 text-white shadow-[0_3px_10px_rgba(2,132,199,0.35),inset_0_1px_1px_rgba(255,255,255,0.65)]">
                      <TabHighlightFlameIcon className="h-4 w-4 md:h-5 md:w-5 shrink-0 drop-shadow-xs" />
                      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">{t.label}</span>
                    </span>
                  ) : (
                    <span>{t.label}</span>
                  )}
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
  products: rawProducts,
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
  const products = deduplicateListingProducts(rawProducts);
  const isFlash = cardVariant === 'flash';
  const container = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });
  const getStep = (el: HTMLElement) => (el.firstElementChild?.getBoundingClientRect().width || 0) + (parseFloat(getComputedStyle(el).columnGap) || 0);
  function move(direction: number) {
    const el = rail.current;
    if (!el) return;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollBy({ left: direction * getStep(el), behavior });
  }
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
  const spColsClass = 'auto-cols-[calc((100%-10px)/2)] gap-2.5';
  void isFlash;
  void oneAtATime;
  return (
    <div ref={container} className="relative group/carousel w-full">
      <button
        type="button"
        aria-label="Sản phẩm trước"
        disabled={bounds.start}
        onClick={() => move(-1)}
        className="hidden md:flex absolute left-1 lg:left-1.5 top-1/2 -translate-y-1/2 z-30 min-h-11 min-w-11 h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] backdrop-blur-xs transition hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        aria-label="Sản phẩm tiếp theo"
        disabled={bounds.end}
        onClick={() => move(1)}
        className="hidden md:flex absolute right-1 lg:right-1.5 top-1/2 -translate-y-1/2 z-30 min-h-11 min-w-11 h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.16)] backdrop-blur-xs transition hover:bg-white hover:text-blue-600 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-default disabled:opacity-40"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
      <div
        ref={rail}
        tabIndex={0}
        role="region"
        aria-label={`Sản phẩm ${label}`}
        className={`grid ${spColsClass} grid-flow-col overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory scroll-px-1 hide-scrollbar px-0.5 md:px-1 pt-1.5 md:pt-2 pb-2 md:pb-3 md:gap-3 md:auto-cols-[calc((100%-24px)/3)] lg:gap-3.5 lg:auto-cols-[calc((100%-42px)/4)] xl:gap-4 xl:auto-cols-[calc((100%-64px)/5)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:outline-hidden`}
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
    </div>
  );
}
