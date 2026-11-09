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

        switch (section.type) {
          case 'banner':
            return <BannerBlock key={section.id} data={section.data} />;

          case 'slider':
            return <SliderBlock key={section.id} data={section.data} />;

          case 'product_grid': {
            if (section.id === 'sec-hot-sale' && flashSale !== undefined) {
              const d = section.data as { title?: string };
              return (
                <div key={section.id} className="hot-sale-wrapper" aria-label={d?.title || 'HOT SALE'}>
                  {d?.title && <div className="sr-only">{d.title}</div>}
                  {flashSale}
                </div>
              );
            }
            return <ProductGridBlock key={section.id} section={section} eagerImages={sectionIndex === firstProductGridIndex} />;
          }

          case 'featured_categories':
            return <FeaturedCategoriesBlock key={section.id} section={section} />;

          case 'featured_brands':
            return <FeaturedBrandsBlock key={section.id} section={section} />;

          case 'featured_collection':
            return <FeaturedCollectionBlock key={section.id} section={section} />;

          case 'news_reviews':
            return <NewsReviewsBlock key={section.id} section={section} />;

          case 'intro':
            return <IntroBlock key={section.id} data={section.data} settings={settings} />;

          case 'cta':
            return <CtaBlock key={section.id} data={section.data} />;
          case 'video_reviews': {
            const vData = videoReviewsSectionDataSchema.parse(section.data);
            return (
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
          }
          case 'customer_gallery': {
            const data = customerGallerySectionDataSchema.parse(section.data);
            return (
              <CustomerGallery
                key={section.id}
                title={data.title}
                subtitle={data.subtitle}
                limit={data.limit}
                images={data.images}
              />
            );
          }

          default:
            return null;
        }
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
  const layout = data.layout || 'hero';

  if (layout === 'fullwidth') {
    return (
      <section className="w-full relative overflow-hidden" aria-label={data.title || 'Banner'}>
        <div className="container mx-auto px-4 max-w-[1370px] py-3 md:py-4">
          <div className="relative w-full h-[140px] sm:h-[180px] md:h-[220px] rounded-2xl overflow-hidden shadow-xs border border-slate-200">
            {data.link ? (
              <Link href={data.link} className="block relative w-full h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden" aria-label={data.title || 'Banner'}>
                <Image src={imageUrl} alt={data.title || 'Banner'} fill className="object-cover transition-transform duration-500 hover:scale-[1.02] motion-reduce:transform-none" sizes="100vw" />
              </Link>
            ) : (
              <Image src={imageUrl} alt={data.title || 'Banner'} fill className="object-cover" sizes="100vw" />
            )}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'split') {
    return (
      <section className="py-8 md:py-12 bg-white border-y border-slate-100" aria-label={data.title || 'Banner'}>
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900 rounded-3xl overflow-hidden p-6 md:p-12 text-white">
            <div className="space-y-4">
              {data.badge && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {data.badge}
                </span>
              )}
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">{data.title}</h2>
              {data.subtitle && <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{data.subtitle}</p>}
              <div className="pt-2 flex flex-wrap gap-3">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white font-semibold text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
            <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden group">
              {data.link ? (
                <Link href={data.link} className="block relative w-full h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden rounded-2xl overflow-hidden" aria-label={data.title || 'Banner'}>
                  <Image src={imageUrl} alt={data.title || 'Banner'} fill className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none" sizes="(max-width: 768px) 100vw, 50vw" />
                </Link>
              ) : (
                <Image src={imageUrl} alt={data.title || 'Banner'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#0f172a] relative overflow-hidden" aria-label={data.title || 'Hero Banner'}>
      <div className="w-full relative h-[260px] sm:h-[280px] lg:h-[300px]">
        <Image
          src={imageUrl}
          alt={data.title || 'Hero banner'}
          width={1920}
          height={600}
          className="absolute inset-0 w-full h-full object-cover"
          priority
          fetchPriority="high"
          unoptimized={imageUrl.startsWith('/brand/')}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent flex items-center">
          <div className="container mx-auto px-4 max-w-[1370px]">
            <div className="max-w-2xl text-white">
              {data.badge && (
                <div className="inline-block border border-blue-500/50 rounded-lg px-3.5 py-1.5 mb-3 sm:mb-4 backdrop-blur-md bg-blue-900/40 shadow-lg">
                  <span className="text-blue-400 font-black text-xs sm:text-sm tracking-widest uppercase">
                    {data.badge}
                  </span>
                </div>
              )}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-2 italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 drop-shadow-sm leading-tight">
                {data.title}
              </h1>
              {data.subtitle && (
                <p className="text-xs sm:text-base font-bold text-yellow-400 mb-4 tracking-wide drop-shadow-md">
                  {data.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-200 transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {data.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
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
  const products = (section.resolvedProducts || []).slice(0, limit);
  const colorClass = THEME_GRADIENT_MAP[data.colorTheme] || THEME_GRADIENT_MAP.blue;
  const links = Array.isArray(data.links) ? data.links.filter((l) => l && l.label && l.href) : [];
  const headerIconNode = createElement(
    resolveProductGridIcon(section.id, data.colorTheme, data.icon),
    { className: 'w-5 h-5 text-yellow-300' }
  );
  if (section.resolvedTabs?.length) return <ProductTabs title={data.title} subtitle={data.subtitle} tabs={section.resolvedTabs} eagerImages={eagerImages} />;

  return (
    <section className="pb-12 md:pb-16" aria-label={data.title}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header */}
          <div className={`${colorClass} px-4 md:px-6 py-3.5 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md shadow-2xs shrink-0">
                {headerIconNode}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">{data.title}</h2>
                  {data.badge && (
                    <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${data.badgeColor || 'bg-white/20 text-white'}`}>
                      {data.badge}
                    </span>
                  )}
                </div>
                {data.subtitle && <p className="text-xs text-white/85 mt-0.5">{data.subtitle}</p>}
              </div>
            </div>

            {/* Quick links */}
            {links.length > 0 && (
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto overscroll-x-contain pb-1 sm:max-w-[62%] sm:pb-0 hide-scrollbar text-xs">
                {links.map((link: { label: string; href: string }, idx: number) => (
                  <Link
                    key={idx}
                    href={link.href}
                    className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white hover:text-slate-900 border border-white/15 transition whitespace-nowrap text-white font-semibold shadow-2xs"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Product grid content */}
          <div className="p-4 md:p-6 bg-slate-50/30">
            {products.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">Chưa có sản phẩm nào phù hợp trong danh mục này.</p>
              </div>
            ) : section.id === 'sec-hot-sale' ? <ProductCarousel products={products} label={data.title} /> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {products.map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    rank={data.rankNumbering ? idx + 1 : undefined}
                    imageLoading={eagerImages && idx < 5 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
            )}

            {data.viewAllLink && (
              <div className="mt-6 text-center">
                <Link
                  href={data.viewAllLink}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-slate-100 hover:bg-blue-600 hover:text-white active:scale-95 text-slate-800 text-xs font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden shadow-2xs"
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
      <div className="container mx-auto px-4 max-w-[1370px]">
        {(data.title || data.viewAllLink) && (
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              {data.title && <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{data.title}</h2>}
              {data.subtitle && <p className="text-slate-600 text-xs md:text-sm mt-1">{data.subtitle}</p>}
            </div>
            {data.viewAllLink && (
              <Link
                href={data.viewAllLink}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition"
              >
                Xem tất cả <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        <div className={data.layout === 'board' ? 'grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3 lg:grid-cols-5 shadow-2xs' : 'grid grid-rows-2 grid-flow-col auto-cols-[44%] overflow-x-auto overscroll-x-contain snap-x snap-mandatory hide-scrollbar gap-2.5 pb-1 sm:grid-rows-none sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible sm:pb-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5'}>
          {categories.map((c: { id: string; name: string; href: string; image: string | null }, index: number) => (
            <Link
              key={`${c.id}-${index}`}
              href={c.href}
              className={data.layout === 'board'
                ? 'group flex min-w-0 items-center gap-3 border-b border-r border-slate-100 p-3 hover:bg-blue-50/70 active:scale-[0.99] transition duration-150 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden sm:p-4'
                : 'group snap-start flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4 text-center shadow-xs transition duration-150 hover:border-blue-500 hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden'
              }
            >
              <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white transition group-hover:scale-105 motion-reduce:group-hover:scale-100 ${data.layout === 'board' ? 'h-14 w-14' : 'mb-2 h-16 w-20 sm:mb-3 sm:h-20 sm:w-24'}`}>
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
                      sizes="80px"
                    />
                  );
                })() : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition line-clamp-2">
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
  const displayProducts = data.limit && data.limit > 0 ? (col.products || []).slice(0, data.limit) : (col.products || []);
  const targetHref = data.viewAllLink || `/collection/${col.slug}`;

  return (
    <section className="pb-12 md:pb-16" aria-label={data.title || col.name}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 px-6 py-4 flex items-center justify-between text-white">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">{data.title || col.name}</h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">Bộ Sưu Tập</span>
              </div>
              {(data.subtitle || col.description) && (
                <p className="text-xs text-white/80 mt-0.5">{data.subtitle || col.description}</p>
              )}
            </div>
            <Link
              href={targetHref}
              className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 md:p-6 bg-slate-50/30">
            {displayProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
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
    <section className="py-3 bg-white border-y border-slate-100" aria-label={d.title || 'Cam kết dịch vụ'}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        {d.title && (
          <div className="text-center mb-5">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">{d.title}</h2>
            {d.subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{d.subtitle}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {activeFeatures.map((item) => {
            const Icon = ICON_MAP[item.icon] || Star;
            const cardContent = (
              <>
                <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs group-hover:bg-blue-700 transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition">{item.title}</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{item.description}</p>
                </div>
                {item.href && (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 self-center transition group-hover:translate-x-0.5" />
                )}
              </>
            );
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5 hover:bg-blue-50/60 hover:border-blue-200 hover:shadow-2xs transition"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <div
                key={item.id}
                className="group p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5 hover:bg-blue-50/40 hover:border-blue-100 transition"
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
    <section className="mx-auto max-w-[1370px] px-4 py-10" aria-label={d.title || 'Kêu gọi hành động'}>
      <div className="grid gap-8 overflow-hidden rounded-3xl bg-slate-900 text-white md:grid-cols-2">
        <div className="p-8 md:p-12">
          <h2 className="text-3xl font-black">{d.title}</h2>
          <p className="mt-4 text-slate-300">{d.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            {d.primaryLink && (
              <Link
                href={d.primaryLink}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 px-5 py-3 font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
              >
                {d.primaryText}
              </Link>
            )}
            {d.secondaryLink && (
              <Link
                href={d.secondaryLink}
                className="rounded-xl border border-slate-500 hover:bg-white/10 active:scale-95 px-5 py-3 font-bold transition duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
              >
                {d.secondaryText}
              </Link>
            )}
          </div>
          {d.phone && (
            <a
              href={`tel:${d.phone.replace(/[^+\d]/g, '')}`}
              className="mt-6 inline-block text-xl font-bold text-yellow-400 hover:text-yellow-300 active:scale-95 transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
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
            className="h-full min-h-64 w-full object-cover"
          />
        )}
      </div>
    </section>
  );
}
