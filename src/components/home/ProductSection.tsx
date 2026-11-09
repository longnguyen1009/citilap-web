import Link from "next/link";
import ProductCard, { type ProductCardProduct } from "@/components/product/ProductCard";
import { SectionHeader, type SectionHeaderLinkItem } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { getSectionProducts } from "@/services/product-home";
import type { LucideIcon } from "lucide-react";
import type { PriceEvaluationContext } from "@/server/services/pricing.service";

interface ProductSectionProps {
  title: string;
  icon: LucideIcon;
  colorClass: string;
  links: Array<string | SectionHeaderLinkItem>;
  slug?: string;
  sectionKey: string;
  products?: ProductCardProduct[];
  fallback?: ProductCardProduct[]; // Deprecated, kept only for type safety during transition
  badgeColor?: string;
  rank?: boolean;
  eagerImages?: boolean;
  pricingContext?: PriceEvaluationContext | null;
  evaluatedAt?: Date;
}

export default async function ProductSection({
  title,
  icon,
  colorClass,
  links,
  slug,
  sectionKey,
  products: initialProducts,
  badgeColor,
  rank = false,
  eagerImages = false,
  pricingContext,
  evaluatedAt,
}: ProductSectionProps) {
  let products: ProductCardProduct[] = initialProducts || [];
  let isError = false;

  if (!initialProducts) {
    try {
      products = await getSectionProducts(sectionKey, pricingContext, evaluatedAt);
    } catch (err) {
      console.error(`[ProductSection] Error fetching products for ${sectionKey}:`, err);
      isError = true;
    }
  }

  const resolvedSlugHref = slug ? (slug.startsWith("/") ? slug : `/${slug}`) : undefined;

  return (
    <section className="pb-5 sm:pb-12 md:pb-16">
      <div className="container mx-auto px-2.5 sm:px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <SectionHeader
            title={title}
            icon={icon}
            colorClass={colorClass}
            links={links}
            slug={slug}
          />
          <div className="p-2 sm:p-4 md:p-6 bg-slate-50/30">
            {isError ? (
              <ErrorState
                title="Không thể tải danh sách sản phẩm"
                message="Đã xảy ra lỗi khi kết nối với cơ sở dữ liệu. Vui lòng thử lại sau."
                supportHref="/lien-he"
              />
            ) : products.length === 0 ? (
              <EmptyState
                title="Chưa có sản phẩm"
                description="Danh mục này hiện đang được cập nhật sản phẩm mới. Quý khách vui lòng quay lại sau."
                action={
                  resolvedSlugHref ? (
                    <Link href={resolvedSlugHref}>
                      <Button variant="outline" size="sm">
                        Xem tất cả danh mục
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 md:gap-5">
                  {products.slice(0, 10).map((p, i) => {
                    const hideOnMobile = i >= 6;
                    const cardNode = (
                      <ProductCard
                        key={`${p.id}-item-${i}`}
                        product={p}
                        badgeColor={badgeColor}
                        rank={rank ? i + 1 : undefined}
                        imageLoading={eagerImages && i < 4 ? "eager" : "lazy"}
                      />
                    );
                    return hideOnMobile ? (
                      <div key={`${p.id}-wrap-${i}`} className="hidden sm:block h-full">
                        {cardNode}
                      </div>
                    ) : (
                      cardNode
                    );
                  })}
                </div>
                {resolvedSlugHref && products.length > 4 && (
                  <div className="sm:hidden mt-3 pt-2 border-t border-slate-100 text-center">
                    <Link
                      href={resolvedSlugHref}
                      className="inline-flex items-center justify-center w-full py-2 rounded-xl bg-slate-100 hover:bg-blue-50 active:scale-[0.99] text-slate-800 text-xs font-bold transition"
                    >
                      Xem tất cả {title.split("-")[0].trim()} →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
