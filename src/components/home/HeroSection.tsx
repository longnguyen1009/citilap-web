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
    <>
      {/* 1. HERO SECTION */}
      <section className="bg-[#0f172a] relative" aria-label="Banner nổi bật">
        <div className="w-full relative h-[196px] sm:h-[360px] md:h-[420px] lg:h-[500px] overflow-hidden">
          {hasSeparateMobileHero && (
            <Image
              src={settings.heroMobileBgImage}
              alt={`${settings.heroTitle} ${settings.heroHighlight}`}
              width={800}
              height={540}
              className="sm:hidden absolute inset-0 w-full h-full object-cover object-right"
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
            className={`${hasSeparateMobileHero ? "hidden sm:block " : ""}absolute inset-0 w-full h-full object-cover`}
            priority
            fetchPriority="high"
            unoptimized={settings.heroBgImage.startsWith("/brand/")}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent flex items-center">
            <div className="container mx-auto px-3 sm:px-4 max-w-[1370px]">
              <div className="max-w-xl text-white">
                {settings.heroBadge && (
                  <div className="inline-block border border-blue-500/50 rounded-md sm:rounded-lg px-2 sm:px-3.5 py-0.5 sm:py-1.5 mb-1.5 sm:mb-6 backdrop-blur-md bg-blue-900/40 shadow-lg">
                    <span className="text-blue-400 font-black text-[9.5px] sm:text-sm md:text-base tracking-wider sm:tracking-widest uppercase">
                      {settings.heroBadge}
                    </span>
                  </div>
                )}
                <h1 className="text-xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-1.5 sm:mb-4 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 drop-shadow-sm">
                  {settings.heroTitle}{" "}
                  <span className="text-blue-500">{settings.heroHighlight}</span>
                </h1>
                {settings.heroSlogan && (
                  <p className="text-[11px] sm:text-lg md:text-2xl font-bold text-yellow-400 mb-2.5 sm:mb-8 tracking-wide drop-shadow-md text-balance line-clamp-2">
                    {settings.heroSlogan}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  <Link
                    href={settings.heroCtaPrimaryLink}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 sm:py-3 px-4 sm:px-8 rounded-full uppercase text-[10.5px] sm:text-sm md:text-base shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-200 transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaPrimaryText}
                  </Link>
                  <Link
                    href={settings.heroCtaSecondaryLink}
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white font-bold py-1.5 sm:py-3 px-4 sm:px-8 rounded-full uppercase text-[10.5px] sm:text-sm md:text-base transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaSecondaryText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SUB-BANNERS (2-col compact cards on Smartphone & Desktop) */}
      <section className="py-3 sm:py-6" aria-label="Khuyến mãi nổi bật">
        <div className="container mx-auto px-2.5 sm:px-4 max-w-[1370px]">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
            {/* Sub-banner 1 */}
            <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xs sm:shadow-md relative group h-[104px] sm:h-[160px] md:h-[180px]">
              <Image
                src={settings.subBanner1Image}
                alt={settings.subBanner1Title}
                width={800}
                height={300}
                loading="eager"
                unoptimized={settings.subBanner1Image.startsWith("/brand/")}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/65 to-transparent flex items-center p-2.5 sm:p-7 md:p-8">
                <div className="text-white z-10 min-w-0">
                  <h3 className="text-xs sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-2 text-yellow-400 uppercase italic drop-shadow-md leading-tight line-clamp-1">
                    {settings.subBanner1Title}
                  </h3>
                  <p className="font-semibold sm:font-bold text-[10px] sm:text-sm md:text-base mb-1.5 sm:mb-4 opacity-95 line-clamp-1">
                    {settings.subBanner1Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner1Link}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1 sm:py-2 px-2.5 sm:px-6 rounded-full uppercase text-[9.5px] sm:text-xs md:text-sm shadow-xs sm:shadow-md transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
                    aria-label={`Xem ngay ${settings.subBanner1Title}`}
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>

            {/* Sub-banner 2 */}
            <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xs sm:shadow-md relative group h-[104px] sm:h-[160px] md:h-[180px]">
              <Image
                src={settings.subBanner2Image}
                alt={settings.subBanner2Title}
                width={800}
                height={300}
                loading="eager"
                unoptimized={settings.subBanner2Image.startsWith("/brand/")}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-900/65 to-transparent flex items-center p-2.5 sm:p-7 md:p-8">
                <div className="text-white z-10 min-w-0">
                  <h3 className="text-xs sm:text-2xl md:text-3xl font-black mb-0.5 sm:mb-2 text-yellow-400 uppercase italic drop-shadow-md leading-tight line-clamp-1">
                    {settings.subBanner2Title}
                  </h3>
                  <p className="font-semibold sm:font-bold text-[10px] sm:text-sm md:text-base mb-1.5 sm:mb-4 opacity-95 line-clamp-1">
                    {settings.subBanner2Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner2Link}
                    className="inline-flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold py-1 sm:py-2 px-2.5 sm:px-6 rounded-full uppercase text-[9.5px] sm:text-xs md:text-sm shadow-xs sm:shadow-md transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
                    aria-label={`Mua ngay ${settings.subBanner2Title}`}
                  >
                    Mua ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
