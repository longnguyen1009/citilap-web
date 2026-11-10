import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Zap,
  Briefcase,
  Server,
  TrendingUp,
  Headphones,
  ShieldCheck,
  Truck,
  RefreshCw,
  Store,
  Star,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { createElement, Fragment, type ReactNode } from 'react';
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';
import CategoryGridSection from '@/components/home/CategoryGridSection';
import BrandSection from '@/components/home/BrandSection';
import {
  newsReviewsSectionDataSchema,
  ctaSectionDataSchema,
  type ProductGridSectionData,
  type FeaturedCategoriesSectionData,
} from '@/contracts/cms/site-builder';
import type { SliderSectionData } from '@/components/home/SliderSection';
import FeatureStrip from '@/components/home/FeatureStrip';
import MediaSection from '@/components/home/MediaSectionView';
import ProductTabs, { ProductCarousel } from '@/components/home/ProductTabs';
import VideoReviews from '@/components/home/VideoReviews';
import CustomerGallery from '@/components/home/CustomerGallery';
import { customerGallerySectionDataSchema, videoReviewsSectionDataSchema } from '@/contracts/cms/site-builder';
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';
import type { ProductCardProduct } from '@/components/product/ProductCard';

function dedupeSectionProducts(products: ProductCardProduct[]): ProductCardProduct[] {
  const seenKeys = new Set<string>();
  const result: ProductCardProduct[] = [];
  for (const product of products) {
    const baseName = (product.name || '')
      .toLowerCase()
      .replace(/^\[[^\]]+\]\s*/g, '')
      .replace(/\s*[-–|]\s*(bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\s*$/i, '')
      .replace(/\s*\((bạc|xám|đen|trắng|hồng|vàng|xanh|silver|space gray|gray|grey|black|white|pink|blush|gold|indigo|citrus|midnight|starlight)\)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    const key = baseName || String(product.id);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(product);
  }
  return result;
}

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  zap: Zap,
  briefcase: Briefcase,
  server: Server,
  trending: TrendingUp,
  headphones: Headphones,
  shield: ShieldCheck,
  truck: Truck,
  refresh: RefreshCw,
  store: Store,
  star: Star,
};

const THEME_GRADIENT_MAP: Record<string, string> = {
  indigo: 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800',
  red: 'bg-gradient-to-r from-red-700 via-red-600 to-red-800',
  blue: 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800',
  gray: 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900',
  emerald: 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800',
  orange: 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-700',
};

