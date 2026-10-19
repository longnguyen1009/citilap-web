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
import type { ResolvedSectionItem } from '@/server/services/site-builder.service';
import CategoryGridSection from '@/components/home/CategoryGridSection';
import BrandSection from '@/components/home/BrandSection';
import { mediaEnvironment } from '@/server/media-http';
import { publicPostList } from '@/server/services/post.service';
import { newsReviewsSectionDataSchema, ctaSectionDataSchema } from '@/contracts/cms/site-builder';
import FeatureStrip from '@/components/home/FeatureStrip';

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

export default function BlockRenderer({ sections }: { sections: ResolvedSectionItem[] }) {
  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <div className="site-builder-content space-y-2">
      {sections.map((section) => {
        if (!section.enabled) return null;

        switch (section.type) {
          case 'banner':
            return <BannerBlock key={section.id} data={section.data} />;

          case 'slider':
            return <SliderBlock key={section.id} data={section.data} />;

          case 'product_grid':
            return <ProductGridBlock key={section.id} section={section} />;

          case 'featured_categories':
            return <FeaturedCategoriesBlock key={section.id} section={section} />;

          case 'featured_brands':
            return <FeaturedBrandsBlock key={section.id} />;

          case 'featured_collection':
            return <FeaturedCollectionBlock key={section.id} section={section} />;

          case 'news_reviews':
            return <NewsReviewsBlock key={section.id} data={section.data} />;

          case 'intro':
            return <IntroBlock key={section.id} data={section.data} />;

          case 'cta':
            return <CtaBlock key={section.id} data={section.data} />;

          default:
            return null;
        }
      })}
    </div>
  );
}

