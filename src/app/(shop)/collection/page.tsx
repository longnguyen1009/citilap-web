import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Layers, ArrowRight } from 'lucide-react';
import { getPublishedCollectionList } from '@/server/services/storefront-cms.service';
import { businessProfile } from '@/config/business-profile';
import { formatSeoTitle, formatSeoTitleString, generateBreadcrumbJsonLd, serializeJsonLd } from '@/lib/seo-helpers';

const collectionIndexTitle = 'Bộ Sưu Tập Laptop & Phụ Kiện Tuyển Chọn';
const collectionIndexDesc = `Khám phá các bộ sưu tập laptop gaming, ultrabook, máy trạm đồ họa và phụ kiện công nghệ tuyển chọn theo nhu cầu tại ${businessProfile.brandName}.`;

export const metadata: Metadata = {
  title: formatSeoTitle(collectionIndexTitle),
  description: collectionIndexDesc,
  alternates: {
    canonical: `${businessProfile.canonicalSiteUrl}/collection`,
  },
  openGraph: {
    title: formatSeoTitleString(collectionIndexTitle),
    description: collectionIndexDesc,
    url: `${businessProfile.canonicalSiteUrl}/collection`,
    type: 'website',
    siteName: businessProfile.brandName,
    locale: 'vi_VN',
    images: [{ url: `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`, alt: collectionIndexTitle }],
  },
  twitter: {
    card: 'summary_large_image',
    title: formatSeoTitleString(collectionIndexTitle),
    description: collectionIndexDesc,
    images: [`${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`],
  },
};

export default async function CollectionsListingPage() {
  const collections = (await getPublishedCollectionList()) || [];
  const jsonLd = [
    generateBreadcrumbJsonLd([
      { name: 'Trang chủ', href: '/' },
      { name: 'Bộ sưu tập', href: '/collection' },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${businessProfile.canonicalSiteUrl}/collection#collection`,
      name: collectionIndexTitle,
      description: collectionIndexDesc,
      url: `${businessProfile.canonicalSiteUrl}/collection`,
      isPartOf: { '@id': `${businessProfile.canonicalSiteUrl}/#website` },
    },
  ];

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-xs md:text-sm text-slate-500 py-3.5 font-medium items-center" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600 transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
            <span className="text-slate-900 font-bold">Bộ sưu tập</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">
            Bộ Sưu Tập Tuyển Chọn
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Các nhóm sản phẩm được chuyên viên CitiLap tổng hợp theo từng phong cách làm việc, nhu cầu đồ họa và phân khúc giá tốt nhất.
          </p>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Đang cập nhật bộ sưu tập</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">Các bộ sưu tập mới đang được chuẩn bị và sẽ ra mắt sớm nhất.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={col.href}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-blue-500 shadow-xs hover:shadow-lg transition duration-300 overflow-hidden flex flex-col"
              >
                <div className="relative h-48 sm:h-56 bg-slate-900 overflow-hidden">
                  <Image
                    src={col.image || '/brand/marketing-banner.webp'}
                    alt={col.name}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-600/80 backdrop-blur-md">
                      {col.mode === 'rule' ? 'Tự động cập nhật' : 'Tuyển chọn thủ công'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition">
                      {col.name}
                    </h2>
                    {col.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {col.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                    <span>Khám phá ngay</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
