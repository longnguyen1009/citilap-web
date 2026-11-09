import { businessProfile } from "@/config/business-profile";
import { serializeJsonLd } from '@/lib/seo-helpers';
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
import VideoReviews from "@/components/home/VideoReviews";
import TestimonialSection from "@/components/home/TestimonialSection";
import ContactSection from "@/components/home/ContactSection";
import BrandSection from "@/components/home/BrandSection";
import {
  getPublishedNavigation,
  getPublishedHomepage,
  getStorefrontSettings,
  getCachedHotSaleCampaigns,
  getCachedHomepageCatalog,
} from "@/server/services/storefront-cms.service";
import BlockRenderer from "@/components/builder/BlockRenderer";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([
    getStorefrontSettings(),
    getPublishedHomepage(),
  ]);
  const title = home?.seo.title || settings?.defaultSeoTitle || `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`;
  const description = home?.seo.description || settings?.defaultSeoDescription || `${businessProfile.brandName} - ${businessProfile.traditionalMotto}`;
  return {title,description,alternates:{canonical:`${businessProfile.canonicalSiteUrl}`},openGraph:{title,description,url:`${businessProfile.canonicalSiteUrl}`}};
}

export default async function Home() {
  const [navigation, cmsHomepage, settings, hotSaleCampaigns] = await Promise.all([
    getPublishedNavigation(),
    getPublishedHomepage(),
    getStorefrontSettings(),
    getCachedHotSaleCampaigns().catch(() => undefined),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings?.storeName || "CitiLap",
    url: `${businessProfile.canonicalSiteUrl}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${businessProfile.canonicalSiteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  // If a CMS homepage is published, render dynamic sections via BlockRenderer
  if (cmsHomepage && cmsHomepage.sections && cmsHomepage.sections.length > 0) {
    return (
      <div className="bg-surface-subtle min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <BlockRenderer
          sections={cmsHomepage.sections}
          settings={settings}
          flashSale={<FlashSaleSection settings={settings} initialCampaigns={hotSaleCampaigns} />}
        />
        <div className="defer-offscreen">
          <TestimonialSection
            testimonials={settings?.testimonials ?? []}
            sourceUrl={settings?.testimonialsSourceUrl}
          />
          <ContactSection settings={settings} />
        </div>
      </div>
    );
  }

  const catalog = await getCachedHomepageCatalog().catch(() => null);
  return (
    <div className="bg-surface-subtle min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {/* 1. HERO SECTION & SUB-BANNERS */}
      <HeroSection settings={settings ?? undefined} />

      {/* 2. FEATURE STRIP */}
      <FeatureStrip settings={settings} />

      {/* 3. KHÁM PHÁ HỆ SINH THÁI DANH MỤC & PHỤ KIỆN TECH */}
      <CategoryGridSection navigation={navigation} />

      {/* 4. FLASH SALE */}
      <FlashSaleSection settings={settings} initialCampaigns={hotSaleCampaigns} />

      {/* 4. HÀNG MỚI VỀ */}
      <ProductSection
        products={catalog?.newArrivals}
        eagerImages
        title="Hàng Mới Về - Bắt Trend Công Nghệ"
        icon={Sparkles}
        colorClass="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800"
        links={[
          { label: "Gaming Mới", href: "/laptop-gaming?sort=newest" },
          { label: "Ultrabook Mới", href: "/laptop-van-phong?sort=newest" },
          { label: "Apple M3", href: "/macbook" },
          { label: "Đồ Hoạ Mới", href: "/laptop-workstation?sort=newest" },
        ]}
        slug="laptop-moi"
        sectionKey="new"
        badgeColor="bg-indigo-600 text-white shadow-xs"
      />

      <div className="defer-offscreen">
        {/* 5. LAPTOP GAMING */}
        <ProductSection
          products={catalog?.gaming}
          title="Laptop Gaming - Chiến Thần Đồ Hoạ"
          icon={Zap}
          colorClass="bg-gradient-to-r from-red-700 via-red-600 to-red-800"
          links={[
            { label: "RTX 4060", href: "/laptop-gaming?gpu=RTX+4060" },
            { label: "RTX 4070", href: "/laptop-gaming?gpu=RTX+4070" },
            { label: "Legion", href: "/laptop-gaming?brand=lenovo" },
            { label: "ROG Strix", href: "/laptop-gaming?brand=asus" },
          ]}
          slug="laptop-gaming"
          sectionKey="gaming"
        />

        {/* 6. ULTRABOOK CAO CẤP */}
        <ProductSection
          products={catalog?.ultrabook}
          title="Ultrabook Cao Cấp - Doanh Nhân"
          icon={Briefcase}
          colorClass="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800"
          links={[
            { label: "MacBook Air", href: "/macbook" },
            { label: "Dell XPS", href: "/laptop-van-phong?brand=dell" },
            { label: "ThinkPad X1", href: "/laptop-van-phong?brand=lenovo" },
            { label: "Zenbook", href: "/laptop-van-phong?brand=asus" },
          ]}
          slug="laptop-van-phong"
          sectionKey="ultrabook"
          badgeColor="bg-blue-600 text-white shadow-xs"
        />

        {/* 7. MÁY TRẠM WORKSTATION */}
        <ProductSection
          products={catalog?.workstation}
          title="Máy Trạm Workstation - Đồ Hoạ Chuyên Nghiệp"
          icon={Server}
          colorClass="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900"
          links={[
            { label: "Dell Precision", href: "/laptop-workstation?brand=dell" },
            { label: "ThinkPad P", href: "/laptop-workstation?brand=lenovo" },
            { label: "HP ZBook", href: "/laptop-workstation?brand=hp" },
            { label: "GPU Chuyên Dụng", href: "/laptop-workstation" },
          ]}
          slug="laptop-workstation"
          sectionKey="workstation"
          badgeColor="bg-gray-800 text-white shadow-xs"
        />

        {/* 8. PHỤ KIỆN LAPTOP & SETUP CÔNG NGHỆ */}
        <ProductSection
          products={catalog?.accessories}
          title="Phụ Kiện Laptop & Đồ Chơi Công Nghệ"
          icon={Headphones}
          colorClass="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800"
          links={[
            { label: "Chuột & Bàn Phím", href: "/phu-kien?type=mouse-keyboard" },
            { label: "Balo & Túi Chống Sốc", href: "/phu-kien?type=bag" },
            { label: "Củ Sạc GaN & Cáp", href: "/phu-kien?type=charger" },
            { label: "Hub Type-C", href: "/phu-kien?type=hub" },
          ]}
          slug="phu-kien"
          sectionKey="accessories"
          badgeColor="bg-emerald-600 text-white shadow-xs"
        />

        {/* 9. BÁN CHẠY NHẤT */}
        <ProductSection
          products={catalog?.bestSelling}
          title="Bán Chạy Nhất - Được Yêu Thích"
          icon={TrendingUp}
          colorClass="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-700"
          links={[
            { label: "Top Gaming", href: "/laptop-gaming?sort=best-selling" },
            { label: "Top Mỏng Nhẹ", href: "/laptop-van-phong?sort=best-selling" },
            { label: "Top Đồ Hoạ", href: "/laptop-workstation?sort=best-selling" },
            { label: "MacBook Hot", href: "/macbook?sort=best-selling" },
          ]}
          slug="search?sort=best-selling"
          sectionKey="best-selling"
          badgeColor="bg-orange-600 text-white shadow-xs"
          rank={true}
        />

        {/* 11. GÓC CITILAP MEDIA */}
        <MediaSection />

        {/* 12. GÓC REVIEW & TRẢI NGHIỆM VIDEO */}
        <VideoReviews
          title="Góc Review & Đánh Giá Thực Tế"
          subtitle="Tổng hợp video đánh giá chi tiết, test hiệu năng & quy trình kiểm định laptop từ YouTube và TikTok"
          videos={settings?.reviewVideos ?? []}
          fallbackVideos={settings?.reviewVideos}
          youtubeChannelUrl={settings?.youtubeUrl}
          tiktokChannelUrl={settings?.tiktokUrl}
        />

        {/* 13. ĐÁNH GIÁ KHÁCH HÀNG */}
        <TestimonialSection testimonials={settings?.testimonials ?? []} sourceUrl={settings?.testimonialsSourceUrl} />

        {/* 13. TƯ VẤN CHỌN MÁY */}
        <ContactSection settings={settings} />

        {/* 14. KHÁM PHÁ THEO THƯƠNG HIỆU */}
        <BrandSection />
      </div>
    </div>
  );
}