export default function BlockRenderer({
  sections,
  flashSale,
  settings,
}: {
  sections: ResolvedSectionItem[];
  flashSale?: ReactNode;
  settings?: PublicStorefrontSettings | null;
}) {
  if (!sections || sections.length === 0) {
    return null;
  }

  // Sections after the first screens are skipped by the browser's rendering until they approach the viewport.
  const DEFER_FROM_INDEX = 3;
  const firstProductGridIndex = sections.findIndex(
    (s) => s.enabled && s.type === 'product_grid' && (s.id !== 'sec-hot-sale' || flashSale === undefined)
  );
  const rendered = sections.map((section, sectionIndex) => {
        if (!section.enabled) return null;

        const visibilityClass =
          section.deviceVisibility === 'desktop'
            ? 'hidden md:block'
            : section.deviceVisibility === 'mobile'
              ? 'md:hidden'
              : '';

        let blockNode: ReactNode = null;
        switch (section.type) {
          case 'banner':
            blockNode = <BannerBlock key={section.id} data={section.data} />;
            break;

          case 'slider':
            blockNode = <SliderBlock key={section.id} data={section.data} />;
            break;

          case 'product_grid': {
            if (section.id === 'sec-hot-sale' && flashSale !== undefined) {
              const d = section.data as { title?: string };
              blockNode = (
                <div key={section.id} className="hot-sale-wrapper" aria-label={d?.title || 'HOT SALE'}>
                  {d?.title && <div className="sr-only">{d.title}</div>}
                  {flashSale}
                </div>
              );
              break;
            }
            blockNode = <ProductGridBlock key={section.id} section={section} eagerImages={sectionIndex === firstProductGridIndex} />;
            break;
          }

          case 'featured_categories':
            blockNode = <FeaturedCategoriesBlock key={section.id} section={section} />;
            break;

          case 'featured_brands':
            blockNode = <FeaturedBrandsBlock key={section.id} section={section} />;
            break;

          case 'featured_collection':
            blockNode = <FeaturedCollectionBlock key={section.id} section={section} />;
            break;

          case 'news_reviews':
            blockNode = <NewsReviewsBlock key={section.id} section={section} />;
            break;

          case 'intro':
            blockNode = <IntroBlock key={section.id} data={section.data} settings={settings} />;
            break;

          case 'cta':
            blockNode = <CtaBlock key={section.id} data={section.data} />;
            break;
          case 'video_reviews': {
            const vData = videoReviewsSectionDataSchema.parse(section.data);
            blockNode = (
              <VideoReviews
                key={section.id}
                title={vData.title}
                subtitle={vData.subtitle}
                limit={vData.limit}
                videos={vData.videos}
                fallbackVideos={settings?.reviewVideos}
                youtubeChannelUrl={vData.youtubeUrl || settings?.youtubeUrl}
                tiktokChannelUrl={vData.tiktokUrl || settings?.tiktokUrl}
              />
            );
            break;
          }
          case 'customer_gallery': {
            const data = customerGallerySectionDataSchema.parse(section.data);
            blockNode = (
              <CustomerGallery
                key={section.id}
                title={data.title}
                subtitle={data.subtitle}
                limit={data.limit}
                images={data.images}
              />
            );
            break;
          }

          default:
            return null;
        }

        if (!blockNode) return null;
        return visibilityClass ? (
          <div key={section.id} className={visibilityClass}>
            {blockNode}
          </div>
        ) : (
          blockNode
        );
      });

  return (
    <div className="site-builder-content space-y-2">
      {rendered.map((node, index) =>
        node && index >= DEFER_FROM_INDEX ? (
          <div key={sections[index].id} className="defer-offscreen">{node}</div>
        ) : node,
      )}
    </div>
  );
}

import SliderSection from '@/components/home/SliderSection';

