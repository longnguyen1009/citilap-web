import { categoryAncestors } from '@/lib/category-paths';
import { productHref } from '@/lib/product-paths';
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import InspectionReports from '@/components/product/InspectionReports';
import ProductSpecsTable from "@/components/product/ProductSpecsTable";
import ProductCard from "@/components/product/ProductCard";
import ReviewForm from "@/components/product/ReviewForm";
import ProductDescriptionArticle from "@/components/product/ProductDescriptionArticle";
import ProductFaqAccordion from "@/components/product/ProductFaqAccordion";
import ProductSideShowrooms from "@/components/product/ProductSideShowrooms";
import ProductShippingCommitment from "@/components/product/ProductShippingCommitment";
import ProductPromoBanners from "@/components/product/ProductPromoBanners";
import ProductHeroSection from "@/components/product/ProductHeroSection";
import { DEMO_LENOVO_LOQ } from "@/data/demo-product-loq";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  getProductDetail,
  getRelatedProducts,
} from "@/server/services/catalog.service";
import {
  getPublishedNavigation,
  getPublishedStudio,
  classifyProductPublication,
  getStorefrontSettings,
} from "@/server/services/storefront-cms.service";
import {
  calculateEffectivePrice,
  applyPricingToHomepageProducts,
  getStorefrontPricingContext,
} from "@/server/services/pricing.service";

export interface ProductPageProps {
  namespace?: string;
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const query = await searchParams;

  if (id === "demo-lenovo-loq") {
    return {
      title: `${DEMO_LENOVO_LOQ.fullTitle} | CITILAP.VN`,
      description: `Xem chi tiết ${DEMO_LENOVO_LOQ.name} chính hãng tại CITILAP.VN. Core 7 230H, RTX 3050 6GB, Màn hình 165Hz chuẩn màu 100% sRGB.`,
    };
  }

  const skuParam =
    typeof query.sku === "string"
      ? query.sku
      : typeof query.variant === "string"
      ? query.variant
      : undefined;

  const pub = await classifyProductPublication(id);
  if (
    pub.kind === "NOT_FOUND" ||
    pub.kind === "DELETED" ||
    pub.kind === "CMS_NOT_PUBLIC" ||
    pub.kind === "LEGACY_INACTIVE"
  ) {
    return {
      title: "Không tìm thấy sản phẩm | CITILAP.VN",
      description: "Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh.",
    };
  }

