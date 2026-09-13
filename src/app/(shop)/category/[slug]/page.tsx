import Link from "next/link";
import { ChevronRight, Filter } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import CategoryFilters from "@/components/category/CategoryFilters";

// Map brand names to display names
const brandNames: Record<string, string> = {
  lenovo: "Lenovo", asus: "Asus", acer: "Acer", hp: "HP", dell: "Dell", msi: "MSI",
  gigabyte: "Gigabyte", apple: "Apple", lg: "LG", samsung: "Samsung",
};

const categoryMap: Record<string, string> = {
  "laptop-gaming": "Laptop Gaming",
  "ultrabook": "Ultrabook Cao Cấp",
  "laptop-van-phong": "Laptop Văn Phòng",
  "laptop-do-hoa": "Laptop Đồ Hoạ - Kỹ Thuật",
  "macbook": "Apple - Macbook",
  "linh-kien": "Linh Kiện - Phụ Kiện",
  "may-luot": "Laptop Cũ - Máy Lướt",
  "workstation": "Máy Trạm - Workstation",
  "gear": "Phụ Kiện & Gear",
  "apple": "Apple (MacBook - iPad)",
  "surface": "Microsoft Surface",
  "pc": "PC - Máy tính để bàn",
  "linh-kien-pc": "Linh kiện PC",
  "camera": "Camera",
  "laptop-moi": "Laptop Mới",
  "laptop-cu": "Laptop Like New",
};

