import Link from 'next/link';

/**
 * Swappable horizontal campaign strip banner rendered right below the homepage Hero Banner.
 * Renders at its natural full-width aspect ratio (e.g. 1600x245 on desktop) without cropping,
 * and supports a dedicated mobile image when configured in Admin -> Banner Ảnh Động.
 */
export default function CampaignStripBanner({
  href = '/black-friday',
  imageSrc = '/images/banners/campaign-strip.webp',
  mobileImageSrc,
  alt = 'Black Friday CitiLap 2026 (25/11 - 29/11) — Săn Deal Laptop LikeNew 99% giảm tới 999K',
}: {
  href?: string;
  imageSrc?: string;
  mobileImageSrc?: string;
  alt?: string;
}) {
  const cleanMobile = mobileImageSrc?.trim() || '';
  return (
    <section
      aria-label="Banner chiến dịch nổi bật"
      className="w-full mx-auto max-w-[1370px] px-3 md:px-4 pt-2.5 pb-1.5"
    >
      <Link
        href={href}
        className="group block overflow-hidden rounded-xl md:rounded-2xl border border-red-500/25 bg-[#0b0b10] shadow-sm hover:shadow-lg hover:shadow-red-900/20 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        {cleanMobile ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={cleanMobile} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={alt}
              decoding="async"
              className="w-full h-auto block group-hover:scale-[1.008] transition-transform duration-300"
            />
          </picture>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={alt}
            decoding="async"
            className="w-full h-auto block group-hover:scale-[1.008] transition-transform duration-300"
          />
        )}
      </Link>
    </section>
  );
}
