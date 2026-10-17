import { getStorefrontPricingContext } from '@/server/services/pricing.service';
import { Suspense } from "react";
import { Metadata } from "next";
import {
  Sparkles,
  Zap,
  Briefcase,
  Server,
  TrendingUp,
  Headphones,
} from "lucide-react";

import HeroSection from "@/components/home/HeroSection";
import FeatureStrip from "@/components/home/FeatureStrip";
import CategoryGridSection from "@/components/home/CategoryGridSection";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import ProductSection from "@/components/home/ProductSection";
import MediaSection from "@/components/home/MediaSection";
import TestimonialSection from "@/components/home/TestimonialSection";
import ContactSection from "@/components/home/ContactSection";
import BrandSection from "@/components/home/BrandSection";
import { getPublishedNavigation, getPublishedHomepage } from "@/server/services/storefront-cms.service";
import BlockRenderer from "@/components/builder/BlockRenderer";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "CitiLap - Laptop Gaming, Ultrabook & Like New Chính Hãng",
  description:
    "CitiLap chuyên cung cấp các dòng Laptop Gaming, Ultrabook, Máy Trạm (Workstation) và Laptop Like New chính hãng, trả góp 0%, bảo hành uy tín tại Việt Nam.",
  openGraph: {
    title: "CitiLap - Laptop Gaming & Ultrabook Cao Cấp Giá Tốt",
    description:
      "Khám phá hệ sinh thái Laptop chính hãng tại CitiLap với ưu đãi trả góp 0%, quà tặng gaming và bảo hành chuyên nghiệp.",
    url: "https://citilap.vn",
    siteName: "CitiLap",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "CitiLap Laptop Gaming & Ultrabook",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
};