  const resolvedSlug = pub.slug;
  const product = await getProductDetail(resolvedSlug, skuParam);
  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm | CITILAP.VN",
      description: "Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã ngừng kinh doanh.",
    };
  }

  const studio = pub.kind === "CMS_PUBLISHED" ? await getPublishedStudio(resolvedSlug) : null;
  const displayName = studio?.name || product.name;
  const primaryImage = studio?.media.find((item) => item.kind === "IMAGE")?.url || product.primaryImageUrl;
  const title = studio?.seoTitle || product.seoTitle || `${displayName} | CITILAP.VN`;
  const description =
    studio?.seoDescription || studio?.description ||
    product.seoDescription ||
    product.shortDescription ||
    `Xem thông số chi tiết, cấu hình ${product.name} chính hãng tại CITILAP.VN. Giá ${product.price.toLocaleString("vi-VN")}đ, ${product.conditionLabel}, bảo hành ${product.warranty}.`;

  const canonicalUrl = 'https://citilap.vn' + productHref({ slug: product.canonicalSlug, template: studio?.template, kind: /phu-kien|linh-kien/.test(product.categorySlug || '') ? 'ACCESSORY' : 'LAPTOP' });

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
      images: primaryImage ? [{ url: primaryImage, alt: displayName }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
  namespace = 'laptop',
}: ProductPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const isDemoLoq = id === "demo-lenovo-loq";

  const skuParam =
    typeof query.sku === "string"
      ? query.sku
      : typeof query.variant === "string"
      ? query.variant
      : undefined;

  const navigation = await getPublishedNavigation();
  const settings = await getStorefrontSettings();
  const evaluatedAt = new Date();
  const pricingContext = await getStorefrontPricingContext(undefined, evaluatedAt);

  // =========================================================================
  // CASE 1: DEMO LENOVO LOQ (ĐẦY ĐỦ MỌI CẤU HÌNH, MÀU SẮC, GÓI BẢO HÀNH)
  // =========================================================================
  if (isDemoLoq) {
    const demo = DEMO_LENOVO_LOQ;
    const activeSku = skuParam || demo.variants.find(v => v.isDefault)?.sku || demo.variants[0].sku;
    const currentVariant = demo.variants.find(v => v.sku === activeSku) || demo.variants[0];

    // Fetch related products for bottom section
    const rawRelated = await getRelatedProducts(
      "demo-related-seed",
      null,
      null,
      4,
      [],
      undefined,
      pricingContext,
      evaluatedAt
    );
    const relatedProducts = applyPricingToHomepageProducts(rawRelated, pricingContext, evaluatedAt);

    return (
      <div className="bg-[#f8fafc] min-h-screen pb-20">

        {/* Breadcrumb Navigation */}
        <nav aria-label="Đường dẫn trang" className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 max-w-7xl">
            <ol className="flex items-center text-xs sm:text-sm text-gray-500 py-2.5 font-medium flex-wrap gap-y-1">
              <li>
                <Link href="/" className="hover:text-blue-600 transition">
                  Trang chủ
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
                <Link href="/laptop" className="hover:text-blue-600 transition">
                  Laptop Gaming
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="hover:text-blue-600 transition">
                  Lenovo LOQ Series
                </span>
              </li>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
              <li className="text-gray-900 font-semibold truncate max-w-xs sm:max-w-md" aria-current="page">
                {demo.name}
              </li>
            </ol>
          </div>
        </nav>

        {/* Main Container */}
        <main className="container mx-auto px-4 max-w-7xl mt-5 sm:mt-6">
          {/* 1. TOP HERO SECTION: GALLERY + TRUST + DEAL COMBO + PURCHASING */}
          <ProductHeroSection
            canOrder={false}
            productId={demo.id}
            productSlug={demo.slug}
            productName={demo.name}
            modelCode={demo.modelCode}
            brandName={demo.brand}
            images={demo.images}
            coverImage={demo.images[0].url}
            discountBadge="Giảm 17%"
            conditionLabel={demo.conditionLabel}
            basePrice={currentVariant.price}
            baseOriginalPrice={currentVariant.originalPrice}
            variants={demo.variants}
            selectedSku={currentVariant.sku}
            colors={demo.colors}
            warranties={demo.warranties}
            phone={settings?.storePhone}
          />

          {/* 2. MIDDLE SECTION: 2 CỘT CHUẨN */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10" aria-label="Chi tiết sản phẩm">
            {/* Cột trái (Col 8): Đánh giá chi tiết -> FAQ -> Đánh giá từ khách hàng */}
            <div className="lg:col-span-8 space-y-6">
              {/* Đánh giá chi tiết */}
              <ProductDescriptionArticle
                safeDescription={demo.reviewHtml}
                productName={demo.name}
              />

              {/* Câu hỏi thường gặp FAQ */}
              <ProductFaqAccordion faqs={demo.faqs} />

              {/* Đánh giá từ khách hàng */}
              <div id="danh-gia-khach-hang" className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
                <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" /> Đánh giá từ khách hàng
                </h2>
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500 font-bold text-lg">★★★★★</span>
                    <span className="font-bold text-slate-900 text-sm">4.9 / 5</span>
                    <span className="text-slate-500 text-xs">(32 đánh giá thực tế đã mua hàng)</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">100% Khách hàng hài lòng</span>
                </div>
                <ReviewForm productName={demo.name} />
              </div>
            </div>

            {/* Cột phải (Col 4): Thông số kỹ thuật -> Showroom -> Vận chuyển -> Banners */}
            <div className="lg:col-span-4 space-y-6">
              {/* Thông số kỹ thuật */}
              <section id="thong-so-ky-thuat" className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs" aria-label="Thông số kỹ thuật">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <h2 className="text-base font-black text-gray-900 uppercase">Thông số kỹ thuật</h2>
                  <span className="text-xs text-blue-600 font-semibold">{demo.modelCode}</span>
                </div>
                <dl className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {demo.specs.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-2 py-2.5">
                      <dt className="font-semibold text-gray-500">{key}</dt>
                      <dd className="text-gray-900 font-medium break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Hệ thống cửa hàng */}
              <ProductSideShowrooms settings={settings} />

              {/* Chính sách vận chuyển & cam kết */}
              <ProductShippingCommitment items={settings?.productShippingItems} />

              {/* Banner ưu đãi */}
              <ProductPromoBanners banners={settings?.productBanners} />
            </div>
          </section>

          {/* 3. NỘI DUNG DƯỚI CÙNG: SẢN PHẨM TƯƠNG TỰ */}
          {relatedProducts.length > 0 && (
            <section className="mt-12" aria-label="Sản phẩm tương tự">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">
                    Sản phẩm tương tự
                  </h2>
                  <p className="text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                    Các mẫu laptop gaming cùng phân khúc được quan tâm nhiều
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // CASE 2: CATALOG / STUDIO PRODUCT THỰC TẾ
  // =========================================================================
  const pub = await classifyProductPublication(id);
  if (
    pub.kind === "NOT_FOUND" ||
    pub.kind === "DELETED" ||
    pub.kind === "CMS_NOT_PUBLIC" ||
    pub.kind === "LEGACY_INACTIVE"
  ) {
    notFound();
  }

  const resolvedSlug = pub.slug;
  const product = await getProductDetail(resolvedSlug, skuParam);
  if (!product) {
    notFound();
  }

  const category = navigation?.categories.find(c => c.id === product.categoryId);
  const categoryTrail = category && navigation ? categoryAncestors(category, navigation.categories) : [];
  const categoryUrl = category?.href || '/phan-loai';
  const studio = pub.kind === "CMS_PUBLISHED" ? await getPublishedStudio(resolvedSlug) : null;
  const canonicalPath = productHref({ slug: resolvedSlug, template: studio?.template, kind: /phu-kien|linh-kien/.test(product.categorySlug || '') ? 'ACCESSORY' : 'LAPTOP' });

  if (id !== resolvedSlug || `/${namespace}/${id}` !== canonicalPath) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, part);
    permanentRedirect(canonicalPath + (search.size ? `?${search}` : ''));
  }

  const studioVariant = skuParam ? studio?.variants.find((v) => v.sku === skuParam || v.id === skuParam) : studio?.variants[0];
  if (studio && skuParam && !studioVariant) notFound();

  const studioImages = studio?.media.filter((m): m is typeof m & { url: string } => m.kind === "IMAGE" && Boolean(m.url)) || [];
  const galleryImages = studio && studioImages.length > 0 ? studioImages.map((m) => ({
    url: m.url, alt: m.alt || studio.name, variantId: m.variantId || null,
  })) : product.images;

  const cover = studio
    ? (studioImages.find((m) => m.variantId && m.variantId === studioVariant?.id)?.url || studioImages[0]?.url || "")
    : (product.primaryImageUrl || "");

  const displayName = studio?.name || product.name;
  const selectedVariant = product.variants.find((v) => v.id === product.selectedVariantId) || null;
  const isVariant = Boolean(studioVariant || selectedVariant);
  const activeVariant = studioVariant || selectedVariant;
  const rawPrice = activeVariant?.price ?? studio?.price ?? product.price;
  const rawOriginalPrice = isVariant
    ? (activeVariant?.originalPrice ?? null)
    : (studio?.originalPrice ?? product.originalPrice ?? null);
  const isFlashSale = Boolean(studio?.isFlashSale ?? product.isFlashSale);

  const pricing = calculateEffectivePrice(
    rawPrice,
    rawOriginalPrice,
    isFlashSale,
    true,
    pricingContext,
    evaluatedAt,
    {
      productId: product.id,
      variantId: activeVariant?.id,
      isVariant,
      variantOriginalPrice: isVariant ? rawOriginalPrice : null,
    }
  );

  const displayPrice = pricing.effectivePrice;
  const displayOriginalPrice = pricing.compareAtPrice;

  // Build hero variants list
  const heroVariants = studio
    ? studio.variants.map((v) => {
        const vp = calculateEffectivePrice(
          v.price,
          v.originalPrice ?? null,
          isFlashSale,
          true,
          pricingContext,
          evaluatedAt,
          {
            productId: product.id,
            variantId: v.id,
            isVariant: true,
            variantOriginalPrice: v.originalPrice ?? null,
          }
        );
        return {
          id: v.id,
          sku: v.sku,
          name: v.name || v.sku,
          subSpecs: [v.ram, v.storage, v.gpu].filter(Boolean).join(" · "),
          price: vp.effectivePrice,
          originalPrice: vp.compareAtPrice,
          condition: v.condition,
          color: v.options?.['Màu sắc'] || v.options?.color,
          colorHex: /^#[0-9a-fA-F]{6}$/.test(v.options?.['Mã màu'] || '') ? v.options?.['Mã màu'] : undefined,
          canOrder: ['AVAILABLE', 'PREORDER'].includes(v.availability || studio.availability),
          tag: v.ram?.includes("32") ? "Đa nhiệm mượt" : undefined,
        };
      })
    : product.variants.map((v) => {
        const vp = calculateEffectivePrice(
          v.price,
          v.originalPrice ?? null,
          isFlashSale,
          true,
          pricingContext,
          evaluatedAt,
          {
            productId: product.id,
            variantId: v.id,
            isVariant: true,
            variantOriginalPrice: v.originalPrice ?? null,
          }
        );
        return {
          id: v.id,
          sku: v.sku || v.id,
          name: v.name,
          subSpecs: [v.ram, v.storage, v.gpu].filter(Boolean).join(" · "),
          price: vp.effectivePrice,
          originalPrice: vp.compareAtPrice,
          condition: product.condition,
          color: v.options?.['Màu sắc'] || v.options?.color,
        };
      });

  // Color is part of each authored SKU; pricing comes from that variant.
  const heroColors: never[] = [];
  const heroWarranties = (studio?.warranties || []).map(w => ({id:w.name,name:w.name,desc:w.description,priceDiff:w.adjustment,isDefault:w.recommended}));
  const accessories = [];
  for (const accessoryId of studio?.accessoryProductIds || []) {
    const publication = await classifyProductPublication(accessoryId, {lookupType:'id'});
    if (publication.kind !== 'CMS_PUBLISHED' && publication.kind !== 'LEGACY_ACTIVE') continue;
    const accessory = await getProductDetail(publication.slug);
    const authored = publication.kind === 'CMS_PUBLISHED' ? await getPublishedStudio(publication.slug) : null;
    if (!accessory || (authored && !authored.canOrder)) continue;
    const variant = authored?.variants[0] || accessory.variants[0];
    const availability = authored?.variants[0]?.availability || authored?.availability;
    if (availability && !['AVAILABLE','PREORDER'].includes(availability)) continue;
    const resolved = calculateEffectivePrice(variant?.price ?? authored?.price ?? accessory.price, variant?.originalPrice ?? authored?.originalPrice ?? accessory.originalPrice, Boolean(authored?.isFlashSale ?? accessory.isFlashSale), true, pricingContext, evaluatedAt, {productId:accessory.id,variantId:variant?.id,isVariant:!!variant,variantOriginalPrice:variant?.originalPrice ?? null});
    accessories.push({id:accessory.id,variantId:variant?.id,name:authored?.name || accessory.name,image:authored?.media.find(m => m.kind === 'IMAGE')?.url || accessory.primaryImageUrl || '/images/placeholder-laptop.svg',salePrice:resolved.effectivePrice,originalPrice:resolved.compareAtPrice || resolved.effectivePrice});
  }

  // Fetch related products
  const manualRelatedIds = (studio?.relatedProductIds || []).filter((rid) => rid && rid !== product.id);
  const rawRelatedProducts = await getRelatedProducts(
    product.id,
    product.categoryId,
    product.brandId,
    4,
    manualRelatedIds,
    undefined,
    pricingContext,
    evaluatedAt
  );
  const relatedProducts = applyPricingToHomepageProducts(rawRelatedProducts, pricingContext, evaluatedAt);

  // Sanitize description
  const safeDescription = sanitizeHtml(
    studio ? (studio.contentHtml || studio.description) : (product.contentHtml || product.description || "")
  );

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">

      {/* Breadcrumb Navigation */}
      <nav aria-label="Đường dẫn trang" className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <ol className="flex items-center text-xs sm:text-sm text-gray-500 py-2.5 font-medium flex-wrap gap-y-1">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">
                Trang chủ
              </Link>
            </li>
            {categoryTrail.map(c => (
              <li key={c.id} className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
                <Link href={c.href} className="hover:text-blue-600 transition">{c.name}</Link>
              </li>
            ))}
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400 shrink-0" aria-hidden="true" />
            <li className="text-gray-900 font-semibold truncate max-w-xs sm:max-w-md" aria-current="page">
              {displayName}
            </li>
          </ol>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="container mx-auto px-4 max-w-7xl mt-5 sm:mt-6">
        {/* 1. TOP HERO SECTION: GALLERY, BADGES, DEAL COMBO, PURCHASING, CARDS 365 */}
        <ProductHeroSection
          key={product.id + (skuParam || '')}
          productId={product.id}
          productSlug={product.slug}
          productName={displayName}
          modelCode={product.model || (studio?.specs.find(s => s.key.toLowerCase().includes('model') || s.key.toLowerCase().includes('mã'))?.value) || ''}
          brandName={studio?.brand || product.brand || ''}
          images={galleryImages}
          coverImage={cover}
          discountBadge={studio ? undefined : product.discount}
          conditionLabel={product.conditionLabel || "Mới 100% Fullbox"}
          basePrice={displayPrice}
          baseOriginalPrice={displayOriginalPrice}
          variants={heroVariants}
          selectedSku={skuParam}
          colors={heroColors}
          warranties={heroWarranties}
          phone={settings?.storePhone}
          settings={settings}
          accessories={accessories}
          gifts={studio?.gifts || []}
          canOrder={studio ? studio.canOrder : true}
        />

        {/* 2. MIDDLE SECTION: SPECIFICATIONS, CONTENT, FAQ, SHOWROOMS & REVIEWS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10" aria-label="Chi tiết sản phẩm">
          {/* Cột trái (Col 8): Đánh giá chi tiết -> FAQ -> Đánh giá từ khách hàng */}
          <div className="lg:col-span-8 space-y-6">
            {/* Đánh giá chi tiết */}
            <ProductDescriptionArticle
              safeDescription={safeDescription}
              productName={displayName}
            />

            {/* Báo cáo thẩm định */}
            <InspectionReports productId={product.id} variantId={studioVariant?.id || product.selectedVariantId || null} />

            {/* Câu hỏi thường gặp FAQ */}
            <ProductFaqAccordion faqs={studio?.faqs || []} />

            {/* Đánh giá từ khách hàng */}
            <div id="danh-gia-khach-hang" className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6 sm:p-8">
              <h2 className="text-base sm:text-lg font-black text-gray-900 border-b border-gray-100 pb-3 mb-5 uppercase flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" /> Đánh giá từ khách hàng
              </h2>
              <ReviewForm productName={displayName} />
            </div>
          </div>

          {/* Cột phải (Col 4): Thông số kỹ thuật -> Showroom -> Vận chuyển -> Banners */}
          <div className="lg:col-span-4 space-y-6">
            {/* Thông số kỹ thuật */}
            <section id="thong-so-ky-thuat">
              {studio ? (
                <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs" aria-label="Thông số kỹ thuật">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <h2 className="text-base font-black text-gray-900 uppercase">Thông số kỹ thuật</h2>
                    <span className="text-xs text-blue-600 font-semibold">{displayName.split('(')[0]}</span>
                  </div>
                  {studio.specs.filter((s) => s.value).length ? (
                    <dl className="divide-y divide-gray-100 text-xs sm:text-sm">
                      {studio.specs.filter((s) => s.value).map((spec) => (
                        <div key={spec.key} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-2 py-2.5">
                          <dt className="font-semibold text-gray-500">{spec.key}</dt>
                          <dd className="text-gray-900 font-medium break-words">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-xs text-gray-500">Thông số kỹ thuật đang được cập nhật.</p>
                  )}
                </div>
              ) : (
                <ProductSpecsTable
                  fullSpecs={product.fullSpecs}
                  productName={product.name}
                />
              )}
            </section>

            {/* Hệ thống showroom */}
            <ProductSideShowrooms settings={settings} />

            {/* Chính sách vận chuyển & cam kết */}
            <ProductShippingCommitment items={settings?.productShippingItems} />

            {/* 2 Banner quảng cáo / ưu đãi */}
            <ProductPromoBanners banners={settings?.productBanners} />
          </div>
        </section>

        {/* 3. NỘI DUNG DƯỚI CÙNG: SẢN PHẨM TƯƠNG TỰ */}
        {relatedProducts.length > 0 && (
          <section className="mt-12" aria-label="Sản phẩm tương tự">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-tight">
                  Sản phẩm tương tự
                </h2>
                <p className="text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                  Các mẫu laptop cùng phân khúc và danh mục được quan tâm nhiều
                </p>
              </div>
              {product.categorySlug && (
                <Link
                  href={categoryUrl}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 shrink-0 whitespace-nowrap"
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
    </div>
  );
}
