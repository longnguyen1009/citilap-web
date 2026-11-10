import Link from "next/link";
import Image from "next/image";
import { DEFAULT_SETTINGS, type StorefrontSettings } from "@/contracts/cms/settings";

interface HeroSectionProps {
  settings?: Partial<StorefrontSettings>;
}

export default function HeroSection({ settings: customSettings }: HeroSectionProps) {
  const raw = { ...DEFAULT_SETTINGS, ...customSettings };
  const heroBgImage = raw.heroBgImage?.trim() || DEFAULT_SETTINGS.heroBgImage;
  const heroMobileBgImage =
    raw.heroMobileBgImage?.trim() ||
    (heroBgImage === "/brand/marketing-banner.webp" || heroBgImage === "/brand/citilap-hero.webp"
      ? "/brand/citilap-hero-mobile.webp"
      : "");
  const hasSeparateMobileHero = Boolean(heroMobileBgImage && heroMobileBgImage !== heroBgImage);
  const settings = {
    ...raw,
    heroBgImage,
    heroMobileBgImage,
    heroCtaPrimaryLink: raw.heroCtaPrimaryLink?.trim() || DEFAULT_SETTINGS.heroCtaPrimaryLink,
    heroCtaSecondaryLink: raw.heroCtaSecondaryLink?.trim() || DEFAULT_SETTINGS.heroCtaSecondaryLink,
    subBanner1Image: raw.subBanner1Image?.trim() || DEFAULT_SETTINGS.subBanner1Image,
    subBanner1Link: raw.subBanner1Link?.trim() || DEFAULT_SETTINGS.subBanner1Link,
    subBanner2Image: raw.subBanner2Image?.trim() || DEFAULT_SETTINGS.subBanner2Image,
    subBanner2Link: raw.subBanner2Link?.trim() || DEFAULT_SETTINGS.subBanner2Link,
  };

  return (
    <section className="py-3 md:py-5 bg-slate-50/60 border-b border-slate-200/70" aria-label="Banner nổi bật và khuyến mãi">
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5 sm:gap-3 lg:gap-4">
          {/* 1. MAIN HERO (Left 2fr on PC) */}
          <div className="relative w-full min-h-[188px] sm:min-h-[208px] md:h-[260px] lg:h-[360px] rounded-lg lg:rounded-xl overflow-hidden bg-[#0f172a] shadow-xs border border-slate-800/80">
            {hasSeparateMobileHero && (
              <Image
                src={settings.heroMobileBgImage}
                alt={`${settings.heroTitle} ${settings.heroHighlight}`}
                width={800}
                height={540}
                className="md:hidden absolute inset-0 w-full h-full object-cover object-right"
                priority
                fetchPriority="high"
                unoptimized={settings.heroMobileBgImage.startsWith("/brand/")}
                sizes="100vw"
              />
            )}
            <Image
              src={settings.heroBgImage}
              alt={`${settings.heroTitle} ${settings.heroHighlight}`}
              width={1920}
              height={600}
              className={`${hasSeparateMobileHero ? "hidden md:block " : ""}absolute inset-0 w-full h-full object-cover`}
              priority
              fetchPriority="high"
              unoptimized={settings.heroBgImage.startsWith("/brand/")}
              sizes="(max-width: 1023px) 100vw, 66vw"
            />
            <div className="relative z-10 min-h-[188px] sm:min-h-[208px] md:min-h-0 md:absolute md:inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent flex items-center px-3 py-3 sm:p-5 md:p-7 lg:p-8">
              <div className="max-w-lg lg:max-w-xl text-white min-w-0">
                {settings.heroBadge && (
                  <div className="inline-block border border-blue-500/50 rounded-md lg:rounded-lg px-2.5 py-0.5 md:py-1 mb-1 sm:mb-1.5 md:mb-3 backdrop-blur-md bg-blue-900/40 shadow-lg max-w-full">
                    <span className="text-blue-400 font-black text-[10px] md:text-xs lg:text-sm tracking-wider uppercase line-clamp-1">
                      {settings.heroBadge}
                    </span>
                  </div>
                )}
                <h1 className="text-lg sm:text-xl md:text-4xl lg:text-5xl font-black mb-1 md:mb-2.5 italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300 drop-shadow-sm leading-tight">
                  {settings.heroTitle}{" "}
                  <span className="text-blue-500">{settings.heroHighlight}</span>
                </h1>
                {settings.heroSlogan && (
                  <p className="text-[11px] sm:text-xs md:text-base font-bold text-yellow-400 mb-2 md:mb-5 tracking-wide drop-shadow-md text-balance line-clamp-2">
                    {settings.heroSlogan}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3">
                  <Link
                    href={settings.heroCtaPrimaryLink}
                    className="min-h-11 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-2 px-2.5 sm:px-5 lg:px-6 rounded-full uppercase text-[11px] md:text-xs lg:text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-200 transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaPrimaryText}
                  </Link>
                  <Link
                    href={settings.heroCtaSecondaryLink}
                    className="min-h-11 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white font-bold py-2 px-2.5 sm:px-5 lg:px-6 rounded-full uppercase text-[11px] md:text-xs lg:text-sm transition duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaSecondaryText}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SUB-BANNERS (2-col beneath on SP/Tablet, 2 equal stacked rows on PC Bento) */}
          <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-2.5 sm:gap-3 lg:gap-4 lg:h-[360px]">
            {/* Sub-banner 1 */}
            <div className="rounded-lg lg:rounded-xl overflow-hidden shadow-xs relative group h-[108px] sm:h-[124px] md:h-[148px] lg:h-full border border-slate-200/70">
              <Image
                src={settings.subBanner1Image}
                alt={settings.subBanner1Title}
                width={800}
                height={300}
                loading="eager"
                unoptimized={settings.subBanner1Image.startsWith("/brand/")}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="(max-width: 1023px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/65 to-transparent flex items-center p-2.5 sm:p-4 lg:p-5">
                <div className="text-white z-10 min-w-0">
                  <h2 className="text-xs sm:text-sm md:text-lg lg:text-xl font-black mb-0.5 text-yellow-400 uppercase italic drop-shadow-md leading-tight line-clamp-1">
                    {settings.subBanner1Title}
                  </h2>
                  <p className="font-semibold text-[11px] md:text-xs lg:text-sm mb-1.5 lg:mb-2.5 opacity-95 line-clamp-1">
                    {settings.subBanner1Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner1Link}
                    className="min-h-11 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 px-3 lg:px-4 rounded-full uppercase text-[10px] md:text-xs shadow-xs transition duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
                    aria-label={`Xem ngay ${settings.subBanner1Title}`}
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>

            {/* Sub-banner 2 */}
            <div className="rounded-lg lg:rounded-xl overflow-hidden shadow-xs relative group h-[108px] sm:h-[124px] md:h-[148px] lg:h-full border border-slate-200/70">
              <Image
                src={settings.subBanner2Image}
                alt={settings.subBanner2Title}
                width={800}
                height={300}
                loading="eager"
                unoptimized={settings.subBanner2Image.startsWith("/brand/")}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="(max-width: 1023px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-900/65 to-transparent flex items-center p-2.5 sm:p-4 lg:p-5">
                <div className="text-white z-10 min-w-0">
                  <h2 className="text-xs sm:text-sm md:text-lg lg:text-xl font-black mb-0.5 text-yellow-400 uppercase italic drop-shadow-md leading-tight line-clamp-1">
                    {settings.subBanner2Title}
                  </h2>
                  <p className="font-semibold text-[11px] md:text-xs lg:text-sm mb-1.5 lg:mb-2.5 opacity-95 line-clamp-1">
                    {settings.subBanner2Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner2Link}
                    className="min-h-11 inline-flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold py-1.5 px-3 lg:px-4 rounded-full uppercase text-[10px] md:text-xs shadow-xs transition duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
                    aria-label={`Mua ngay ${settings.subBanner2Title}`}
                  >
                    Mua ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