// Reusable standard skeleton for section suspense boundaries
function ProductSectionSkeleton() {
  return (
    <section className="pb-16" aria-busy="true">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="h-16 bg-slate-100 skeleton"></div>
          <div className="p-4 md:p-6 bg-slate-50/30">
            <ProductGridSkeleton count={5} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [navigation, cmsHomepage] = await Promise.all([
    getPublishedNavigation(),
    getPublishedHomepage(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CitiLap",
    url: "https://citilap.vn",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://citilap.vn/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  // If a CMS homepage is published, render dynamic sections via BlockRenderer
  if (cmsHomepage && cmsHomepage.sections && cmsHomepage.sections.length > 0) {
    return (
      <div className="bg-surface-subtle min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <BlockRenderer sections={cmsHomepage.sections} />
      </div>
    );
  }

  const evaluatedAt = new Date();
  const pricingContext = await getStorefrontPricingContext(undefined, evaluatedAt);
  return (
    <div className="bg-surface-subtle min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. HERO SECTION & SUB-BANNERS */}
      <HeroSection />

      {/* 2. FEATURE STRIP */}
      <FeatureStrip />

      {/* 3. KHÁM PHÁ HỆ SINH THÁI DANH MỤC & PHỤ KIỆN TECH */}
      <CategoryGridSection navigation={navigation} />

      {/* 4. FLASH SALE */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <FlashSaleSection pricingContext={pricingContext} evaluatedAt={evaluatedAt} />
      </Suspense>

      {/* 4. HÀNG MỚI VỀ */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Hàng Mới Về - Bắt Trend Công Nghệ"
          icon={Sparkles}
          colorClass="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800"
          links={[
            { label: "Gaming Mới", href: "/category/laptop-gaming?sort=newest" },
            { label: "Ultrabook Mới", href: "/category/laptop-van-phong?sort=newest" },
            { label: "Apple M3", href: "/category/macbook" },
            { label: "Đồ Hoạ Mới", href: "/category/laptop-do-hoa?sort=newest" },
          ]}
          slug="laptop-gaming"
          sectionKey="new"
          badgeColor="bg-indigo-600 text-white shadow-xs"
        />
      </Suspense>

      {/* 5. LAPTOP GAMING */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Laptop Gaming - Chiến Thần Đồ Hoạ"
          icon={Zap}
          colorClass="bg-gradient-to-r from-red-700 via-red-600 to-red-800"
          links={[
            { label: "RTX 4060", href: "/category/laptop-gaming?gpu=RTX+4060" },
            { label: "RTX 4070", href: "/category/laptop-gaming?gpu=RTX+4070" },
            { label: "Legion", href: "/category/laptop-gaming?brand=lenovo" },
            { label: "ROG Strix", href: "/category/laptop-gaming?brand=asus" },
          ]}
          slug="laptop-gaming"
          sectionKey="gaming"
        />
      </Suspense>

      {/* 6. ULTRABOOK CAO CẤP */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Ultrabook Cao Cấp - Doanh Nhân"
          icon={Briefcase}
          colorClass="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800"
          links={[
            { label: "MacBook Air", href: "/category/macbook" },
            { label: "Dell XPS", href: "/category/laptop-van-phong?brand=dell" },
            { label: "ThinkPad X1", href: "/category/laptop-van-phong?brand=lenovo" },
            { label: "Zenbook", href: "/category/laptop-van-phong?brand=asus" },
          ]}
          slug="laptop-van-phong"
          sectionKey="ultrabook"
          badgeColor="bg-blue-600 text-white shadow-xs"
        />
      </Suspense>

      {/* 7. MÁY TRẠM WORKSTATION */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Máy Trạm Workstation - Đồ Hoạ Chuyên Nghiệp"
          icon={Server}
          colorClass="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900"
          links={[
            { label: "Dell Precision", href: "/category/laptop-do-hoa?brand=dell" },
            { label: "ThinkPad P", href: "/category/laptop-do-hoa?brand=lenovo" },
            { label: "HP ZBook", href: "/category/laptop-do-hoa?brand=hp" },
            { label: "GPU Chuyên Dụng", href: "/category/laptop-do-hoa" },
          ]}
          slug="laptop-do-hoa"
          sectionKey="workstation"
          badgeColor="bg-gray-800 text-white shadow-xs"
        />
      </Suspense>

      {/* 8. PHỤ KIỆN LAPTOP & SETUP CÔNG NGHỆ */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Phụ Kiện Laptop & Đồ Chơi Công Nghệ"
          icon={Headphones}
          colorClass="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800"
          links={[
            { label: "Chuột & Bàn Phím", href: "/category/linh-kien?type=mouse-keyboard" },
            { label: "Balo & Túi Chống Sốc", href: "/category/linh-kien?type=bag" },
            { label: "Củ Sạc GaN & Cáp", href: "/category/linh-kien?type=charger" },
            { label: "Hub Type-C", href: "/category/linh-kien?type=hub" },
          ]}
          slug="linh-kien"
          sectionKey="accessories"
          badgeColor="bg-emerald-600 text-white shadow-xs"
        />
      </Suspense>

      {/* 9. BÁN CHẠY NHẤT */}
      <Suspense fallback={<ProductSectionSkeleton />}>
        <ProductSection pricingContext={pricingContext} evaluatedAt={evaluatedAt}
          title="Bán Chạy Nhất - Được Yêu Thích"
          icon={TrendingUp}
          colorClass="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-700"
          links={[
            { label: "Top Gaming", href: "/category/laptop-gaming?sort=best-selling" },
            { label: "Top Mỏng Nhẹ", href: "/category/laptop-van-phong?sort=best-selling" },
            { label: "Top Đồ Hoạ", href: "/category/laptop-do-hoa?sort=best-selling" },
            { label: "MacBook Hot", href: "/category/macbook?sort=best-selling" },
          ]}
          slug="laptop-gaming"
          sectionKey="best-selling"
          badgeColor="bg-orange-600 text-white shadow-xs"
          rank={true}
        />
      </Suspense>

      {/* 11. GÓC CITILAP MEDIA */}
      <MediaSection />

      {/* 12. ĐÁNH GIÁ KHÁCH HÀNG */}
      <TestimonialSection />

      {/* 13. TƯ VẤN CHỌN MÁY */}
      <ContactSection />

      {/* 14. KHÁM PHÁ THEO THƯƠNG HIỆU */}
      <BrandSection />
    </div>
  );
}
