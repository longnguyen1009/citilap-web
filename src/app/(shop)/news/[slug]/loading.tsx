export default function ArticleLoading() {
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
