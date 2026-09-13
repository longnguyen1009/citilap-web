export default function ShopLoading() {
  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* Hero skeleton */}
      <div className="bg-[#0f172a] h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
        <div className="w-full h-full skeleton opacity-30" />
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        {/* Banners skeleton */}
        <section className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[120px] md:h-[150px] rounded-xl skeleton" />
            <div className="h-[120px] md:h-[150px] rounded-xl skeleton" />
          </div>
        </section>

        {/* Features skeleton */}
        <section className="pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg skeleton" />
            ))}
          </div>
        </section>

        {/* Product sections skeleton */}
        {[...Array(3)].map((_, sectionIdx) => (
          <section key={sectionIdx} className="pb-12">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="h-14 skeleton" />
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3 skeleton" />
                      <div className="h-4 bg-gray-200 rounded mb-2 skeleton" />
                      <div className="h-5 w-24 bg-gray-200 rounded skeleton" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-3 skeleton" />
                      <div className="h-4 bg-gray-200 rounded mb-2 skeleton" />
                      <div className="h-5 w-24 bg-gray-200 rounded skeleton" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
