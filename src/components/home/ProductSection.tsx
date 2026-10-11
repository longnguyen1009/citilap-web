import Link from "next/link";
import ProductCard, { type ProductCardProduct } from "@/components/product/ProductCard";
import { SectionHeader, type SectionHeaderLinkItem } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { getSectionProducts } from "@/services/product-home";
import type { LucideIcon } from "lucide-react";

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
}: ProductSectionProps) {
  let products: ProductCardProduct[] = initialProducts || [];
  let isError = false;

  if (!initialProducts) {
    try {
      products = await getSectionProducts(sectionKey);
    } catch (err) {
      console.error(`[ProductSection] Error fetching products for ${sectionKey}:`, err);
      isError = true;
    }
  }

  return (
    <section className="pb-16">
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <SectionHeader
            title={title}
            icon={icon}
            colorClass={colorClass}
            links={links}
            slug={slug}
          />
          <div className="p-4 md:p-6 bg-slate-50/30">
            {isError ? (
              <ErrorState
                title="Không thể tải danh sách sản phẩm"
                message="Đã xảy ra lỗi khi kết nối với cơ sở dữ liệu. Vui lòng thử lại sau."
                supportHref="/contact"
              />
            ) : products.length === 0 ? (
              <EmptyState
                title="Chưa có sản phẩm"
                description="Danh mục này hiện đang được cập nhật sản phẩm mới. Quý khách vui lòng quay lại sau."
                action={
                  slug ? (
                    <Link href={`/category/${slug}`}>
                      <Button variant="outline" size="sm">
                        Xem tất cả danh mục
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mb-4 md:mb-5">
                  {products.slice(0, 5).map((p, i) => (
                    <ProductCard 
                      key={`${p.id}-row1`} 
                      product={p} 
                      badgeColor={badgeColor} 
                      rank={rank ? i + 1 : undefined} 
                    />
                  ))}
                </div>
                {products.length > 5 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                    {products.slice(5, 10).map((p, i) => (
                      <ProductCard 
                        key={`${p.id}-row2`} 
                        product={p} 
                        badgeColor={badgeColor} 
                        rank={rank ? i + 6 : undefined} 
                      />
                    ))}
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