// 1. BANNER BLOCK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BannerBlock({ data }: { data: any }) {
  const imageUrl = data.imageUrl || '/brand/marketing-banner.webp';
  const mobileImageUrl =
    data.mobileImageUrl?.trim() ||
    (imageUrl === '/brand/citilap-hero.webp' || imageUrl === '/brand/marketing-banner.webp'
      ? '/brand/citilap-hero-mobile.webp'
      : '');
  const hasSeparateMobileImage = Boolean(mobileImageUrl && mobileImageUrl !== imageUrl);
  const layout = data.layout || 'hero';
  const mobileTitle = data.mobileTitle?.trim() || '';
  const mobileSubtitle = data.mobileSubtitle?.trim() || '';
  const hideOverlayOnMobile = Boolean(data.hideOverlayOnMobile);

  if (layout === 'fullwidth') {
    const imageContent = (
      <>
        {hasSeparateMobileImage && (
          <Image
            src={mobileImageUrl}
            alt={mobileTitle || data.title || 'Banner'}
            fill
            unoptimized={mobileImageUrl.startsWith('/brand/')}
            className="md:hidden object-cover transition-transform duration-500 hover:scale-[1.02] motion-reduce:transform-none"
            sizes="100vw"
          />
        )}
        <Image
          src={imageUrl}
          alt={data.title || 'Banner'}
          fill
          unoptimized={imageUrl.startsWith('/brand/')}
          className={`${hasSeparateMobileImage ? 'hidden md:block ' : ''}object-cover transition-transform duration-500 hover:scale-[1.02] motion-reduce:transform-none`}
          sizes="(max-width: 1280px) 100vw, 1280px"
        />
      </>
    );

    return (
      <section className="w-full relative overflow-hidden" aria-label={data.title || 'Banner'}>
        <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6 py-2 md:py-4">
          <div className="relative w-full h-[140px] sm:h-[168px] md:h-[200px] lg:h-[236px] rounded-lg lg:rounded-xl overflow-hidden shadow-xs border border-slate-200/80">
            {data.link ? (
              <Link href={data.link} className="block relative w-full h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden" aria-label={data.title || 'Banner'}>
                {imageContent}
              </Link>
            ) : (
              imageContent
            )}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'split') {
    const splitImages = (
      <>
        {hasSeparateMobileImage && (
          <Image
            src={mobileImageUrl}
            alt={mobileTitle || data.title || 'Banner'}
            fill
            unoptimized={mobileImageUrl.startsWith('/brand/')}
            className="md:hidden object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
            sizes="100vw"
          />
        )}
        <Image
          src={imageUrl}
          alt={data.title || 'Banner'}
          fill
          unoptimized={imageUrl.startsWith('/brand/')}
          className={`${hasSeparateMobileImage ? 'hidden md:block ' : ''}object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none`}
          sizes="(max-width: 767px) 100vw, 50vw"
        />
      </>
    );

    return (
      <section className="py-4 md:py-8 bg-white border-y border-slate-100" aria-label={data.title || 'Banner'}>
        <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-center bg-slate-900 rounded-xl lg:rounded-2xl overflow-hidden p-4 sm:p-5 md:p-8 lg:p-10 text-white">
            <div className={`space-y-3 md:space-y-4 ${hideOverlayOnMobile ? 'hidden md:block' : ''}`}>
              {data.badge && (
                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] md:text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {data.badge}
                </span>
              )}
              <h2 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                {mobileTitle ? (
                  <>
                    <span className="md:hidden">{mobileTitle}</span>
                    <span className="hidden md:inline">{data.title}</span>
                  </>
                ) : (
                  data.title
                )}
              </h2>
              {(data.subtitle || mobileSubtitle) && (
                <p className="text-slate-300 text-xs md:text-sm lg:text-base leading-relaxed">
                  {mobileSubtitle ? (
                    <>
                      <span className="md:hidden">{mobileSubtitle}</span>
                      <span className="hidden md:inline">{data.subtitle}</span>
                    </>
                  ) : (
                    data.subtitle
                  )}
                </p>
              )}
              <div className="pt-1 flex flex-wrap gap-2.5">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="min-h-11 inline-flex items-center justify-center px-4 md:px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs md:text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="min-h-11 inline-flex items-center justify-center px-4 md:px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white font-semibold text-xs md:text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
            <div className="relative h-[176px] sm:h-[200px] md:h-[240px] lg:h-[300px] rounded-lg lg:rounded-xl overflow-hidden group">
              {data.link ? (
                <Link href={data.link} className="block relative w-full h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden rounded-lg lg:rounded-xl overflow-hidden" aria-label={data.title || 'Banner'}>
                  {splitImages}
                </Link>
              ) : (
                splitImages
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#0f172a] relative overflow-hidden" aria-label={data.title || 'Hero Banner'}>
      <div className="w-full relative min-h-[188px] sm:min-h-[208px] md:h-[260px] lg:h-[340px]">
        {hasSeparateMobileImage && (
          <Image
            src={mobileImageUrl}
            alt={mobileTitle || data.title || 'Hero banner'}
            width={800}
            height={540}
            className="md:hidden absolute inset-0 w-full h-full object-cover object-right"
            priority
            fetchPriority="high"
            unoptimized={mobileImageUrl.startsWith('/brand/')}
            sizes="100vw"
          />
        )}
        <Image
          src={imageUrl}
          alt={data.title || 'Hero banner'}
          width={1920}
          height={600}
          className={`${hasSeparateMobileImage ? 'hidden md:block ' : ''}absolute inset-0 w-full h-full object-cover`}
          priority
          fetchPriority="high"
          unoptimized={imageUrl.startsWith('/brand/')}
          sizes="100vw"
        />
        {hideOverlayOnMobile && data.link && (
          <Link
            href={data.link}
            aria-label={mobileTitle || data.title || 'Hero Banner'}
            className="md:hidden absolute inset-0 z-10"
          />
        )}
        <div
          className={`relative z-10 min-h-[188px] sm:min-h-[208px] md:min-h-0 md:absolute md:inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent ${
            hideOverlayOnMobile ? 'hidden md:flex' : 'flex'
          } items-center py-3 sm:py-4 md:py-0`}
        >
          <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
            <div className="max-w-xl lg:max-w-2xl text-white">
              {data.badge && (
                <div className="inline-block border border-blue-500/50 rounded-md md:rounded-lg px-2.5 md:px-3.5 py-0.5 md:py-1 mb-1 sm:mb-1.5 md:mb-3 backdrop-blur-md bg-blue-900/40 shadow-lg max-w-full">
                  <span className="text-blue-300 md:text-blue-400 font-black text-[10px] md:text-xs lg:text-sm tracking-wider md:tracking-widest uppercase line-clamp-1">
                    {data.badge}
                  </span>
                </div>
              )}
              <h1 className="text-lg sm:text-xl md:text-3xl lg:text-5xl font-black mb-1 md:mb-2 italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 drop-shadow-sm leading-tight">
                {mobileTitle ? (
                  <>
                    <span className="md:hidden">{mobileTitle}</span>
                    <span className="hidden md:inline">{data.title}</span>
                  </>
                ) : (
                  data.title
                )}
              </h1>
              {(data.subtitle || mobileSubtitle) && (
                <p className="text-xs md:text-sm lg:text-base font-bold text-yellow-400 mb-2 md:mb-4 tracking-wide drop-shadow-md line-clamp-2">
                  {mobileSubtitle ? (
                    <>
                      <span className="md:hidden">{mobileSubtitle}</span>
                      <span className="hidden md:inline">{data.subtitle}</span>
                    </>
                  ) : (
                    data.subtitle
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="min-h-11 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-2 px-2.5 sm:px-4 md:px-6 lg:px-7 rounded-full uppercase text-[11px] md:text-xs lg:text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-200 transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="min-h-11 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white font-bold py-2 px-2.5 sm:px-4 md:px-6 lg:px-7 rounded-full uppercase text-[11px] md:text-xs lg:text-sm transition duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Need & Budget Pills right below Hero Banner */}
      <div className="bg-slate-900/95 border-t border-white/10 py-2">
        <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
          <nav aria-label="Chọn nhanh theo nhu cầu và tầm giá" className="flex flex-nowrap items-center gap-1.5 sm:gap-2 overflow-x-auto overscroll-x-contain hide-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-0.5 hidden sm:inline">Chọn nhanh:</span>
            {[
              { label: 'Laptop Văn phòng', href: '/laptop-van-phong' },
              { label: 'Laptop Gaming', href: '/laptop-gaming' },
              { label: 'Đồ họa · Kỹ thuật', href: '/laptop-workstation' },
              { label: 'Mỏng nhẹ', href: '/search?tag=mong-nhe' },
              { label: 'Dưới 15 triệu', href: '/search?pricePreset=under-15&maxPrice=15000000' },
              { label: '15 – 20 triệu', href: '/search?pricePreset=15-20&minPrice=15000000&maxPrice=20000000' },
              { label: '20 – 30 triệu', href: '/search?pricePreset=20-30&minPrice=20000000&maxPrice=30000000' },
              { label: 'LikeNew 99%', href: '/search?category=laptop-likenew' },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-slate-100 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition whitespace-nowrap"
              >
                {chip.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

// 2. SLIDER BLOCK
function SliderBlock({ data }: { data: unknown }) {
  return <SliderSection data={data as SliderSectionData} />;
}

// 3. PRODUCT GRID BLOCK
function resolveProductGridIcon(sectionId: string, colorTheme?: string, customIcon?: string): LucideIcon {
  if (customIcon && ICON_MAP[customIcon]) {
    return ICON_MAP[customIcon];
  }
  if (sectionId.includes('gaming') || colorTheme === 'red') return Zap;
  if (sectionId.includes('office') || sectionId.includes('ultrabook') || colorTheme === 'blue') return Briefcase;
  if (sectionId.includes('workstation') || colorTheme === 'gray') return Server;
  if (sectionId.includes('accessories') || colorTheme === 'emerald') return Headphones;
  if (sectionId.includes('best-selling') || colorTheme === 'orange') return TrendingUp;
  return Sparkles;
}

function ProductGridBlock({ section, eagerImages = false }: { section: ResolvedSectionItem; eagerImages?: boolean }) {
  const data = section.data as ProductGridSectionData;
  const limit = data.ruleCriteria?.limit && data.ruleCriteria.limit > 0 ? data.ruleCriteria.limit : 48;
  const mobileLimit = data.mobileLimit && data.mobileLimit > 0 ? data.mobileLimit : null;
  const products = dedupeSectionProducts(section.resolvedProducts || []).slice(0, limit);
  const colorClass = THEME_GRADIENT_MAP[data.colorTheme] || THEME_GRADIENT_MAP.blue;
  const links = Array.isArray(data.links) ? data.links.filter((l) => l && l.label && l.href) : [];
  const headerIconNode = createElement(
    resolveProductGridIcon(section.id, data.colorTheme, data.icon),
    { className: 'w-5 h-5 text-yellow-300' }
  );
  if (section.resolvedTabs?.length) return <ProductTabs title={data.title} subtitle={data.subtitle} tabs={section.resolvedTabs} eagerImages={eagerImages} />;

  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={data.title}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header */}
          <div className={`${colorClass} px-3 md:px-5 lg:px-6 py-2.5 md:py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4 text-white`}>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-white/15 backdrop-blur-md shadow-2xs shrink-0">
                  {headerIconNode}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase tracking-tight leading-snug">{data.title}</h2>
                    {data.badge && (
                      <span className={`text-[10px] uppercase font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full ${data.badgeColor || 'bg-white/20 text-white'}`}>
                        {data.badge}
                      </span>
                    )}
                  </div>
                  {data.subtitle && <p className="text-[11px] md:text-[12px] text-white/85 mt-0.5 line-clamp-1">{data.subtitle}</p>}
                </div>
              </div>

              {data.viewAllLink && (
                <Link
                  href={data.viewAllLink}
                  className="lg:hidden min-h-11 inline-flex items-center gap-0.5 px-2 -mr-1 rounded-lg text-[12px] font-bold text-white/95 hover:text-yellow-300 shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                >
                  <span>Tất cả</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Quick links */}
            {links.length > 0 && (
              <div className="flex min-w-0 items-center gap-1.5 md:gap-2 overflow-x-auto overscroll-x-contain lg:max-w-[62%] hide-scrollbar">
                {links.map((link: { label: string; href: string }, idx: number) => (
                  <Link
                    key={idx}
                    href={link.href}
                    className="min-h-11 inline-flex items-center px-3 py-1.5 rounded-full bg-white/15 hover:bg-white hover:text-slate-900 border border-white/15 transition duration-200 motion-reduce:transition-none whitespace-nowrap text-white font-semibold shadow-2xs text-[11px] md:text-[12px] shrink-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Product grid content */}
          <div className="p-2.5 md:p-4 lg:p-6 bg-slate-50/30">
            {products.length === 0 ? (
              <div className="text-center py-10 sm:py-12 text-slate-500">
                <p className="text-sm">Chưa có sản phẩm nào phù hợp trong danh mục này.</p>
              </div>
            ) : section.id === 'sec-hot-sale' ? <ProductCarousel products={products} label={data.title} /> : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4">
                {products.map((p, idx) => {
                  const effectiveMobileLimit = mobileLimit || 6;
                  const hideOnMobile = Boolean(idx >= effectiveMobileLimit);
                  const cardNode = (
                    <ProductCard
                      key={p.id}
                      product={p}
                      rank={data.rankNumbering ? idx + 1 : undefined}
                      imageLoading={eagerImages && idx < 4 ? 'eager' : 'lazy'}
                    />
                  );
                  return hideOnMobile ? (
                    <div key={p.id} className="hidden md:block h-full">
                      {cardNode}
                    </div>
                  ) : (
                    cardNode
                  );
                })}
              </div>
            )}

            {data.viewAllLink && (
              <div className="mt-3 sm:mt-6 text-center">
                <Link
                  href={data.viewAllLink}
                  className="min-h-11 inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white active:scale-95 text-slate-800 text-xs font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden shadow-2xs"
                >
                  Xem tất cả {data.title} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// 4. FEATURED CATEGORIES BLOCK
function FeaturedCategoriesBlock({ section }: { section: ResolvedSectionItem }) {
  const data = section.data as FeaturedCategoriesSectionData;
  const resolved = section.resolvedCategories || [];
  const rawCategories = data.items?.length
    ? data.items
        .filter((item) => item.enabled !== false)
        .flatMap((item, idx) => {
          const category = resolved.find((c) => c.id === item.categoryId);
          if (category) {
            return [
              {
                ...category,
                name: item.customName || category.name,
                image: item.customImage || category.image,
                href: item.href || category.href || `/category/${category.slug}`,
              },
            ];
          }
          if (item.customName || item.href) {
            return [
              {
                id: item.categoryId || `custom-cat-${idx}`,
                name: item.customName || 'Danh mục',
                image: item.customImage || null,
                href: item.href || '/search',
              },
            ];
          }
          return [];
        })
    : resolved.map((c) => ({ ...c, href: c.href || `/category/${c.slug}` }));

  const categories = data.limit && data.limit > 0 ? rawCategories.slice(0, data.limit) : rawCategories;

  if (categories.length === 0) {
    return <CategoryGridSection />;
  }

  return (
    <section className="py-4 md:py-6" aria-label={data.title || 'Danh mục nổi bật'}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        {(data.title || data.viewAllLink) && (
          <div className="mb-3 md:mb-5 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              {data.title && (
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                  {data.title}
                </h2>
              )}
              {data.subtitle && <p className="text-slate-600 text-xs md:text-sm mt-0.5">{data.subtitle}</p>}
            </div>
            {data.viewAllLink && (
              <Link
                href={data.viewAllLink}
                className="min-h-11 inline-flex items-center gap-1 text-xs md:text-sm font-bold text-blue-600 hover:text-blue-700 transition shrink-0"
              >
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        <div
          className={
            data.layout === 'board'
              ? 'grid grid-rows-2 grid-flow-col auto-cols-[calc((100%-24px)/4)] overflow-x-auto overscroll-x-contain snap-x snap-mandatory hide-scrollbar gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-hidden md:rounded-2xl md:p-0 md:gap-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
              : 'grid grid-rows-2 grid-flow-col auto-cols-[calc((100%-24px)/4)] overflow-x-auto overscroll-x-contain snap-x snap-mandatory hide-scrollbar gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs md:grid-rows-none md:grid-flow-row md:auto-cols-auto md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:shadow-none md:grid-cols-3 md:gap-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5'
          }
        >
          {categories.map((c: { id: string; name: string; href: string; image: string | null }, index: number) => (
            <Link
              key={`${c.id}-${index}`}
              href={c.href}
              className={
                data.layout === 'board'
                  ? 'group min-h-11 min-w-0 snap-start flex flex-col items-center justify-start p-1 rounded-lg text-center transition duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden md:flex-row md:items-center md:justify-start md:gap-3 md:rounded-none md:border-b md:border-r md:border-slate-100 md:p-3.5 lg:p-4 md:text-left md:hover:bg-blue-50/70 motion-reduce:transition-none'
                  : 'group min-h-11 min-w-0 snap-start flex flex-col items-center justify-start p-1 rounded-lg text-center transition duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden md:rounded-xl lg:rounded-2xl md:border md:border-slate-200/80 md:bg-white md:p-3.5 lg:p-4 md:shadow-xs md:hover:-translate-y-1 md:hover:border-blue-500 md:hover:shadow-md motion-reduce:md:hover:translate-y-0 motion-reduce:transition-none'
              }
            >
              <div
                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-200/60 transition group-hover:scale-105 motion-reduce:group-hover:scale-100 ${
                  data.layout === 'board'
                    ? 'mb-1.5 h-11 w-11 md:mb-0 md:h-14 md:w-14 lg:h-16 lg:w-16 md:bg-white md:border-slate-100'
                    : 'mb-1.5 h-11 w-11 md:mb-2.5 md:h-14 md:w-14 lg:h-16 lg:w-16 md:bg-white md:border-0'
                }`}
              >
                {c.image ? (() => {
                  const catImg = c.image.startsWith('/api/library/') && !c.image.includes('?') ? `${c.image}?size=thumb&v=2` : c.image;
                  return (
                    <Image
                      src={catImg}
                      alt={c.name}
                      fill
                      loading={index < 5 ? 'eager' : 'lazy'}
                      unoptimized={catImg.includes('size=thumb') || catImg.startsWith('/brand/')}
                      className="object-contain p-1"
                      sizes="(max-width: 767px) 44px, 64px"
                    />
                  );
                })() : (
                  <Store className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                )}
              </div>
              <h3 className="text-[11px] md:text-xs lg:text-sm font-semibold md:font-bold text-slate-800 group-hover:text-blue-600 transition leading-tight line-clamp-2 w-full">
                {c.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// 5. FEATURED BRANDS BLOCK
function FeaturedBrandsBlock({ section }: { section: ResolvedSectionItem }) {
  const data = (section.data || {}) as {
    title?: string;
    subtitle?: string;
    limit?: number;
    viewAllLink?: string;
    items?: Array<{ id?: string; name: string; subtitle?: string; href?: string; logo?: string; enabled?: boolean }>;
  };
  const customItems = data.items?.filter((i) => i.enabled !== false && i.name?.trim());
  const brandsList = customItems?.length
    ? customItems
    : section.resolvedBrands?.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logo: b.logo,
        subtitle: b.description || 'Chính hãng',
        href: `/brand/${b.slug}`,
      }));
  const limitedBrands = data.limit && data.limit > 0 && brandsList ? brandsList.slice(0, data.limit) : brandsList;
  return (
    <BrandSection
      title={data.title}
      subtitle={data.subtitle}
      viewAllLink={data.viewAllLink}
      brands={limitedBrands}
    />
  );
}

// 6. FEATURED COLLECTION BLOCK
function FeaturedCollectionBlock({ section }: { section: ResolvedSectionItem }) {
  const col = section.resolvedCollection;
  const data = (section.data || {}) as { title?: string; subtitle?: string; limit?: number; viewAllLink?: string };

  if (!col) return null;
  const dedupedColProducts = dedupeSectionProducts(col.products || []);
  const displayProducts = data.limit && data.limit > 0 ? dedupedColProducts.slice(0, data.limit) : dedupedColProducts;
  const targetHref = data.viewAllLink || `/collection/${col.slug}`;

  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={data.title || col.name}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 px-3 md:px-5 lg:px-6 py-2.5 md:py-3.5 flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black uppercase tracking-tight leading-snug">{data.title || col.name}</h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">Bộ Sưu Tập</span>
              </div>
              {(data.subtitle || col.description) && (
                <p className="text-[11px] md:text-[12px] text-white/85 mt-0.5">{data.subtitle || col.description}</p>
              )}
            </div>
            <Link
              href={targetHref}
              className="min-h-11 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-[12px] font-bold transition shrink-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-2.5 md:p-4 lg:p-6 bg-slate-50/30">
            {displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-3 lg:gap-4">
                {displayProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-sm">
                Bộ sưu tập đang được cập nhật sản phẩm.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// 7. NEWS & REVIEWS BLOCK
function NewsReviewsBlock({ section }: { section: ResolvedSectionItem }) {
  const d = newsReviewsSectionDataSchema.parse(section.data);
  const items = section.resolvedPosts ?? [];
  return <MediaSection posts={items} title={d.title} subtitle={d.subtitle} viewAllLink={d.viewAllLink} />;
}

// 8. INTRO & FEATURE STRIP BLOCK
interface IntroBlockItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  href?: string;
  enabled?: boolean;
}

interface IntroBlockData {
  title?: string;
  subtitle?: string;
  features?: IntroBlockItem[];
}

function IntroBlock({ data, settings }: { data: unknown; settings?: PublicStorefrontSettings | null }) {
  const d = (data || {}) as IntroBlockData;
  const activeFeatures = Array.isArray(d.features)
    ? d.features.filter((f) => f && f.enabled !== false)
    : [];

  if (activeFeatures.length === 0) {
    return <FeatureStrip settings={settings} />;
  }

  return (
    <section className="py-2 md:py-3.5 bg-white border-y border-slate-100" aria-label={d.title || 'Cam kết dịch vụ'}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        {d.title && (
          <div className="text-center mb-2.5 md:mb-4">
            <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black text-slate-900 leading-snug">{d.title}</h2>
            {d.subtitle && <p className="text-[12px] md:text-[13px] text-slate-500 mt-0.5">{d.subtitle}</p>}
          </div>
        )}

        <div className="flex flex-nowrap overflow-x-auto md:overflow-visible overscroll-x-contain snap-x snap-mandatory hide-scrollbar -mx-1 px-1 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
          {activeFeatures.map((item) => {
            const Icon = ICON_MAP[item.icon] || Star;
            const cardContent = (
              <>
                <div className="flex items-center gap-1.5 lg:gap-2 min-w-0">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-md lg:rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-700 transition">
                    <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  </div>
                  <h3 className="font-bold text-[12px] md:text-[13px] lg:text-[14px] text-slate-900 group-hover:text-blue-700 transition leading-tight min-w-0 flex-1">
                    {item.title}
                  </h3>
                  {item.href && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
                  )}
                </div>
                <p className="text-[11px] md:text-[12px] text-slate-600 leading-snug line-clamp-2">{item.description}</p>
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="w-[220px] sm:w-[240px] md:w-auto shrink-0 snap-start group min-h-11 p-2 md:p-3 lg:p-3.5 rounded-lg lg:rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs flex flex-col justify-start gap-1 hover:bg-blue-50/50 hover:border-blue-200 transition motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <div
                key={item.id}
                className="w-[220px] sm:w-[240px] md:w-auto shrink-0 snap-start group p-2 md:p-3 lg:p-3.5 rounded-lg lg:rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs flex flex-col justify-start gap-1 hover:bg-blue-50/40 hover:border-blue-200 transition motion-reduce:transition-none"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// 9. CTA BLOCK
function CtaBlock({ data }: { data: unknown }) {
  const d = ctaSectionDataSchema.parse(data);
  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={d.title || 'Kêu gọi hành động'}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="grid gap-4 md:gap-6 lg:gap-8 overflow-hidden rounded-xl lg:rounded-2xl bg-slate-900 text-white md:grid-cols-2 border border-slate-800 shadow-sm">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center">
            <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-black leading-snug">{d.title}</h2>
            <p className="mt-2 md:mt-3 text-[12px] md:text-[14px] text-slate-300 leading-relaxed">{d.subtitle}</p>
            <div className="mt-4 md:mt-5 flex flex-wrap gap-2.5 md:gap-3">
              {d.primaryLink && (
                <Link
                  href={d.primaryLink}
                  className="min-h-11 inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-4 md:px-5 py-2.5 text-[12px] md:text-[14px] font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                >
                  {d.primaryText}
                </Link>
              )}
              {d.secondaryLink && (
                <Link
                  href={d.secondaryLink}
                  className="min-h-11 inline-flex items-center justify-center rounded-xl border border-slate-500 hover:bg-white/10 active:scale-95 px-4 md:px-5 py-2.5 text-[12px] md:text-[14px] font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                >
                  {d.secondaryText}
                </Link>
              )}
            </div>
            {d.phone && (
              <a
                href={`tel:${d.phone.replace(/[^+\d]/g, '')}`}
                className="min-h-11 mt-3 md:mt-4 inline-flex items-center self-start text-[16px] md:text-[18px] font-bold text-yellow-400 hover:text-yellow-300 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
              >
                {d.phone}
              </a>
            )}
          </div>
          {d.bgImageUrl && (
            <Image
              src={d.bgImageUrl}
              alt="Showroom CitiLap"
              width={800}
              height={600}
              className="h-full min-h-48 md:min-h-64 w-full object-cover"
            />
          )}
        </div>
      </div>
    </section>
  );
}
