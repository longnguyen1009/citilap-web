import Link from "next/link";
import { Flame } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import FlashSaleCountdown from "@/components/product/FlashSaleCountdown";
import { getFlashSaleProducts } from "@/server/services/catalog.service";
import { isFlashSaleActive, getStorefrontPricingContext, type PriceEvaluationContext } from "@/server/services/pricing.service";

export default async function FlashSaleSection({pricingContext, evaluatedAt = new Date()}: {pricingContext?:PriceEvaluationContext; evaluatedAt?:Date} = {}) {
  const settings = pricingContext || await getStorefrontPricingContext(undefined, evaluatedAt);
  if (!isFlashSaleActive(settings, evaluatedAt)) {
    return null;
  }

  let flashSaleProducts = [];
  try {
    flashSaleProducts = await getFlashSaleProducts(10, settings, evaluatedAt);
  } catch (error) {
    console.error("[FlashSaleSection] Failed to load flash sale products from D1:", error);
    return null;
  }

  if (flashSaleProducts.length === 0) {
    return null;
  }

  const title = settings?.flashSaleTitle || "Giá Sốc Giờ Vàng";

  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-red-100 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-700 px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 text-white">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <Flame className="w-5 h-5 text-amber-300" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight uppercase">
                {title}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <FlashSaleCountdown
                startAt={settings?.flashSaleStartAt}
                endAt={settings?.flashSaleEndAt}
              />
              <Link 
                href="/hot-sale" 
                className="text-xs sm:text-sm font-semibold text-white/90 hover:text-white hover:underline flex items-center gap-1 transition shrink-0 whitespace-nowrap"
              >
                Xem tất cả &gt;
              </Link>
            </div>
          </div>
          
          <div className="p-4 md:p-6 bg-slate-50/40">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mb-4">
              {flashSaleProducts.slice(0, 5).map((p) => (
                <ProductCard 
                  key={p.id + "-fs"} 
                  product={p} 
                  badgeColor="bg-red-600" 
                />
              ))}
            </div>
            
            {flashSaleProducts.length > 5 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {flashSaleProducts.slice(5, 10).map((p) => (
                  <ProductCard 
                    key={p.id + "-fs2"} 
                    product={p} 
                    badgeColor="bg-red-600" 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
