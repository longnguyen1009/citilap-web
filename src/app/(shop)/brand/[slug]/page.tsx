import { businessProfile } from "@/config/business-profile";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Tag, ShieldCheck, Laptop } from "lucide-react";
import { Container } from "@/components/ui/Container";
import ProductCard from "@/components/product/ProductCard";
import { getCachedBrandWithProducts, getCachedPricingContext } from "@/server/services/storefront-cms.service";
import { applyPricingToHomepageProducts } from "@/server/services/pricing.service";
import {
  cleanSeoDescription,
  formatSeoTitle,
  formatSeoTitleString,
  generateBreadcrumbJsonLd,
  serializeJsonLd,
} from "@/lib/seo-helpers";
import { productHref } from "@/lib/product-paths";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getCachedBrandWithProducts(slug);
    if (!data) throw new Error("not found");
    const brand = data.brand;
    const rawTitle = brand.seoTitle || `Laptop & Sản Phẩm ${brand.name} Chính Hãng`;
    const titleString = formatSeoTitleString(rawTitle);
    const rawBrandDesc = (brand.seoDescription || brand.description || "").trim();
    const enrichedBrandDesc =
      rawBrandDesc && rawBrandDesc.length < 110
        ? `Mua Laptop ${brand.name} chính hãng & LikeNew tại CitiLap — ${rawBrandDesc.replace(/\.$/, "")}. Test máy trực tiếp, bảo hành minh bạch, lỗi 1 đổi 1 7 ngày.`
        : rawBrandDesc;
    const description = cleanSeoDescription(
      enrichedBrandDesc,
      `Khám phá các dòng laptop và phụ kiện ${brand.name} chính hãng & Like New tuyển chọn tại CitiLap. Đối chiếu cấu hình, bảng giá mới nhất và bảo hành uy tín tại Hà Nội & Bắc Ninh.`
    );
    const canonicalUrl = `${businessProfile.canonicalSiteUrl}/brand/${brand.slug}`;
    const firstProductImg = data.products?.[0]?.image;
    const rasterLogo = brand.logo && !/\.svg(?:$|\?)/i.test(brand.logo) ? brand.logo : null;
    const ogSource = rasterLogo || firstProductImg || businessProfile.bannerAsset;
    const ogImage = /^https?:\/\//i.test(ogSource)
      ? ogSource
      : `${businessProfile.canonicalSiteUrl}${ogSource.startsWith("/") ? "" : "/"}${ogSource}`;

    return {
      title: formatSeoTitle(rawTitle),
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: titleString,
        description,
        url: canonicalUrl,
        type: "website",
        siteName: businessProfile.brandName,
        locale: "vi_VN",
        images: [{ url: ogImage, alt: brand.name }],
      },
      twitter: {
        card: "summary_large_image",
        title: titleString,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: formatSeoTitle("Thương hiệu"),
      description: "Danh sách sản phẩm theo thương hiệu tại CitiLap.",
      robots: { index: false, follow: true },
    };
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;

  const [brandData, pricingContext] = await Promise.all([
    getCachedBrandWithProducts(slug).catch(() => null),
    getCachedPricingContext().catch(() => null),
  ]);

  if (!brandData) {
    notFound();
  }

  const { brand } = brandData;
  const products = applyPricingToHomepageProducts(brandData.products, pricingContext, new Date());
  const brandUrl = `${businessProfile.canonicalSiteUrl}/brand/${brand.slug}`;
  const jsonLd = [
    generateBreadcrumbJsonLd([
      { name: "Trang chủ", href: "/" },
      { name: brand.name, href: `/brand/${brand.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${brandUrl}#collection`,
      name: `Sản phẩm ${brand.name} tại CitiLap`,
      description: brand.seoDescription || brand.description || `Danh sách sản phẩm ${brand.name} tại CitiLap.`,
      url: brandUrl,
      isPartOf: { "@id": `${businessProfile.canonicalSiteUrl}/#website` },
    },
    ...(products.length > 0
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Sản phẩm ${brand.name}`,
            numberOfItems: products.length,
            itemListElement: products.slice(0, 24).map((p, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              url: businessProfile.canonicalSiteUrl + productHref(p),
              name: p.name,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-slate-50/50 min-h-screen pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-100 py-3 text-xs">
        <Container>
          <ol className="flex items-center space-x-1 sm:space-x-2 text-slate-500 overflow-x-auto whitespace-nowrap">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">
                Trang chủ
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li>
              <span className="text-slate-500">Thương hiệu</span>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li className="font-semibold text-slate-800" aria-current="page">
              {brand.name}
            </li>
          </ol>
        </Container>
      </nav>

      {/* Brand Hero Header */}
      <div className="bg-white border-b border-slate-200/80 py-8 mb-8 shadow-xs">
        <Container>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-xs flex items-center justify-center shrink-0">
              {brand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Tag className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {brand.name}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {products.length} sản phẩm đang mở bán
                </span>
              </div>

              {brand.description ? (
                <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                  {brand.description}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Tất cả các dòng laptop và phụ kiện chính hãng {brand.name} tại CitiLap. Cam kết chất lượng, bảo hành uy tín.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Bảo hành theo gói 3 – 12 tháng
                </span>
                <span className="inline-flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                  Lỗi 1 đổi 1 trong 7 ngày đầu tiên
                </span>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Product Grid */}
      <Container>
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-800">Chưa có sản phẩm nào đang mở bán</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Các sản phẩm của thương hiệu {brand.name} đang được cập nhật thêm. Bạn có thể tham khảo các danh mục khác.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Danh sách sản phẩm {brand.name}
              </h2>
              <span className="text-xs text-slate-500">
                Hiển thị {products.length} sản phẩm
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} showSpecs />)}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
