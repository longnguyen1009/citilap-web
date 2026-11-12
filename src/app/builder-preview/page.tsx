import type { Metadata } from 'next';
import FlashSaleSection from '@/components/home/FlashSaleSection';
import TestimonialSection from '@/components/home/TestimonialSection';
import ContactSection from '@/components/home/ContactSection';
import BuilderPreviewFrame from '@/components/builder/BuilderPreviewFrame';
import { getStorefrontSettings } from '@/server/services/storefront-cms.service';

export const metadata: Metadata = {
  title: 'Builder preview',
  robots: { index: false, follow: false },
};

/**
 * Isolated document rendered inside the admin preview <iframe>.
 * Running in its own viewport makes responsive classes (md:hidden, hidden md:block)
 * follow the simulated device width instead of the admin window.
 * Draft sections arrive via same-origin postMessage; homepage-only server blocks
 * (Flash Sale, testimonials, contact form) are rendered here exactly as on "/".
 */
export default async function BuilderPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const isHome = page === 'home';
  const settings = await getStorefrontSettings().catch(() => null);

  return (
    <div className="bg-surface-subtle min-h-screen">
      <BuilderPreviewFrame
        settings={settings}
        flashSale={isHome ? <FlashSaleSection settings={settings} /> : undefined}
        footer={
          isHome ? (
            <>
              <TestimonialSection
                testimonials={settings?.testimonials ?? []}
                sourceUrl={settings?.testimonialsSourceUrl}
              />
              <ContactSection settings={settings} />
            </>
          ) : null
        }
      />
    </div>
  );
}
