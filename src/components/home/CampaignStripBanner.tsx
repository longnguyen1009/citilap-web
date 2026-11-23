import Link from 'next/link';

/**
 * Swappable horizontal campaign strip banner rendered right below the homepage Hero Banner.
 * To update for future campaigns (Tết, Back to School, etc.), replace
 * `public/images/banners/campaign-strip.webp` and update `href` / `alt` below.
 */
export default function CampaignStripBanner({
  href = '/black-friday',
  imageSrc = '/images/banners/campaign-strip.webp',
  alt = 'Black Friday CitiLap 2026 (25/11 - 29/11) — Săn Deal Laptop LikeNew 99% giảm tới 999K',
}: {
  href?: string;
  imageSrc?: string;
  alt?: string;
}) {
  return (
    <section
      aria-label="Banner chiến dịch nổi bật"
      className="w-full mx-auto max-w-[1370px] px-3 md:px-4 pt-3 pb-2"
    >
      <Link
        href={href}
        className="group block overflow-hidden rounded-xl md:rounded-2xl border border-red-500/30 bg-[#0b0b10] shadow-md hover:shadow-xl hover:shadow-red-900/25 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={alt}
          width={1376}
          height={250}
          decoding="async"
          className="w-full h-[60px] sm:h-[88px] md:h-[115px] lg:h-[125px] block object-cover object-center group-hover:scale-[1.01] transition-transform duration-300"
        />
      </Link>
    </section>
  );
}
