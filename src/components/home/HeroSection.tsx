import Link from "next/link";
import Image from "next/image";
import { DEFAULT_SETTINGS, type StorefrontSettings } from "@/contracts/cms/settings";

interface HeroSectionProps {
  settings?: Partial<StorefrontSettings>;
}

export default function HeroSection({ settings: customSettings }: HeroSectionProps) {
  const settings = { ...DEFAULT_SETTINGS, ...customSettings };

  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="bg-[#0f172a] relative" aria-label="Banner nổi bật">
        <div className="w-full relative h-[320px] sm:h-[380px] md:h-[420px] lg:h-[500px] overflow-hidden">
          <Image
            src={settings.heroBgImage}
            alt={`${settings.heroTitle} ${settings.heroHighlight}`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/95 via-[#0b1221]/75 to-transparent flex items-center">
            <div className="container mx-auto px-4 max-w-[1370px]">
              <div className="max-w-xl text-white">
                <div className="inline-block border border-blue-500/50 rounded-lg px-3.5 py-1.5 mb-4 sm:mb-6 backdrop-blur-md bg-blue-900/40 shadow-lg">
                  <span className="text-blue-400 font-black text-xs sm:text-sm md:text-base tracking-widest uppercase">
                    {settings.heroBadge}
                  </span>
                </div>
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-3 sm:mb-4 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 drop-shadow-sm">
                  {settings.heroTitle}{" "}
                  <span className="text-blue-500">{settings.heroHighlight}</span>
                </h1>
                <p className="text-sm sm:text-lg md:text-2xl font-bold text-yellow-400 mb-6 sm:mb-8 tracking-wide drop-shadow-md text-balance">
                  {settings.heroSlogan}
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <Link
                    href={settings.heroCtaPrimaryLink}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm md:text-base shadow-[0_0_15px_rgba(37,99,235,0.5)] transition duration-200 transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaPrimaryText}
                  </Link>
                  <Link
                    href={settings.heroCtaSecondaryLink}
                    className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-white font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-full uppercase text-xs sm:text-sm md:text-base transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                  >
                    {settings.heroCtaSecondaryText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SUB-BANNERS */}
      <section className="py-6" aria-label="Khuyến mãi nổi bật">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Sub-banner 1 */}
            <div className="rounded-2xl overflow-hidden shadow-md relative group h-[140px] sm:h-[160px] md:h-[180px]">
              <Image
                src={settings.subBanner1Image}
                alt={settings.subBanner1Title}
                fill
                className="object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-950/90 via-blue-900/60 to-transparent flex items-center p-5 sm:p-7 md:p-8">
                <div className="text-white z-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5 sm:mb-2 text-yellow-400 uppercase italic drop-shadow-md">
                    {settings.subBanner1Title}
                  </h3>
                  <p className="font-bold text-xs sm:text-sm md:text-base mb-3 sm:mb-4 opacity-95">
                    {settings.subBanner1Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner1Link}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-1.5 sm:py-2 px-5 sm:px-6 rounded-full uppercase text-[11px] sm:text-xs md:text-sm shadow-md transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
                    aria-label={`Xem ngay ${settings.subBanner1Title}`}
                  >
                    Xem ngay
                  </Link>
                </div>
              </div>
            </div>

            {/* Sub-banner 2 */}
            <div className="rounded-2xl overflow-hidden shadow-md relative group h-[140px] sm:h-[160px] md:h-[180px]">
              <Image
                src={settings.subBanner2Image}
                alt={settings.subBanner2Title}
                fill
                className="object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition duration-500 ease-in-out"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-red-950/90 via-red-900/60 to-transparent flex items-center p-5 sm:p-7 md:p-8">
                <div className="text-white z-10">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5 sm:mb-2 text-yellow-400 uppercase italic drop-shadow-md">
                    {settings.subBanner2Title}
                  </h3>
                  <p className="font-bold text-xs sm:text-sm md:text-base mb-3 sm:mb-4 opacity-95">
                    {settings.subBanner2Subtitle}
                  </p>
                  <Link
                    href={settings.subBanner2Link}
                    className="inline-flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold py-1.5 sm:py-2 px-5 sm:px-6 rounded-full uppercase text-[11px] sm:text-xs md:text-sm shadow-md transition duration-200 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden after:absolute after:inset-0"
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
