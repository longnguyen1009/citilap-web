export default function ProductDetailLoading() {
  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-16">
      {/* Breadcrumb skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="flex items-center gap-2 py-3">
            <div className="h-4 w-16 bg-gray-200 rounded skeleton" />
            <div className="h-4 w-4 bg-gray-200 rounded skeleton" />
            <div className="h-4 w-24 bg-gray-200 rounded skeleton" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Gallery skeleton */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="aspect-square bg-gray-200 rounded-lg skeleton" />
              <div className="flex gap-2 mt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg skeleton" />
                ))}
              </div>
            </div>
          </div>

          {/* Info skeleton */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6">
              <div className="h-8 bg-gray-200 rounded mb-4 skeleton w-3/4" />
              <div className="h-4 bg-gray-200 rounded mb-6 skeleton w-1/3" />
              <div className="h-12 bg-gray-200 rounded mb-4 skeleton w-1/2" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded skeleton" />
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 h-12 bg-gray-200 rounded-lg skeleton" />
                <div className="flex-1 h-12 bg-gray-200 rounded-lg skeleton" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="h-6 bg-gray-200 rounded mb-4 skeleton w-1/3" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded skeleton" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-20">
              <div className="h-6 bg-gray-200 rounded mb-4 skeleton w-1/2" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded mb-2 skeleton" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
