"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame, Pause, Play, Sparkles } from "lucide-react";

export type PromoBannerTheme = "crimson" | "sapphire" | "emerald" | "amber";

export interface PromoBannerItem {
  id: string;
  badge: string;
  highlightBadge?: string;
  title: string;
  highlight: string;
  subtitle?: string;
  ctaText: string;
  href: string;
  imageUrl: string;
  theme?: PromoBannerTheme;
  enabled?: boolean;
}

export const DEFAULT_PROMO_BANNERS: PromoBannerItem[] = [
  {
    id: "promo-gaming-500k",
    badge: "KHUYẾN MÃI HOT",
    highlightBadge: "",
    title: "LAPTOP GAMING",
    highlight: "GIẢM NGAY 500K",
    subtitle: "",
    ctaText: "Săn ngay",
    href: "/category/laptop-gaming",
    imageUrl: "/brand/banner-gaming-promo.webp",
    theme: "crimson",
    enabled: true,
  },
  {
    id: "promo-ultrabook-2026",
    badge: "CUỐI NĂM 2026",
    highlightBadge: "",
    title: "ULTRABOOK MỎNG NHẸ",
    highlight: "CẤU HÌNH CAO · MỚI ĐẸP",
    subtitle: "",
    ctaText: "Khám phá",
    href: "/category/laptop-van-phong",
    imageUrl: "/brand/banner-ultrabook-2026.webp",
    theme: "sapphire",
    enabled: true,
  },
];

const THEME_STYLES: Record<
  PromoBannerTheme,
  {
    surface: string;
    scrim: string;
    border: string;
    orbPrimary: string;
    orbSecondary: string;
    badge: string;
    highlightText: string;
    cta: string;
    accentLine: string;
    sparkColor: string;
  }
> = {
  crimson: {
    surface: "bg-[#14070d]",
    scrim: "bg-gradient-to-r from-[#12050b]/96 via-[#230914]/78 to-[#0b0f1c]/15",
    border: "border-rose-500/40 hover:border-rose-400/80 hover:shadow-lg hover:shadow-rose-950/35",
    orbPrimary: "bg-rose-500/30",
    orbSecondary: "bg-amber-400/25",
    badge: "bg-rose-500/25 text-rose-200 border-rose-400/45",
    highlightText: "from-amber-300 via-yellow-200 to-orange-300",
    cta: "bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white shadow-md shadow-rose-600/40 ring-1 ring-amber-300/50",
    accentLine: "from-rose-500 via-amber-400 to-cyan-400",
    sparkColor: "text-amber-300",
  },
  sapphire: {
    surface: "bg-[#071127]",
    scrim: "bg-gradient-to-r from-[#060e22]/96 via-[#0c1c40]/78 to-[#0f172a]/15",
    border: "border-sky-400/40 hover:border-sky-300/80 hover:shadow-lg hover:shadow-sky-950/35",
    orbPrimary: "bg-sky-400/30",
    orbSecondary: "bg-amber-300/25",
    badge: "bg-sky-500/25 text-sky-200 border-sky-400/45",
    highlightText: "from-sky-300 via-cyan-200 to-amber-200",
    cta: "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 text-white shadow-md shadow-blue-600/40 ring-1 ring-sky-300/50",
    accentLine: "from-sky-400 via-indigo-400 to-amber-300",
    sparkColor: "text-amber-200",
  },
  emerald: {
    surface: "bg-[#051b16]",
    scrim: "bg-gradient-to-r from-[#041712]/96 via-[#092d24]/78 to-[#0b1715]/15",
    border: "border-emerald-400/40 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-950/35",
    orbPrimary: "bg-emerald-400/25",
    orbSecondary: "bg-teal-300/20",
    badge: "bg-emerald-500/25 text-emerald-200 border-emerald-400/45",
    highlightText: "from-emerald-300 via-teal-200 to-amber-200",
    cta: "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/35 ring-1 ring-emerald-300/50",
    accentLine: "from-emerald-400 via-teal-300 to-cyan-400",
    sparkColor: "text-emerald-300",
  },
  amber: {
    surface: "bg-[#1a1105]",
    scrim: "bg-gradient-to-r from-[#170e04]/96 via-[#2b1a07]/78 to-[#141008]/15",
    border: "border-amber-400/40 hover:border-amber-300/80 hover:shadow-lg hover:shadow-amber-950/35",
    orbPrimary: "bg-amber-400/25",
    orbSecondary: "bg-orange-400/20",
    badge: "bg-amber-500/25 text-amber-200 border-amber-400/45",
    highlightText: "from-amber-200 via-yellow-200 to-orange-300",
    cta: "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/35 ring-1 ring-yellow-200/60",
    accentLine: "from-amber-400 via-yellow-300 to-orange-400",
    sparkColor: "text-yellow-300",
  },
};

