import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Flame, ShieldCheck, Zap, Gift, Truck } from "lucide-react";
import { getFlashSaleProducts, getFeaturedProducts, type HomepageProduct } from "@/server/services/catalog.service";
import FlashSaleCountdown from "@/components/product/FlashSaleCountdown";
import HotSaleClient from "@/components/product/HotSaleClient";

export const metadata: Metadata = {
  title: "Hot Sale - Giá Sốc Giờ Vàng | CitiLap",
  description:
    "Săn Laptop Gaming, Ultrabook, MacBook và phụ kiện chính hãng với mức giá giảm sốc lên đến 40% tại CitiLap. Số lượng có hạn!",
};

export default async function HotSalePage() {
  let products: HomepageProduct[] = [];
  try {
    products = await getFlashSaleProducts(30);
    // If flash sale items are fewer than 8, complement with featured products
    if (products.length < 8) {
      const extra = await getFeaturedProducts(15);
      const existingIds = new Set(products.map((p) => p.id));
      for (const item of extra) {
        if (!existingIds.has(item.id)) {
          products.push(item);
        }
      }
    }
  } catch (error) {
    console.error("[HotSalePage] Failed to load hot sale products from D1:", error);
    try {
      products = await getFeaturedProducts(20);
    } catch {
      products = [];
    }
  }

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
            <span className="text-slate-900 font-bold">Hot Sale - Giá Sốc Giờ Vàng</span>
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
                Chương trình ưu đãi có hạn
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                GIÁ SỐC GIỜ VÀNG
              </h1>
              <p className="text-sm sm:text-base text-red-100 mt-2 max-w-xl">
                Cơ hội sở hữu Laptop Gaming, Ultrabook cao cấp và máy like-new chuẩn zin với mức giá tốt nhất thị trường!
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 self-start md:self-auto shadow-xl">
              <FlashSaleCountdown endAt={process.env.NEXT_PUBLIC_FLASH_SALE_END_AT} />
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

      {/* 3. Products Listing & Tabs */}
      <div className="container mx-auto px-4 max-w-[1370px] mt-8">
        <HotSaleClient products={products} />
      </div>
    </div>
  );
}
