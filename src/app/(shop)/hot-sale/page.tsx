import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Flame, ShieldCheck, Zap, Gift, Truck, AlertCircle, ShoppingBag } from "lucide-react";
import { getFlashSaleProducts, type HomepageProduct } from "@/server/services/catalog.service";
import { isFlashSaleActive, getStorefrontPricingContext } from "@/server/services/pricing.service";
import FlashSaleCountdown from "@/components/product/FlashSaleCountdown";
import HotSaleClient from "@/components/product/HotSaleClient";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStorefrontPricingContext().catch(() => null);
  const title = settings?.flashSaleTitle || "Hot Sale - Giá Sốc Giờ Vàng";
  return {
    title: `${title} | CitiLap`,
    description:
      "Săn Laptop Gaming, Ultrabook, MacBook và phụ kiện chính hãng với mức giá giảm sốc tại CitiLap. Số lượng có hạn!",
  };
}

export default async function HotSalePage() {
  const evaluatedAt = new Date();
  const settings = await getStorefrontPricingContext(undefined, evaluatedAt);
  const isActive = isFlashSaleActive(settings, evaluatedAt);
  const title = settings?.flashSaleTitle || "Giá Sốc Giờ Vàng";

  let products: HomepageProduct[] = [];
  try {
    products = await getFlashSaleProducts(50, undefined, settings, evaluatedAt);
  } catch (error) {
    console.error("[HotSalePage] Failed to load hot sale products from D1:", error);
    products = [];
  }

  const isUpcoming = Boolean(
    settings?.flashSaleEnabled &&
    settings.flashSaleStartAt &&
    new Date(settings.flashSaleStartAt).getTime() > evaluatedAt.getTime()
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-xs sm:text-sm text-slate-500 py-3.5 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-1.5 text-slate-400" />
            <span className="text-slate-900 font-bold">{title}</span>
          </nav>
        </div>
      </div>

      {/* 2. Hot Sale Banner Header */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white py-8 sm:py-12 border-b border-red-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="container mx-auto px-4 max-w-[1370px] relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Flame className="w-4 h-4 fill-amber-300" />
                {isActive ? "Chương trình ưu đãi có hạn" : isUpcoming ? "Chương trình sắp diễn ra" : "Chương trình ưu đãi"}
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                {title}
              </h1>
              <p className="text-sm sm:text-base text-red-100 mt-2 max-w-xl">
                {isActive
                  ? "Cơ hội sở hữu Laptop Gaming, Ultrabook cao cấp và máy like-new chuẩn zin với mức giá tốt nhất thị trường!"
                  : isUpcoming
                  ? "Sắp diễn ra đợt giảm giá cực sốc. Hãy chuẩn bị sẵn sàng để săn deal hời nhất!"
                  : "Đợt Hot Sale hiện tại đã khép lại. Vui lòng theo dõi để không bỏ lỡ đợt ưu đãi tiếp theo!"}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 self-start md:self-auto shadow-xl">
              <FlashSaleCountdown
                startAt={settings?.flashSaleStartAt}
                endAt={settings?.flashSaleEndAt}
              />
            </div>
          </div>

          {/* Benefits bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/15 text-xs text-white/90">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Bảo hành chính hãng 12T</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Cam kết giá tốt nhất thị trường</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Tặng balo + chuột gaming</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Đồng kiểm trước khi nhận hàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inactive notice if sale ended or not active */}
      {!isActive && products.length > 0 && (
        <div className="container mx-auto px-4 max-w-[1370px] mt-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {isUpcoming
                ? "Chương trình Flash Sale sắp bắt đầu. Các sản phẩm dưới đây đang hiển thị giá tiêu chuẩn trước giờ G."
                : "Chương trình Flash Sale hiện không hoạt động. Danh sách sản phẩm bên dưới đang áp dụng mức giá thông thường."}
            </span>
          </div>
        </div>
      )}

      {/* 3. Products Listing & Tabs */}
      <div className="container mx-auto px-4 max-w-[1370px] mt-8">
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Chưa có sản phẩm Hot Sale</h2>
            <p className="text-slate-500 text-sm mb-6">
              Hiện chưa có sản phẩm nào được cấu hình trong chương trình Flash Sale này.
            </p>
            <Link
              href="/category/laptop"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition"
            >
              Khám phá Laptop tại CitiLap
            </Link>
          </div>
        ) : (
          <HotSaleClient products={products} />
        )}
      </div>
    </div>
  );
}