// 1. BANNER BLOCK
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BannerBlock({ data }: { data: any }) {
  const imageUrl = data.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
  const layout = data.layout || 'hero';

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
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">{data.title}</h2>
              {data.subtitle && <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{data.subtitle}</p>}
              <div className="pt-2 flex flex-wrap gap-3">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition"
                  >
                    {data.secondaryButtonText}
                  </Link>
                )}
              </div>
            </div>
            <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden">
              <Image src={imageUrl} alt={data.title || 'Banner'} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#0f172a] relative overflow-hidden" aria-label={data.title || 'Hero Banner'}>
      <div className="w-full relative h-[320px] sm:h-[380px] md:h-[420px] lg:h-[500px]">
        <Image
          src={imageUrl}
          alt={data.title || 'Hero banner'}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent flex items-center">
          <div className="container mx-auto px-4 max-w-[1370px]">
            <div className="max-w-2xl text-white">
              {data.badge && (
                <div className="inline-block border border-blue-500/50 rounded-lg px-3.5 py-1.5 mb-4 backdrop-blur-md bg-blue-900/40 shadow-lg">
                  <span className="text-blue-400 font-black text-xs sm:text-sm tracking-widest uppercase">
                    {data.badge}
                  </span>
                </div>
              )}
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-3 italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 drop-shadow-sm">
                {data.title}
              </h1>
              {data.subtitle && (
                <p className="text-sm sm:text-lg md:text-xl font-bold text-yellow-400 mb-6 tracking-wide drop-shadow-md">
                  {data.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {data.link && data.buttonText && (
                  <Link
                    href={data.link}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-300 transform hover:-translate-y-0.5"
                  >
                    {data.buttonText}
                  </Link>
                )}
                {data.secondaryLink && data.secondaryButtonText && (
                  <Link
                    href={data.secondaryLink}
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm transition duration-300"
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SliderBlock({ data }: { data: any }) {
  const slides = Array.isArray(data.slides) && data.slides.length > 0 ? data.slides : [];
  if (slides.length === 0) return null;

  return (
    <section className="py-6 bg-slate-900" aria-label="Slider quảng cáo">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.slice(0, 3).map((slide: { id: string; title: string; subtitle: string; imageUrl: string; link: string; buttonText: string }) => (
            <div key={slide.id} className="relative h-48 md:h-56 rounded-2xl overflow-hidden group shadow-md border border-slate-800">
              <Image
                src={slide.imageUrl || 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop'}
                alt={slide.title || 'Slide'}
                fill
                className="object-cover group-hover:scale-105 transition duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-5 text-white">
                <h3 className="font-extrabold text-base md:text-lg drop-shadow-sm">{slide.title}</h3>
                {slide.subtitle && <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{slide.subtitle}</p>}
                {slide.link && (
                  <Link href={slide.link} className="inline-flex items-center gap-1 text-xs text-blue-400 font-bold mt-2 hover:underline">
                    {slide.buttonText || 'Xem ngay'} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// 3. PRODUCT GRID BLOCK
function ProductGridBlock({ section }: { section: ResolvedSectionItem }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = section.data as any;
  const products = section.resolvedProducts || [];
  const colorClass = THEME_GRADIENT_MAP[data.colorTheme] || THEME_GRADIENT_MAP.blue;
  const links = Array.isArray(data.links) ? data.links : [];

  return (
    <section className="pb-16" aria-label={data.title}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header */}
          <div className={`${colorClass} px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tight">{data.title}</h2>
                  {data.badge && (
                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${data.badgeColor || 'bg-white/20 text-white'}`}>
                      {data.badge}
                    </span>
                  )}
                </div>
                {data.subtitle && <p className="text-xs text-white/80 mt-0.5">{data.subtitle}</p>}
              </div>
            </div>

            {/* Quick links */}
            {links.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                {links.map((link: { label: string; href: string }, idx: number) => (
                  <Link
                    key={idx}
                    href={link.href}
                    className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/25 transition whitespace-nowrap text-white font-medium"
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
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {products.map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    rank={data.rankNumbering ? idx + 1 : undefined}
                  />
                ))}
              </div>
            )}

            {data.viewAllLink && (
              <div className="mt-6 text-center">
                <Link
                  href={data.viewAllLink}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  Xem tất cả sản phẩm <ChevronRight className="w-3.5 h-3.5" />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = section.data as any;
  const categories = section.resolvedCategories || [];

  if (categories.length === 0) {
    return <CategoryGridSection />;
  }

  return (
    <section className="py-8 md:py-12" aria-label={data.title}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{data.title}</h2>
          {data.subtitle && <p className="text-slate-600 text-xs md:text-sm mt-1">{data.subtitle}</p>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group p-4 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-500 shadow-xs hover:shadow-md transition duration-200 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 relative mb-3 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden group-hover:scale-105 transition">
                {c.image ? (
                  <Image src={c.image} alt={c.name} fill className="object-contain p-1" sizes="56px" />
                ) : (
                  <Store className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition line-clamp-1">
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
function FeaturedBrandsBlock() {
  return <BrandSection />;
}

// 6. FEATURED COLLECTION BLOCK
function FeaturedCollectionBlock({ section }: { section: ResolvedSectionItem }) {
  const col = section.resolvedCollection;
  const data = (section.data || {}) as { title?: string; subtitle?: string };

  if (!col) return null;

  return (
    <section className="pb-16" aria-label={data.title || col.name}>
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
              href={`/collection/${col.slug}`}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 md:p-6 bg-slate-50/30">
            {col.products && col.products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                {col.products.map((p) => (
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
async function NewsReviewsBlock({ data }: { data: unknown }) {
  const d = newsReviewsSectionDataSchema.parse(data);
  const { DB } = await mediaEnvironment();
  const { items } = await publicPostList(DB, { ids: d.postIds, categoryId: d.categoryId || undefined, limit: d.limit });
  if (d.postIds.length) items.sort((a, b) => d.postIds.indexOf(a.id) - d.postIds.indexOf(b.id));
  if (!items.length) return null;
  return <section className="mx-auto max-w-[1370px] px-4 py-10">
    <h2 className="text-2xl font-black text-slate-900">{d.title}</h2>
    <p className="mt-2 text-slate-600">{d.subtitle}</p>
    <div className="mt-6 grid gap-6 md:grid-cols-3">{items.map(post => <Link key={post.id} href={`/news/${post.slug}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {post.coverImage && <Image src={post.coverImage.url} alt={post.coverImage.alt} width={640} height={360} className="aspect-video w-full object-contain bg-white" />}
      <div className="p-5"><h3 className="font-bold text-slate-900">{post.title}</h3><p className="mt-2 text-sm text-slate-600">{post.excerpt}</p></div>
    </Link>)}</div>
  </section>;
}

// 8. INTRO & FEATURE STRIP BLOCK
interface IntroBlockItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface IntroBlockData {
  title?: string;
  subtitle?: string;
  features?: IntroBlockItem[];
}

function IntroBlock({ data }: { data: unknown }) {
  const d = (data || {}) as IntroBlockData;
  const features = Array.isArray(d.features) && d.features.length > 0 ? d.features : null;

  if (!features) {
    return <FeatureStrip />;
  }

  return (
    <section className="py-6 md:py-8 bg-white border-y border-slate-100" aria-label={d.title || 'Cam kết dịch vụ'}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        {d.title && (
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">{d.title}</h2>
            {d.subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{d.subtitle}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((item) => {
            const Icon = ICON_MAP[item.icon] || Star;
            return (
              <div key={item.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3.5 hover:bg-blue-50/50 hover:border-blue-100 transition">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
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
  return <section className="mx-auto max-w-[1370px] px-4 py-10">
    <div className="grid gap-8 overflow-hidden rounded-3xl bg-slate-900 text-white md:grid-cols-2">
      <div className="p-8 md:p-12"><h2 className="text-3xl font-black">{d.title}</h2><p className="mt-4 text-slate-300">{d.subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          {d.primaryLink && <Link href={d.primaryLink} className="rounded-xl bg-blue-600 px-5 py-3 font-bold">{d.primaryText}</Link>}
          {d.secondaryLink && <Link href={d.secondaryLink} className="rounded-xl border border-slate-500 px-5 py-3 font-bold">{d.secondaryText}</Link>}
        </div>
        {d.phone && <a href={`tel:${d.phone.replace(/[^+\d]/g, '')}`} className="mt-6 inline-block text-xl font-bold">{d.phone}</a>}
      </div>
      {d.bgImageUrl && <Image src={d.bgImageUrl} alt="Showroom CitiLap" width={800} height={600} className="h-full min-h-64 w-full object-cover" />}
    </div>
  </section>;
}
