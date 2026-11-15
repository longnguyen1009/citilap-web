import { Gamepad2, Briefcase, Palette, Laptop, RefreshCw, Cpu, Layers, type LucideIcon } from "lucide-react";
import { SHOWCASE_CATEGORIES } from "@/config/category-showcase";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";
import CategoryProductBlock, { type CategoryBlockItem } from "@/components/home/CategoryProductBlock";

function resolveCategoryIcon(slug: string, href: string): LucideIcon {
  const matched = SHOWCASE_CATEGORIES.find(
    (item) => item.href === href || item.slug === slug || item.id === slug
  );
  if (matched) return matched.icon;
  const key = `${slug} ${href}`.toLowerCase();
  if (key.includes("gaming")) return Gamepad2;
  if (key.includes("van-phong")) return Briefcase;
  if (key.includes("do-hoa") || key.includes("workstation")) return Palette;
  if (key.includes("macbook") || key.includes("mong-nhe") || key.includes("sinh-vien")) return Laptop;
  if (key.includes("likenew") || key.includes("cu")) return RefreshCw;
  if (key.includes("phu-kien") || key.includes("linh-kien")) return Cpu;
  return Layers;
}

export default function CategoryGridSection({ navigation }: { navigation?: ResolvedNavigation | null }) {
  const displayCategories: CategoryBlockItem[] = navigation
    ? navigation.categories
        .filter((cat) => !cat.parentId)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          href: cat.href,
          icon: resolveCategoryIcon(cat.slug, cat.href),
          image: cat.image,
          alt: cat.alt,
        }))
    : SHOWCASE_CATEGORIES;

  return (
    <CategoryProductBlock
      categories={displayCategories}
      title="DANH MỤC SẢN PHẨM"
      subtitle="Chọn nhanh laptop & phụ kiện công nghệ phù hợp nhu cầu"
      viewAllLink="/phan-loai"
    />
  );
}
