import Link from "next/link";
import Image from "next/image";
import { type Metadata } from "next";
import {
  Gamepad2,
  Briefcase,
  Palette,
  Laptop,
  RefreshCw,
  Cpu,
  ChevronRight,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { getActiveCategories } from "@/server/services/catalog.service";
import { getPublishedNavigation } from "@/server/services/storefront-cms.service";
import Breadcrumb from "@/components/layout/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Danh mục sản phẩm | CitiLap - Laptop Chính Hãng Giá Tốt",
  description:
    "Khám phá toàn bộ danh mục laptop gaming, laptop văn phòng, ultrabook mỏng nhẹ, máy trạm đồ họa và phụ kiện chính hãng tại CitiLap.",
};

const categoryIconMap: Record<string, React.ElementType> = {
  "laptop-gaming": Gamepad2,
  "laptop-van-phong": Briefcase,
  "laptop-do-hoa": Palette,
  "macbook": Laptop,
  "laptop-cu": RefreshCw,
  "linh-kien": Cpu,
};

export default async function AllCategoriesPage() {
  type DisplayCategory = { id: string; slug: string; name: string; description: string | null; href: string; image?: string | null; alt?: string; productCount?: number };
  let categories: DisplayCategory[] = [];
  let errorOccurred = false;

  try {
    const navigation = await getPublishedNavigation();
    categories = navigation
      ? navigation.categories
      : (await getActiveCategories()).map((cat) => ({ ...cat, href: `/category/${cat.slug}` }));
  } catch (err) {
    console.error("[AllCategoriesPage] Failed to fetch categories from D1:", err);
    errorOccurred = true;
  }

  return (
    <div className="bg-surface-subtle min-h-screen pb-16">
      {/* Breadcrumb */}
      <div className="bg-surface-card border-b border-border-default">
        <div className="container-shop py-3">
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "/" },
              { label: "Danh mục sản phẩm", href: "/category" },
            ]}
          />
        </div>
      </div>

      <div className="container-shop pt-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-display font-black text-text-primary tracking-tight">
            Tất cả danh mục sản phẩm
          </h1>
          <p className="text-body-lg text-text-secondary mt-2 max-w-2xl">
            Khám phá đầy đủ các dòng laptop gaming, laptop văn phòng mỏng nhẹ, máy trạm chuyên nghiệp và phụ kiện chính hãng tại CitiLap.
          </p>
        </div>

        {errorOccurred ? (
          <div className="bg-surface-card border border-border-default rounded-card p-12 text-center max-w-md mx-auto my-8">
            <h2 className="text-title font-bold text-text-primary mb-2">Không thể tải danh mục</h2>
            <p className="text-body text-text-secondary mb-6">
              Hệ thống tạm thời gặp trục trặc khi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-text-inverse font-medium rounded-control hover:bg-brand-primary-hover transition"
            >
              Về trang chủ
            </Link>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-6 h-6 stroke-1.5" aria-hidden="true" />}
            title="Chưa có danh mục sản phẩm nào"
            description="Cơ sở dữ liệu danh mục hiện đang trống hoặc đang được cập nhật."
            action={
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-text-inverse font-medium rounded-control hover:bg-brand-primary-hover transition text-sm"
              >
                Về trang chủ
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const IconComponent = categoryIconMap[cat.slug] || Laptop;
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className="group bg-surface-card border border-border-default hover:border-brand-primary rounded-card p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-card-hover"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-14 h-14 rounded-surface bg-brand-primary-subtle text-brand-primary flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-brand-primary group-hover:text-text-inverse transition-all duration-200">
                        {cat.image
                          ? <Image src={cat.image} alt={cat.alt || cat.name} width={56} height={56} unoptimized className="w-full h-full rounded-surface object-cover" />
                          : <IconComponent className="w-7 h-7" />}
                      </div>
                      {cat.productCount !== undefined && <Badge variant="primary" className="text-caption font-semibold">
                        {cat.productCount} sản phẩm
                      </Badge>}
                    </div>

                    <h2 className="text-title font-bold text-text-primary group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                      {cat.name}
                      <ChevronRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-brand-primary" />
                    </h2>

                    <p className="text-body text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                      {cat.description || "Xem các sản phẩm chính hãng trong danh mục này."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-body-sm font-semibold text-brand-primary">
                    <span>Xem sản phẩm</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
