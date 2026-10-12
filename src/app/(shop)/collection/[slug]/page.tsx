import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductCard from '@/components/product/ProductCard';
import { getProductImageUrl } from '@/infra/cloudflare/r2/storage';
import { MediaError } from '@/server/services/media-library.service';
import { getPublishedCollection } from '@/server/services/storefront-cms.service';

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
  return {
    title: `${collection.name} | CitiLap`,
    description: collection.description || `Khám phá bộ sưu tập ${collection.name} tại CitiLap.`,
    alternates: { canonical: `https://citilap.vn/collection/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  const collection = await collectionOr404((await params).slug);
  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto max-w-7xl px-4 py-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">Trang chủ</Link> / <span className="text-slate-900">{collection.name}</span>
        </div>
      </div>
      <div className="container mx-auto max-w-7xl px-4 py-8">
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
                image: product.images.length ? getProductImageUrl(product.images[0], product.images[0]) : null,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
