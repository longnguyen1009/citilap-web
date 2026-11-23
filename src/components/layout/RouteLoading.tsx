"use client";

import { usePathname } from "next/navigation";

const PRODUCT_DETAIL_PATH_RE = /^\/(?:laptop|product|san-pham|phu-kien)\/[^/]+$/;
const NEWS_DETAIL_PATH_RE = /^\/news\/(?!category\/)[^/]+$/;

export function ProductDetailSkeleton() {
  return (
    <div data-route-loading="true" className="bg-[#f8fafc] min-h-screen pb-16">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-3 md:px-4 max-w-[1370px]">
          <div className="flex items-center gap-2 py-3">
            <div className="h-4 w-16 rounded skeleton" />
            <div className="h-4 w-3 rounded skeleton" />
            <div className="h-4 w-24 rounded skeleton" />
            <div className="h-4 w-3 rounded skeleton" />
            <div className="h-4 w-36 rounded skeleton" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 max-w-[1370px] mt-3 sm:mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8">
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-3 sm:p-4">
              <div className="aspect-[4/3] sm:aspect-square rounded-lg skeleton" />
              <div className="flex gap-2 mt-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg skeleton" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 sm:p-6 space-y-4">
              <div className="h-7 rounded w-4/5 skeleton" />
              <div className="h-4 rounded w-1/3 skeleton" />
              <div className="h-12 rounded-xl w-2/3 skeleton" />
              <div className="grid grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-11 rounded-lg skeleton" />
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <div className="flex-1 h-12 rounded-xl skeleton" />
                <div className="flex-1 h-12 rounded-xl skeleton" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArticleDetailSkeleton() {
  return (
    <div data-route-loading="true" className="bg-[#f8fafc] min-h-screen pb-16">
      <div className="bg-white border-b border-slate-200/80">
        <div className="container mx-auto px-3 md:px-4 max-w-[1370px] py-3.5">
          <div className="h-4 w-64 rounded skeleton" />
        </div>
      </div>
      <div className="container mx-auto px-3 md:px-4 max-w-[1000px] pt-6 sm:pt-8 space-y-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-10 space-y-4">
          <div className="h-5 w-28 rounded-full skeleton" />
          <div className="h-8 w-4/5 rounded skeleton" />
          <div className="h-4 w-48 rounded skeleton" />
          <div className="aspect-[16/9] w-full rounded-2xl skeleton" />
          <div className="space-y-3 pt-3">
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-4 w-11/12 rounded skeleton" />
            <div className="h-4 w-4/5 rounded skeleton" />
            <div className="h-4 w-full rounded skeleton" />
            <div className="h-4 w-3/4 rounded skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RouteLoading() {
  const pathname = usePathname() || "";

  if (PRODUCT_DETAIL_PATH_RE.test(pathname)) {
    return <ProductDetailSkeleton />;
  }

  if (NEWS_DETAIL_PATH_RE.test(pathname)) {
    return <ArticleDetailSkeleton />;
  }

  return (
    <div data-route-loading="true" className="bg-surface-subtle min-h-screen pb-16">
      <div className="bg-white border-b border-slate-200/80">
        <div className="mx-auto w-full max-w-[1370px] px-3 md:px-4 py-3">
          <div className="h-4 w-44 rounded skeleton" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1370px] px-3 md:px-4 py-4 space-y-4">
        <div className="h-7 w-56 rounded-lg skeleton" />
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-full skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/70 bg-white p-2.5 space-y-2.5">
              <div className="aspect-[4/3] rounded-lg skeleton" />
              <div className="h-3.5 rounded skeleton" />
              <div className="h-3.5 w-2/3 rounded skeleton" />
              <div className="h-5 w-1/2 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
