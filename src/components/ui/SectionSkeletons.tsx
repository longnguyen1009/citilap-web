export function FlashSaleSkeleton() {
  return (
    <section className="py-3 md:py-5" aria-busy="true" aria-label="Đang tải ưu đãi Hot Sale">
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="rounded-xl md:rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="h-12 md:h-14 bg-gradient-to-r from-red-600/80 via-red-500/80 to-orange-500/80 px-4 flex items-center justify-between">
            <div className="h-5 w-40 rounded-md bg-white/30" />
            <div className="h-6 w-28 rounded-full bg-white/25" />
          </div>
          <div className="p-2.5 md:p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-xl border border-slate-100 bg-white p-2.5 space-y-2.5 ${i >= 2 ? "hidden md:block" : ""} ${i >= 4 ? "md:hidden lg:block" : ""}`}
              >
                <div className="aspect-[4/3] w-full rounded-lg skeleton" />
                <div className="h-3.5 w-11/12 rounded skeleton" />
                <div className="h-3.5 w-3/4 rounded skeleton" />
                <div className="h-5 w-1/2 rounded skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductGridSectionSkeleton({ rows = 1 }: { rows?: number }) {
  const count = rows * 5;
  return (
    <section className="py-4 md:py-6" aria-busy="true" aria-label="Đang tải danh sách sản phẩm">
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="rounded-xl md:rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="h-12 md:h-14 bg-slate-100 px-4 flex items-center justify-between border-b border-slate-200/70">
            <div className="h-5 w-48 rounded-md skeleton" />
            <div className="hidden sm:flex gap-2">
              <div className="h-7 w-20 rounded-full skeleton" />
              <div className="h-7 w-20 rounded-full skeleton" />
              <div className="h-7 w-20 rounded-full skeleton" />
            </div>
          </div>
          <div className="p-2.5 md:p-4 lg:p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-2.5 space-y-2.5">
                <div className="aspect-[4/3] w-full rounded-lg skeleton" />
                <div className="h-3.5 w-11/12 rounded skeleton" />
                <div className="h-3.5 w-2/3 rounded skeleton" />
                <div className="flex gap-1.5">
                  <div className="h-4 w-12 rounded skeleton" />
                  <div className="h-4 w-14 rounded skeleton" />
                </div>
                <div className="h-5 w-1/2 rounded skeleton" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CategoryCatalogSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải sản phẩm trong danh mục">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5">
        <div className="h-9 w-24 rounded-lg skeleton" />
        <div className="h-9 w-36 rounded-lg skeleton" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Desktop filter sidebar skeleton */}
        <div className="hidden lg:block lg:col-span-3 space-y-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div className="h-4 w-28 rounded skeleton" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-full rounded-lg skeleton" />
            ))}
          </div>
        </div>

        {/* Product grid skeleton */}
        <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/70 bg-white p-2.5 space-y-2.5">
              <div className="aspect-[4/3] w-full rounded-lg skeleton" />
              <div className="h-3.5 w-11/12 rounded skeleton" />
              <div className="h-3.5 w-3/4 rounded skeleton" />
              <div className="flex gap-1.5">
                <div className="h-4 w-12 rounded skeleton" />
                <div className="h-4 w-14 rounded skeleton" />
              </div>
              <div className="h-5 w-1/2 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RelatedProductsSkeleton() {
  return (
    <section className="mt-10 md:mt-12" aria-busy="true" aria-label="Đang tải sản phẩm tương tự">
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded skeleton" />
          <div className="h-3.5 w-64 rounded skeleton" />
        </div>
        <div className="h-5 w-20 rounded skeleton" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`rounded-xl border border-slate-200/70 bg-white p-2.5 space-y-2.5 ${i >= 4 ? "hidden lg:block" : ""}`}
          >
            <div className="aspect-[4/3] w-full rounded-lg skeleton" />
            <div className="h-3.5 w-11/12 rounded skeleton" />
            <div className="h-3.5 w-2/3 rounded skeleton" />
            <div className="h-5 w-1/2 rounded skeleton" />
          </div>
        ))}
      </div>
    </section>
  );
}
