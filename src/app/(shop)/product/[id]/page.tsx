import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  PackageCheck,
  Truck,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPurchaseSection from "@/components/product/ProductPurchaseSection";
import ProductSpecsTable from "@/components/product/ProductSpecsTable";
import ProductCard from "@/components/product/ProductCard";
import ReviewForm from "@/components/product/ReviewForm";
import { SpecChip } from "@/components/ui/SpecChip";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  getProductDetail,
  getRelatedProducts,
} from "@/server/services/catalog.service";
import { businessProfile } from "@/config/business-profile";

interface ProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const query = await searchParams;
  const skuParam =
    typeof query.sku === "string"
      ? query.sku
      : typeof query.variant === "string"
      ? query.variant
      : undefined;

  const product = await getProductDetail(id, skuParam);
  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm | CITILAP.VN",
      description: "Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh.",
    };
  }

  const title = product.seoTitle || `${product.name} | CITILAP.VN`;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Xem thông số chi tiết, cấu hình ${product.name} chính hãng tại CITILAP.VN. Giá ${product.price.toLocaleString("vi-VN")}đ, ${product.conditionLabel}, bảo hành ${product.warranty}.`;

  const canonicalUrl = `https://citilap.vn/product/${product.canonicalSlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: product.primaryImageUrl ? [{ url: product.primaryImageUrl, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.primaryImageUrl ? [product.primaryImageUrl] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const skuParam =
    typeof query.sku === "string"
      ? query.sku
      : typeof query.variant === "string"
      ? query.variant
      : undefined;

  // 1. Query D1 for Product Detail data
  const product = await getProductDetail(id, skuParam);

  // 2. 404 if product does not exist or is inactive/draft/archived
  if (!product) {
    notFound();
  }

  // 3. Backward Compatibility & Canonical URL Redirect:
  // If user accesses via legacy database ID (e.g. /product/p-legion-5-pro) instead of slug,
  // redirect them to the canonical slug while preserving query parameters.
  if (product.slug && id !== product.slug) {
    const searchString = skuParam ? `?sku=${encodeURIComponent(skuParam)}` : "";
    redirect(`/product/${product.slug}${searchString}`);
  }

  // 4. Fetch related products from D1 (excluding current product)
  const relatedProducts = await getRelatedProducts(
    product.id,
    product.categoryId,
    product.brandId,
    4
  );

  // 5. Active selected variant reference
  const selectedVariant =
    product.variants.find((v) => v.id === product.selectedVariantId) || null;

  // 6. Sanitize description
  const safeDescription = sanitizeHtml(product.contentHtml || product.description || "");

  // 7. Schema.org JSON-LD Structured Data
  const jsonLdProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://citilap.vn/product/${product.slug}#product`,
    name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
    image: product.images.map((img) => img.url),
    description: (product.shortDescription || product.description || "").replace(/<[^>]+>/g, " ").slice(0, 500),
    sku: product.selectedSku || product.model || product.slug,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category || undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "VND",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: product.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      url: product.selectedSku
        ? `https://citilap.vn/product/${product.slug}?sku=${encodeURIComponent(product.selectedSku)}`
        : `https://citilap.vn/product/${product.slug}`,
    },
  };

  const jsonLdProductGroup = product.variants.length > 1 ? {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    "@id": `https://citilap.vn/product/${product.slug}#productgroup`,
    name: product.name,
    description: (product.shortDescription || product.description || "").replace(/<[^>]+>/g, " ").slice(0, 500),
    image: product.images.map((img) => img.url),
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    url: `https://citilap.vn/product/${product.slug}`,
    productGroupID: product.id,
    hasVariant: product.variants.map((v) => ({
      "@type": "Product",
      name: `${product.name} - ${v.name}`,
      sku: v.sku,
      offers: {
        "@type": "Offer",
        price: v.price,
        priceCurrency: "VND",
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: product.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        url: `https://citilap.vn/product/${product.slug}?sku=${encodeURIComponent(v.sku)}`,
      },
    })),
  } : null;

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: "https://citilap.vn",
      },
      ...(product.categorySlug
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.category || "Danh mục",
              item: `https://citilap.vn/category/${product.categorySlug}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.categorySlug ? 3 : 2,
        name: product.name,
        item: `https://citilap.vn/product/${product.slug}`,
      },
    ],
  };

  const entities = [jsonLdProduct, ...(jsonLdProductGroup ? [jsonLdProductGroup] : []), jsonLdBreadcrumb];
  const jsonLdString = JSON.stringify(entities)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      {/* 1. Breadcrumb Navigation */}
      <nav
        aria-label="Đường dẫn trang"
        className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-2xs"
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <ol className="flex items-center text-xs sm:text-sm text-gray-500 py-2.5 font-medium flex-wrap gap-y-1">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">
                Trang chủ
              </Link>
            </li>
            {product.categorySlug && (
              <>
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
                <li>
                  <Link
                    href={`/category/${product.categorySlug}`}
                    className="hover:text-blue-600 transition"
                  >
                    {product.category}
                  </Link>
                </li>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
            <li className="text-gray-900 font-semibold truncate max-w-xs sm:max-w-md" aria-current="page">
              {product.name}
            </li>
          </ol>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="container mx-auto px-4 max-w-7xl mt-5 sm:mt-6">
        {/* 2. Top Section: Gallery + Product Summary & Actions */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8" aria-label="Thông tin chính sản phẩm">
          {/* Left: Gallery Column (Col 5) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-4 sticky top-16">
              <ProductGallery
                images={product.images}
                productName={product.name}
                discount={product.discount}
                selectedImage={product.primaryImageUrl}
              />
            </div>
          </div>

          {/* Right: Info, Variants & CTA Column (Col 7) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-5 sm:p-7 flex flex-col space-y-5">
              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Quick Specs Highlight */}
              {(product.specs.cpu || product.specs.ram || product.specs.ssd || product.specs.gpu || product.specs.display) && (
                <div className="border border-blue-50 rounded-xl p-3.5 bg-blue-50/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Cấu hình tóm tắt
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {product.specs.cpu && <SpecChip label="CPU" value={product.specs.cpu} />}
                    {product.specs.gpu && <SpecChip label="GPU" value={product.specs.gpu} />}
                    {product.specs.ram && <SpecChip label="RAM" value={product.specs.ram} />}
                    {product.specs.ssd && <SpecChip label="SSD" value={product.specs.ssd} />}
                    {product.specs.display && <SpecChip label="Màn hình" value={product.specs.display} />}
                  </div>
                </div>
              )}

              {/* Unified Purchase Section: Condition, Variants, Warranty, Live Price, Actions */}
              <ProductPurchaseSection
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
                productImage={product.primaryImageUrl || ""}
                initialCondition={product.condition}
                initialWarranty={product.warranty}
                basePrice={product.price}
                baseOriginalPrice={product.originalPrice}
                baseStock={product.stock}
                variants={product.variants}
                selectedVariantId={product.selectedVariantId}
              />
            </div>
          </div>
        </section>

        {/* 3. Middle Section: Specifications, Content & Reviews */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10" aria-label="Chi tiết sản phẩm">
          {/* Left Column: Description, Policies & Reviews (Col 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Detailed Description */}
            <article className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Mô tả chi tiết sản phẩm
              </h2>
              {safeDescription ? (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed space-y-4"
                  dangerouslySetInnerHTML={{ __html: safeDescription }}
                />
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Thông tin mô tả chi tiết đang được đội ngũ Citilap cập nhật cho sản phẩm này.
                </p>
              )}
            </article>

            {/* Accessories & Warranty Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" /> Phụ kiện đi kèm & Cam kết bảo hành
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Bộ sản phẩm bao gồm:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Thân máy laptop {product.name} ({product.conditionLabel})</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Củ sạc (adapter) zin theo máy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>Tặng kèm: Chuột không dây, túi chống sốc cao cấp</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Chính sách bảo hành:</h3>
                  <p className="text-gray-600 leading-relaxed mb-3">
                    {product.warranty || "12 tháng chính hãng tại Citilap"}. Cam kết 1 đổi 1 trong 15 ngày đầu tiên nếu phát sinh lỗi kỹ thuật từ nhà sản xuất.
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Hỗ trợ vệ sinh, tra keo tản nhiệt và cài đặt phần mềm trọn đời máy</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Payment Policies */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Vận chuyển & Thanh toán linh hoạt
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900">Giao hàng toàn quốc:</h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                    <li>✓ Miễn phí giao hàng nội thành bán kính 10km</li>
                    <li>✓ Ship COD toàn quốc (kiểm tra hàng trước khi thanh toán)</li>
                    <li>✓ Đóng gói chống sốc chuyên dụng bảo đảm an toàn</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-900">Phương thức thanh toán:</h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                    <li>✓ Tiền mặt khi nhận hàng (COD) sau khi kiểm tra máy</li>
                    <li>✓ Chuyển khoản ngân hàng theo hướng dẫn của tư vấn viên</li>
                    <li>✓ Thanh toán trực tiếp khi nhận máy tại cơ sở Hà Nội</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Customer Reviews Section (No Fake Reviews) */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" /> Đánh giá từ khách hàng
              </h2>

              {/* Clean Empty State (Prompt Section 12: Loại bỏ 4 review fake) */}
              <div className="p-6 bg-gray-50/80 rounded-xl text-center space-y-2 mb-6 border border-gray-100">
                <MessageSquare className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">
                  Chưa có đánh giá nào cho sản phẩm này
                </p>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Bạn đã trải nghiệm {product.name}? Hãy chia sẻ cảm nhận thực tế của bạn để giúp các khách hàng khác lựa chọn cấu hình phù hợp!
                </p>
              </div>

              {/* Review Submission Form */}
              <ReviewForm productName={product.name} />
            </div>
          </div>

          {/* Right Column: Grouped Specifications Table (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-16 space-y-6">
              <ProductSpecsTable
                fullSpecs={product.fullSpecs}
                productName={product.name}
              />

              {/* Consultation Hotline Card */}
              <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md">
                <h3 className="text-base font-bold mb-2">Cần tư vấn chọn máy?</h3>
                <p className="text-xs text-blue-200 leading-relaxed mb-4">
                  Đội ngũ kỹ thuật viên Citilap sẵn sàng hỗ trợ bạn kiểm tra máy thực tế, tư vấn nâng cấp RAM, SSD phù hợp với nhu cầu.
                </p>
                <a
                  href={businessProfile.telHref}
                  className="block text-center bg-white text-blue-900 hover:bg-blue-50 font-black text-sm py-2.5 rounded-xl transition shadow-xs"
                >
                  Gọi ngay: {businessProfile.displayPhone}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Related Products Section (Server Rendered from D1) */}
        {relatedProducts.length > 0 && (
          <section className="mt-12" aria-label="Sản phẩm tương tự">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">
                  Sản phẩm tương tự
                </h2>
                <p className="text-xs text-gray-500">
                  Các mẫu laptop cùng phân khúc và danh mục được quan tâm nhiều
                </p>
              </div>
              {product.categorySlug && (
                <Link
                  href={`/category/${product.categorySlug}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                >
                  Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />
    </div>
  );
}
