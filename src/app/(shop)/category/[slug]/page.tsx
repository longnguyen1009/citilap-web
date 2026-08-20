import Link from "next/link";
import { ChevronRight, Filter, SlidersHorizontal } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

export default function CategoryPage({ params }: { params: { slug: string } }) {
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
  };

  const categoryName = categoryMap[params.slug] || "Danh mục sản phẩm";

  // Mock data for the category
  let mockProducts = [];

  if (params.slug === "laptop-gaming") {
    mockProducts = [
      {
        id: "g1",
        name: "Lenovo Legion 5 15ARH7H (Ryzen 7 6800H / 16GB / 512GB / RTX 3050Ti)",
        price: "28.490.000đ", oldPrice: "32.990.000đ", discount: "-14%",
        image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "Ryzen 7 6800H", ram: "16GB", ssd: "512GB", display: "15.6 FHD 165Hz" }
      },
      {
        id: "g2", name: "Acer Predator Helios Neo 16",
        price: "34.990.000đ", oldPrice: "39.990.000đ", discount: "-13%",
        image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "512GB", display: "16.0 WQXGA" }
      },
      {
        id: "g3", name: "Asus ROG Strix G15 G513RC",
        price: "23.990.000đ", oldPrice: "27.990.000đ", discount: "-14%",
        image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "Ryzen 7 6800H", ram: "8GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
      },
      {
        id: "g4", name: "MSI Katana 15 B13VFK",
        price: "29.990.000đ", oldPrice: "33.990.000đ", discount: "-11%",
        image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i7 13620H", ram: "16GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
      },
      {
        id: "g5", name: "Dell Alienware m16 R1",
        price: "42.490.000đ", oldPrice: "47.990.000đ", discount: "-11%",
        image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "1TB", display: "16.0 QHD+ 165Hz" }
      },
      {
        id: "g6", name: "Gigabyte Aorus 15 BKF",
        price: "31.990.000đ", oldPrice: "35.990.000đ", discount: "-11%",
        image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i7 13700H", ram: "16GB", ssd: "512GB", display: "15.6 QHD 165Hz" }
      },
      {
        id: "g7", name: "HP Victus 16 2023",
        price: "21.990.000đ", oldPrice: "25.990.000đ", discount: "-15%",
        image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i5 13500H", ram: "16GB", ssd: "512GB", display: "16.1 FHD 144Hz" }
      },
      {
        id: "g8", name: "Acer Nitro 5 Tiger 2022",
        price: "19.990.000đ", oldPrice: "23.990.000đ", discount: "-16%",
        image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i5 12500H", ram: "8GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
      }
    ];
  } else if (params.slug === "ultrabook") {
    mockProducts = [
      {
        id: "u1", name: "Dell XPS 13 Plus 9320",
        price: "45.990.000đ", oldPrice: "49.990.000đ", discount: "-8%",
        image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i7 1260P", ram: "16GB", ssd: "512GB", display: "13.4 3.5K OLED" }
      },
      {
        id: "u2", name: "LG Gram 14 2023",
        price: "28.990.000đ", oldPrice: "32.990.000đ", discount: "-12%",
        image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
        specs: { cpu: "i5 1340P", ram: "16GB", ssd: "512GB", display: "14.0 WUXGA" }
      }
    ];
  } else {
    mockProducts = Array.from({ length: 8 }).map((_, i) => ({
      id: `${params.slug}-p${i}`,
      name: `Laptop ${categoryName} Mẫu ${i + 1} (Intel Core i7 / 16GB / 512GB)`,
      price: `${20 + i}.990.000đ`,
      oldPrice: `${25 + i}.990.000đ`,
      discount: "-15%",
      image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
      specs: {
        cpu: "Core i7 13700H",
        ram: "16GB",
        ssd: "512GB",
        display: "15.6 FHD 144Hz"
      }
    }));
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">{categoryName}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        {/* 2. Banner & Title */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 uppercase">
            {categoryName}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Khám phá {mockProducts.length} sản phẩm cấu hình cao, giá tốt nhất thị trường.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3. Sidebar Filter */}
          <div className="lg:col-span-1 space-y-6 hidden lg:block">
            {/* Filter Group: Hãng */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 uppercase flex items-center gap-2 border-b pb-2">
                <Filter className="w-4 h-4 text-blue-600" /> Hãng sản xuất
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                {["Asus", "Acer", "Dell", "Lenovo", "MSI", "HP"].map((brand) => (
                  <label key={brand} className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Giá */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 uppercase border-b pb-2">Mức giá</h3>
              <div className="space-y-3 text-sm text-gray-700">
                {["Dưới 15 triệu", "15 - 20 triệu", "20 - 30 triệu", "Trên 30 triệu"].map((price) => (
                  <label key={price} className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span>{price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: CPU */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4 uppercase border-b pb-2">Bộ vi xử lý</h3>
              <div className="space-y-3 text-sm text-gray-700">
                {["Core i5", "Core i7", "Core i9", "Ryzen 5", "Ryzen 7"].map((cpu) => (
                  <label key={cpu} className="flex items-center gap-3 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span>{cpu}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Product List & Sort */}
          <div className="lg:col-span-3">
            {/* Top Bar Sort */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button className="lg:hidden bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                  <Filter className="w-4 h-4" /> Lọc
                </button>
                <span className="text-sm font-bold text-gray-700">Sắp xếp theo:</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button className="bg-blue-50 text-blue-600 border border-blue-200 font-bold px-4 py-2 rounded-lg transition">Mới nhất</button>
                <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium px-4 py-2 rounded-lg transition">Bán chạy</button>
                <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium px-4 py-2 rounded-lg transition flex items-center gap-1">Giá thấp <ChevronRight className="w-3 h-3 rotate-90"/></button>
                <button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium px-4 py-2 rounded-lg transition flex items-center gap-1">Giá cao <ChevronRight className="w-3 h-3 -rotate-90"/></button>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {mockProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex justify-center">
              <nav className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition disabled:opacity-50" disabled>
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">1</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium transition">2</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium transition">3</button>
                <span className="text-gray-500 px-2">...</span>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium transition">8</button>
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
