import { businessProfile } from "@/config/business-profile";
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductCard from '@/components/product/ProductCard';
import { MediaError } from '@/server/services/media-library.service';
import { getPublishedCollection } from '@/server/services/storefront-cms.service';
import {
  cleanSeoDescription,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo-helpers';
import { productHref } from '@/lib/product-paths';

type PageProps = { params: Promise<{ slug: string }> };

async function collectionOr404(slug: string) {
  try {
    const collection = await getPublishedCollection(slug);
    if (!collection) notFound();
    return collection;
  } catch (error) {
    if (error instanceof MediaError && (error.status === 404 || error.status === 503)) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const collection = await collectionOr404((await params).slug);
  const rawTitle = collection.seo?.title || collection.name;
  const titleString = formatSeoTitleString(rawTitle);
  const description = cleanSeoDescription(
    collection.seo?.description || collection.description,
    `Khám phá bộ sưu tập ${collection.name} tuyển chọn tại CitiLap. Đối chiếu cấu hình, giá bán và chế độ bảo hành minh bạch.`
  );
  const canonicalUrl = `${businessProfile.canonicalSiteUrl}/collection/${collection.slug}`;
  const ogImage = collection.image
    ? (/^https?:\/\//i.test(collection.image) ? collection.image : `${businessProfile.canonicalSiteUrl}${collection.image}`)
    : `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

  return {
    title: formatSeoTitle(rawTitle),
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: titleString,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: businessProfile.brandName,
      locale: 'vi_VN',
      images: [{ url: ogImage, alt: collection.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleString,
      description,
      images: [ogImage],
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const collection = await collectionOr404((await params).slug);
  const canonicalUrl = `${businessProfile.canonicalSiteUrl}/collection/${collection.slug}`;
  const jsonLd = [
    generateBreadcrumbJsonLd([
      { name: 'Trang chủ', href: '/' },
      { name: 'Bộ sưu tập', href: '/collection' },
      { name: collection.name, href: `/collection/${collection.slug}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      name: collection.name,
      description: collection.seo?.description || collection.description || undefined,
      url: canonicalUrl,
      isPartOf: { '@id': `${businessProfile.canonicalSiteUrl}/#website` },
    },
    ...(collection.products.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: collection.name,
            numberOfItems: collection.products.length,
            itemListElement: collection.products.slice(0, 24).map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              url: businessProfile.canonicalSiteUrl + productHref(p),
              name: p.name,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto max-w-[1370px] px-4 py-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link> / <span className="text-slate-900">{collection.name}</span>
        </div>
      </div>
      <div className="container mx-auto max-w-[1370px] px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">{collection.name}</h1>
        {collection.description && <p className="text-slate-600 mt-3 max-w-3xl">{collection.description}</p>}
        {collection.products.length === 0 ? (
          <p className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-slate-500 mt-8">Bộ sưu tập đang được cập nhật sản phẩm.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 mt-8">
            {collection.products.map(product => (
              <ProductCard key={product.id} product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                originalPrice: product.originalPrice,
                discount: product.discount,
                condition: product.condition || 'NEW',
                image: product.image || product.primaryImage || null,
                specs: product.specs || {},
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