export default function PromoDualBanners({
  banners,
  ariaLabel = "Chương trình khuyến mãi nổi bật",
}: {
  banners?: PromoBannerItem[];
  ariaLabel?: string;
}) {
  const [isPaused, setIsPaused] = useState(false);

  const activeBanners = (
    banners && banners.length > 0 ? banners.filter((b) => b.enabled !== false) : DEFAULT_PROMO_BANNERS
  ).slice(0, 2);

  if (activeBanners.length === 0) return null;

  return (
    <section
      className={`py-3 md:py-4 ${isPaused ? "promo-banners-paused" : ""}`}
      aria-label={ariaLabel}
    >
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4">
          {activeBanners.map((banner, index) => {
            const theme = THEME_STYLES[banner.theme || (index === 0 ? "crimson" : "sapphire")];
            const isFirst = index === 0;
            const imgSrc =
              banner.imageUrl?.trim() ||
              (isFirst ? "/brand/banner-gaming-promo.webp" : "/brand/banner-ultrabook-2026.webp");

            return (
              <Link
                key={banner.id || index}
                href={banner.href || "/search"}
                prefetch={false}
                className={`group relative block rounded-xl lg:rounded-2xl overflow-hidden border transition-all duration-300 ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-hidden shadow-sm ${theme.surface} ${theme.border}`}
              >
                <article className="relative h-[116px] sm:h-[126px] md:h-[136px] lg:h-[146px] flex items-center">
                  {/* Animated background photography */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100">
                      <Image
                        src={imgSrc}
                        alt={`${banner.title} ${banner.highlight}`.trim()}
                        width={1280}
                        height={714}
                        loading="eager"
                        decoding="async"
                        unoptimized={imgSrc.startsWith("/brand/")}
                        sizes="(max-width: 767px) 100vw, 50vw"
                        className="promo-banner-kenburns w-full h-full object-cover object-right"
                      />
                    </div>
                  </div>

                  {/* Gradient scrim so left-aligned copy stays crisp */}
                  <div className={`absolute inset-0 ${theme.scrim} pointer-events-none`} />

                  {/* Animated ambient orbs */}
                  <div
                    aria-hidden="true"
                    className={`promo-banner-orb absolute -left-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none ${theme.orbPrimary}`}
                  />
                  <div
                    aria-hidden="true"
                    className={`promo-banner-orb absolute right-10 -bottom-8 w-28 h-28 rounded-full blur-2xl pointer-events-none ${theme.orbSecondary}`}
                  />

                  {/* Diagonal animated light sweep */}
                  <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div
                      className={`${
                        isFirst ? "promo-banner-sheen" : "promo-banner-sheen-delayed"
                      } absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/18 to-transparent`}
                    />
                  </div>

                  {/* Floating sparkle accent */}
                  <div aria-hidden="true" className="absolute top-2.5 right-3.5 pointer-events-none">
                    <Sparkles className={`promo-banner-sparkle w-4 h-4 ${theme.sparkColor}`} />
                  </div>

                  {/* Concise left content overlay */}
                  <div className="relative z-10 w-full max-w-[66%] sm:max-w-[62%] px-3.5 sm:px-5 lg:px-6 text-white">
                    {banner.badge && (
                      <div className="mb-1">
                        <span
                          className={`promo-banner-badge-pulse inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider backdrop-blur-xs whitespace-nowrap ${theme.badge}`}
                        >
                          {isFirst ? (
                            <Flame className="w-3 h-3 shrink-0" />
                          ) : (
                            <Sparkles className="w-3 h-3 shrink-0" />
                          )}
                          <span>{banner.badge}</span>
                        </span>
                      </div>
                    )}

                    <h2 className="text-[14px] sm:text-[16px] lg:text-[19px] font-black uppercase tracking-tight leading-tight text-white drop-shadow-xs truncate">
                      {banner.title}
                    </h2>
                    <p
                      className={`text-[14px] sm:text-[17px] lg:text-[20px] font-black uppercase tracking-tight leading-tight bg-gradient-to-r bg-clip-text text-transparent drop-shadow-xs truncate ${theme.highlightText}`}
                    >
                      {banner.highlight}
                    </p>

                    <div className="mt-2 sm:mt-2.5">
                      <span
                        className={`promo-cta-pulse relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wide transition-transform duration-200 ${theme.cta}`}
                      >
                        <span
                          aria-hidden="true"
                          className="promo-cta-sheen pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                        />
                        <span className="relative z-10">{banner.ctaText || "Xem ngay"}</span>
                        <ArrowRight className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0" />
                      </span>
                    </div>
                  </div>

                  {/* Animated bottom accent bar */}
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r ${theme.accentLine} opacity-85 group-hover:opacity-100 transition-opacity`}
                  />
                </article>
              </Link>
            );
          })}
        </div>

        {/* Compact WCAG 2.2.2 Pause / Play control */}
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? "Phát hiệu ứng chuyển động banner" : "Tạm dừng hiệu ứng chuyển động banner"}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
          >
            {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
            <span>{isPaused ? "Phát hiệu ứng" : "Dừng hiệu ứng"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
