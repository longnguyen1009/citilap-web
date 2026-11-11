"use client";

import { usePathname } from "next/navigation";

const PRODUCT_DETAIL_PATH_RE = /^\/(?:laptop|product|san-pham|phu-kien)\/[^/]+$/;
const NEWS_DETAIL_PATH_RE = /^\/news\/(?!category\/)[^/]+$/;

export function ProductDetailSkeleton() {
  return (
    <div data-route-loading="true" className="bg-[#f1f5f9] min-h-screen pb-16 animate-pulse">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="flex items-center gap-2 py-3">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="flex gap-2 mt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6">
              <div className="h-8 bg-gray-200 rounded mb-4 w-3/4" />
              <div className="h-4 bg-gray-200 rounded mb-6 w-1/3" />
              <div className="h-12 bg-gray-200 rounded mb-4 w-1/2" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 h-12 bg-gray-200 rounded-lg" />
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
    <div data-route-loading="true" className="bg-[#f8fafc] min-h-screen pb-16 animate-pulse">
      <div className="bg-white border-b border-slate-200/80">
        <div className="container mx-auto px-4 max-w-[1370px] py-3.5">
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-[1000px] pt-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 space-y-5">
          <div className="h-5 w-28 rounded-full bg-slate-200" />
          <div className="h-9 w-4/5 rounded bg-slate-200" />
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="aspect-[16/9] w-full rounded-2xl bg-slate-200" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-11/12 rounded bg-slate-200" />
            <div className="h-4 w-4/5 rounded bg-slate-200" />
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
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
    <div data-route-loading="true" className="mx-auto w-full max-w-[1370px] animate-pulse px-4 py-6">
      <div className="mb-4 h-4 w-48 rounded bg-gray-200" />
      <div className="mb-6 h-8 w-2/3 rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-3">
            <div className="mb-3 aspect-square rounded bg-gray-200" />
            <div className="mb-2 h-4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}