// Full product data per category
const allProductsByCategory: Record<string, { id: string; name: string; price: string; oldPrice: string; discount: string; image: string; brand: string; specs: { cpu: string; ram: string; ssd: string; gpu: string; display: string } }[]> = {
  "laptop-gaming": [
    { id: "g1", name: "Lenovo Legion 5 15ARH7H (Ryzen 7 6800H / 16GB / 512GB / RTX 3050Ti)", price: "28.490.000đ", oldPrice: "32.990.000đ", discount: "-14%", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop", brand: "Lenovo", specs: { cpu: "Ryzen 7 6800H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050Ti 4GB", display: "15.6 FHD 165Hz" } },
    { id: "g2", name: "Acer Predator Helios Neo 16", price: "34.990.000đ", oldPrice: "39.990.000đ", discount: "-13%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", brand: "Acer", specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "16.0 WQXGA" } },
    { id: "g3", name: "Asus ROG Strix G15 G513RC", price: "23.990.000đ", oldPrice: "27.990.000đ", discount: "-14%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", brand: "Asus", specs: { cpu: "Ryzen 7 6800H", ram: "8GB", ssd: "512GB", gpu: "RTX 3050Ti 4GB", display: "15.6 FHD 144Hz" } },
    { id: "g4", name: "MSI Katana 15 B13VFK", price: "29.990.000đ", oldPrice: "33.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "MSI", specs: { cpu: "i7 13620H", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 FHD 144Hz" } },
    { id: "g5", name: "Dell Alienware m16 R1", price: "42.490.000đ", oldPrice: "47.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop", brand: "Dell", specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "1TB", gpu: "RTX 4060 8GB", display: "16.0 QHD+ 165Hz" } },
    { id: "g6", name: "Gigabyte Aorus 15 BKF", price: "31.990.000đ", oldPrice: "35.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop", brand: "Gigabyte", specs: { cpu: "i7 13700H", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 QHD 165Hz" } },
    { id: "g7", name: "HP Victus 16 2023", price: "21.990.000đ", oldPrice: "25.990.000đ", discount: "-15%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", brand: "HP", specs: { cpu: "i5 13500H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050 6GB", display: "16.1 FHD 144Hz" } },
    { id: "g8", name: "Acer Nitro 5 Tiger 2022", price: "19.990.000đ", oldPrice: "23.990.000đ", discount: "-16%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", brand: "Acer", specs: { cpu: "i5 12500H", ram: "8GB", ssd: "512GB", gpu: "RTX 3050 4GB", display: "15.6 FHD 144Hz" } },
    { id: "g9", name: "Lenovo Legion Pro 5 16ARX8", price: "38.990.000đ", oldPrice: "42.990.000đ", discount: "-9%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "Lenovo", specs: { cpu: "Ryzen 9 7945HX", ram: "32GB", ssd: "1TB", gpu: "RTX 4070 8GB", display: "16.0 WQXGA 240Hz" } },
    { id: "g10", name: "Asus ROG Strix G16 G614JI", price: "44.990.000đ", oldPrice: "49.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop", brand: "Asus", specs: { cpu: "i9 13980HX", ram: "32GB", ssd: "1TB", gpu: "RTX 4080 12GB", display: "16.0 QHD 240Hz" } },
  ],
  "laptop-van-phong": [
    { id: "vp1", name: "Dell XPS 15 9530", price: "42.990.000đ", oldPrice: "47.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", brand: "Dell", specs: { cpu: "i7 13700H", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "15.6 FHD+" } },
    { id: "vp2", name: "Lenovo ThinkPad X1 Carbon Gen 11", price: "35.990.000đ", oldPrice: "39.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", brand: "Lenovo", specs: { cpu: "i7 1365U", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "14 WUXGA" } },
    { id: "vp3", name: "HP EliteBook 860 G10", price: "29.990.000đ", oldPrice: "33.490.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "HP", specs: { cpu: "i7 1365U", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "16 WUXGA" } },
    { id: "vp4", name: "Asus Zenbook 14 OLED UX3402", price: "24.490.000đ", oldPrice: "27.990.000đ", discount: "-12%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "Asus", specs: { cpu: "i5 1240P", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "14 2.8K OLED" } },
    { id: "vp5", name: "Dell Inspiron 16 5630", price: "19.990.000đ", oldPrice: "22.990.000đ", discount: "-13%", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop", brand: "Dell", specs: { cpu: "i5 1340P", ram: "8GB", ssd: "512GB", gpu: "Iris Xe", display: "16 FHD+" } },
    { id: "vp6", name: "Acer Swift Go 14", price: "19.990.000đ", oldPrice: "23.490.000đ", discount: "-14%", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop", brand: "Acer", specs: { cpu: "i5 13500H", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "14 2.8K OLED" } },
    { id: "vp7", name: "HP Pavilion 14 dv2000", price: "16.990.000đ", oldPrice: "19.490.000đ", discount: "-12%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", brand: "HP", specs: { cpu: "i5 1235U", ram: "8GB", ssd: "512GB", gpu: "Iris Xe", display: "14 FHD IPS" } },
    { id: "vp8", name: "Lenovo IdeaPad 5 Pro 16", price: "21.990.000đ", oldPrice: "25.490.000đ", discount: "-13%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", brand: "Lenovo", specs: { cpu: "Ryzen 7 7730U", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "16 2.5K" } },
  ],
  "macbook": [
    { id: "mb1", name: "MacBook Air M3 15 inch", price: "37.990.000đ", oldPrice: "", discount: "NEW", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop", brand: "Apple", specs: { cpu: "Apple M3", ram: "8GB", ssd: "256GB", gpu: "GPU 10-core", display: "15.3 Liquid Retina" } },
    { id: "mb2", name: "MacBook Pro M3 Pro 14 inch", price: "49.990.000đ", oldPrice: "", discount: "NEW", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop", brand: "Apple", specs: { cpu: "Apple M3 Pro", ram: "18GB", ssd: "512GB", gpu: "GPU 14-core", display: "14 Liquid Retina XDR" } },
    { id: "mb3", name: "MacBook Air M2 13 inch", price: "27.990.000đ", oldPrice: "31.990.000đ", discount: "-12%", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop", brand: "Apple", specs: { cpu: "Apple M2", ram: "8GB", ssd: "256GB", gpu: "GPU 8-core", display: "13.6 Liquid Retina" } },
    { id: "mb4", name: "MacBook Pro M3 Max 16 inch", price: "74.990.000đ", oldPrice: "", discount: "NEW", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop", brand: "Apple", specs: { cpu: "Apple M3 Max", ram: "36GB", ssd: "1TB", gpu: "GPU 30-core", display: "16 Liquid Retina XDR" } },
    { id: "mb5", name: "MacBook Pro M3 14 inch", price: "41.990.000đ", oldPrice: "", discount: "NEW", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop", brand: "Apple", specs: { cpu: "Apple M3", ram: "8GB", ssd: "512GB", gpu: "GPU 10-core", display: "14 Liquid Retina XDR" } },
  ],
  "laptop-do-hoa": [
    { id: "dg1", name: "HP ZBook Studio G10", price: "45.990.000đ", oldPrice: "50.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "HP", specs: { cpu: "i7 13800H", ram: "32GB", ssd: "1TB", gpu: "RTX A1000", display: "15.6 4K OLED" } },
    { id: "dg2", name: "Dell Precision 5680", price: "52.990.000đ", oldPrice: "58.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop", brand: "Dell", specs: { cpu: "i7 13700H", ram: "32GB", ssd: "1TB", gpu: "RTX A2000", display: "16 UHD+" } },
    { id: "dg3", name: "Asus ProArt Studiobook 16", price: "48.990.000đ", oldPrice: "54.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop", brand: "Asus", specs: { cpu: "i9 13980HX", ram: "32GB", ssd: "1TB", gpu: "RTX 4070 8GB", display: "16 3.2K OLED" } },
    { id: "dg4", name: "Lenovo ThinkPad P16 Gen 2", price: "55.990.000đ", oldPrice: "62.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", brand: "Lenovo", specs: { cpu: "i7 13850HX", ram: "32GB", ssd: "1TB", gpu: "RTX A2000", display: "16 WQXGA" } },
    { id: "dg5", name: "MSI Creator Z16P HX Studio", price: "49.990.000đ", oldPrice: "55.990.000đ", discount: "-10%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", brand: "MSI", specs: { cpu: "i9 12900HX", ram: "32GB", ssd: "1TB", gpu: "RTX 3080Ti", display: "16 QHD+ 165Hz" } },
  ],
};

// Fallback: generate products for unknown categories
function generateFallbackProducts(slug: string, name: string) {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `${slug}-p${i}`, name: `${name} Mẫu ${i + 1} (Intel Core i7 / 16GB / 512GB)`,
    price: `${20 + i}.990.000đ`, oldPrice: `${25 + i}.990.000đ`, discount: "-15%",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
    brand: ["Asus", "Dell", "HP", "Lenovo", "MSI"][i % 5],
    specs: { cpu: "Core i7 13700H", ram: "16GB", ssd: "512GB", gpu: "RTX 4050 6GB", display: "15.6 FHD 144Hz" },
  }));
}

// Accessories categories
const accessoryCategories = ["linh-kien", "gear", "linh-kien-pc", "camera"];

type CategoryProduct = (typeof allProductsByCategory)[string][number];

function formatPrice(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function normalizeProduct(product: {
  id: string; name: string; price: number; originalPrice: number | null; images: string; tags: string | null; specs: string | null;
}): CategoryProduct {
  let images: string[] = [];
  let specs: Record<string, string> = {};
  try { const parsed = JSON.parse(product.images); images = Array.isArray(parsed) ? parsed : [product.images]; } catch { images = product.images ? [product.images] : []; }
  try { const parsed = product.specs ? JSON.parse(product.specs) : {}; specs = Array.isArray(parsed) ? Object.fromEntries(parsed.map((item: { name: string; value: string }) => [item.name, item.value])) : parsed; } catch { specs = {}; }
  const price = Number(product.price);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  return {
    id: product.id,
    name: product.name,
    price: formatPrice(price),
    oldPrice: originalPrice ? formatPrice(originalPrice) : "",
    discount: originalPrice && originalPrice > price ? `-${Math.round((1 - price / originalPrice) * 100)}%` : "",
    image: images[0] || "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
    brand: (product.tags || "").split(",")[1]?.trim() || product.name.split(" ")[0],
    specs: { cpu: specs.CPU || specs.cpu || "", ram: specs.RAM || specs.ram || "", ssd: specs.SSD || specs.ssd || "", gpu: specs.GPU || specs.VGA || specs.gpu || "", display: specs["Màn hình"] || specs.display || "" },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = categoryMap[slug] || "Danh mục sản phẩm";
  return {
    title: name,
    description: `Mua ${name} chính hãng giá tốt tại CITILAP.VN. Bảo hành 12 tháng, tư vấn miễn phí, giao hàng nhanh toàn quốc.`,
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ brand?: string; sort?: string; page?: string }> }) {
  const { slug } = await params;
  const { brand, sort, page } = await searchParams;

  const categoryName = categoryMap[slug] || "Danh mục sản phẩm";
  const displayTitle = brand ? `${categoryName} ${brandNames[brand] || brand}` : categoryName;

  // Prefer database products so the storefront reflects admin changes.
  let products: CategoryProduct[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const rows = await prisma.product.findMany({
        where: { category: { slug }, status: "active" },
        orderBy: { createdAt: "desc" },
      });
      products = rows.map(normalizeProduct);
    } catch (error) {
      console.error("Failed to load category products:", error);
    }
  }
  if (products.length === 0) {
    products = allProductsByCategory[slug] || generateFallbackProducts(slug, categoryName);
  }

  // Get available brands in this category
  const availableBrands = [...new Set(products.map((p) => p.brand))].sort();

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex items-center text-sm text-gray-500 py-3 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400" />
            <span className="text-gray-800 font-bold">{displayTitle}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        {/* Title Banner */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase">{displayTitle}</h1>
          <p className="text-sm text-gray-500 mt-2">
            Khám phá {products.length} sản phẩm cấu hình cao, giá tốt nhất thị trường.
          </p>
        </div>

        {/* Client-side filter/sort wrapper */}
        <CategoryFilters
          products={products}
          availableBrands={availableBrands}
          currentBrand={brand}
          currentSort={sort}
          currentPage={page}
          categorySlug={slug}
          categoryName={categoryName}
        />
      </div>
    </div>
  );
}
