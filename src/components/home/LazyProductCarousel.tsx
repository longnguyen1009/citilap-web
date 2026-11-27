'use client';

import { useEffect, useRef, useState } from 'react';
import ProductCard, { type ProductCardProduct } from '@/components/product/ProductCard';

interface LazyProductCarouselProps {
  sectionId: string;
  label: string;
  mobileLimit?: number | null;
  rankNumbering?: boolean;
}

export default function LazyProductCarousel({
  sectionId,
  label,
  mobileLimit,
  rankNumbering = false,
}: LazyProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fetchedRef = useRef(false);
  const [products, setProducts] = useState<ProductCardProduct[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || fetchedRef.current) return;

    const load = async () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      try {
        const res = await fetch(
          `/api/homepage/section?sectionId=${encodeURIComponent(sectionId)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { products?: ProductCardProduct[] };
        setProducts(Array.isArray(json.products) ? json.products : []);
      } catch {
        setFailed(true);
        setProducts([]);
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      void load();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: '650px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionId]);

  if (products === null) {
    return (
      <div
        ref={containerRef}
        aria-busy="true"
        aria-label={`Đang tải ${label}`}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-xl border border-slate-200/80 bg-white p-3 space-y-2.5 ${i >= 2 ? 'hidden md:block' : ''} ${i >= 3 ? 'md:hidden lg:block' : ''} ${i >= 4 ? 'lg:hidden xl:block' : ''}`}
          >
            <div className="aspect-[4/3] rounded-lg skeleton" />
            <div className="h-3.5 w-4/5 rounded skeleton" />
            <div className="h-3 w-3/5 rounded skeleton" />
            <div className="h-5 w-1/2 rounded skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10 sm:py-12 text-slate-500">
        <p className="text-sm">
          {failed
            ? 'Không thể tải danh sách sản phẩm lúc này. Vui lòng thử tải lại trang.'
            : 'Chưa có sản phẩm nào phù hợp trong danh mục này.'}
        </p>
      </div>
    );
  }

  const effectiveMobileLimit = mobileLimit || 6;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4">
      {products.map((p, idx) => {
        const hideOnMobile = Boolean(idx >= effectiveMobileLimit);
        const cardNode = (
          <ProductCard
            key={p.id}
            product={p}
            rank={rankNumbering ? idx + 1 : undefined}
            imageLoading="lazy"
          />
        );
        return hideOnMobile ? (
          <div key={p.id} className="hidden md:block">
            {cardNode}
          </div>
        ) : (
          cardNode
        );
      })}
    </div>
  );
}
