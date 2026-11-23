import type { Metadata } from 'next';
import { mediaEnvironment } from '@/server/media-http';
import { listPublicCoupons } from '@/server/services/coupon.service';
import BlackFridayClient, { type BlackFridayProduct } from '@/components/black-friday/BlackFridayClient';
import { businessProfile } from '@/config/business-profile';
import { formatSeoTitle, formatSeoTitleString, generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo-helpers';

export const dynamic = 'force-dynamic';

const EVENT_START_ISO = '2026-11-24T17:00:00.000Z'; // 00:00 25/11/2026 GMT+7
const EVENT_END_ISO = '2026-11-29T16:59:59.000Z';   // 23:59:59 29/11/2026 GMT+7

const bfTitle = 'Black Friday 2026 — Săn Deal Laptop LikeNew 99% Giảm Tới 999K';
const bfDesc =
  'Chương trình Black Friday lớn nhất năm tại CitiLap (25/11 – 29/11/2026). Áp dụng toàn bộ Laptop LikeNew 99%: 20 deal giảm 999K, 50 deal giảm 599K, 100 deal giảm 399K trực tiếp vào giá bán.';

export const metadata: Metadata = {
  title: formatSeoTitle(bfTitle),
  description: bfDesc,
  alternates: {
    canonical: `${businessProfile.canonicalSiteUrl}/black-friday`,
  },
  openGraph: {
    title: formatSeoTitleString(bfTitle),
    description: bfDesc,
    url: `${businessProfile.canonicalSiteUrl}/black-friday`,
    type: 'website',
    siteName: businessProfile.brandName,
    locale: 'vi_VN',
    images: [{ url: `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`, alt: bfTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: formatSeoTitleString(bfTitle),
    description: bfDesc,
    images: [`${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`],
  },
};

interface RawLikeNewRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  originalPrice: number | null;
  stock: number | null;
  images: string;
  cpu: string | null;
  gpu: string | null;
  ram: string | null;
  storage: string | null;
  display: string | null;
  warranty: string | null;
  variantId: string | null;
  sku: string | null;
}

export default async function BlackFridayPage() {
  let products: BlackFridayProduct[] = [];
  let coupons = [] as Awaited<ReturnType<typeof listPublicCoupons>>;

  try {
    const { DB } = await mediaEnvironment();
    const [prodResult, publicCoupons] = await Promise.all([
      DB.prepare(
        `SELECT
          p.id, p.name, p.slug, p.brand, p.price, p.originalPrice, p.stock, p.images,
          p.cpu, p.gpu, p.ram, p.storage, p.display, p.warranty,
          (SELECT v.id FROM ProductVariant v WHERE v.productId = p.id AND v.status = 'ACTIVE' ORDER BY v.createdAt ASC LIMIT 1) AS variantId,
          (SELECT v.sku FROM ProductVariant v WHERE v.productId = p.id AND v.status = 'ACTIVE' ORDER BY v.createdAt ASC LIMIT 1) AS sku
         FROM Product p
         WHERE p.condition = 'LIKE_NEW' AND p.status = 'ACTIVE' AND p.deletedAt IS NULL
         ORDER BY p.isFeatured DESC, p.price DESC`
      ).all<RawLikeNewRow>(),
      listPublicCoupons(DB).catch(() => []),
    ]);

    coupons = publicCoupons;
    products = (prodResult.results || []).map((row) => {
      let firstImage: string | null = null;
      try {
        const imgs = JSON.parse(row.images || '[]');
        if (Array.isArray(imgs) && typeof imgs[0] === 'string') firstImage = imgs[0];
      } catch {
        firstImage = null;
      }

      return {
        id: row.id,
        variantId: row.variantId || null,
        sku: row.sku || null,
        name: row.name,
        slug: row.slug,
        brand: row.brand || 'Khác',
        price: Number(row.price),
        originalPrice: row.originalPrice != null ? Number(row.originalPrice) : null,
        stock: row.stock ?? 5,
        image: firstImage,
        cpu: row.cpu,
        gpu: row.gpu,
        ram: row.ram,
        storage: row.storage,
        display: row.display,
        warranty: row.warranty,
      };
    });
  } catch (error) {
    console.error('[BlackFridayPage] failed to load D1 data:', error);
  }

  const jsonLd = generateBreadcrumbJsonLd([
    { name: 'Trang chủ', href: '/' },
    { name: 'Black Friday 2026', href: '/black-friday' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <BlackFridayClient
        products={products}
        coupons={coupons}
        eventStartIso={EVENT_START_ISO}
        eventEndIso={EVENT_END_ISO}
      />
    </>
  );
}
