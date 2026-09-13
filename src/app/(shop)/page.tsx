import Link from "next/link";
import {
  ChevronRight, Laptop, ShieldCheck, ThumbsUp,
  Zap, Truck, Flame, Briefcase,
  Server, Headphones, PlayCircle, Clock, Award,
  Sparkles, TrendingUp, Star, Phone, MessageCircle, User
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- DUMMY DATA ---
const features = [
  { icon: Laptop, title: "Máy lướt, giá tốt" },
  { icon: ShieldCheck, title: "Cam kết nguyên zin" },
  { icon: ThumbsUp, title: "Dịch vụ vượt trội" },
  { icon: Truck, title: "Giao hàng nhanh chóng" },
];

const mockProducts = [
  {
    id: "g1", name: "Laptop Lenovo Legion 5 15ARH7H",
    price: "28.490.000đ", oldPrice: "32.990.000đ", discount: "-14%",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Ryzen 7 6800H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050Ti 4GB", display: "15.6 FHD 165Hz" }
  },
  {
    id: "g2", name: "Acer Predator Helios Neo 16",
    price: "34.990.000đ", oldPrice: "39.990.000đ", discount: "-13%",
    image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "16.0 WQXGA" }
  },
  {
    id: "g3", name: "Asus ROG Strix G15 G513RC",
    price: "23.990.000đ", oldPrice: "27.990.000đ", discount: "-14%",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Ryzen 7 6800H", ram: "8GB", ssd: "512GB", gpu: "RTX 3050Ti 4GB", display: "15.6 FHD 144Hz" }
  },
  {
    id: "g4", name: "MSI Katana 15 B13VFK",
    price: "29.990.000đ", oldPrice: "33.990.000đ", discount: "-11%",
    image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 13620H", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 FHD 144Hz" }
  },
  {
    id: "g5", name: "Dell Alienware m16 R1",
    price: "42.490.000đ", oldPrice: "47.990.000đ", discount: "-11%",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "1TB", gpu: "RTX 4060 8GB", display: "16.0 QHD+ 165Hz" }
  },
  {
    id: "g6", name: "Lenovo Legion Slim 5 16APH8",
    price: "31.990.000đ", oldPrice: "36.990.000đ", discount: "-14%",
    image: "https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Ryzen 7 7840HS", ram: "16GB", ssd: "1TB", gpu: "RTX 4060 8GB", display: "16.0 WQXGA 165Hz" }
  },
  {
    id: "g7", name: "Acer Nitro 5 AN515-58",
    price: "21.990.000đ", oldPrice: "25.990.000đ", discount: "-15%",
    image: "https://images.unsplash.com/photo-1593642532400-2682810df593?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i5 12500H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050 4GB", display: "15.6 FHD 144Hz" }
  },
  {
    id: "g8", name: "HP Victus 16-e1107AX",
    price: "19.490.000đ", oldPrice: "23.490.000đ", discount: "-17%",
    image: "https://images.unsplash.com/photo-1603481546238-487240415921?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Ryzen 5 6600H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050 4GB", display: "16.1 FHD 144Hz" }
  },
  {
    id: "g9", name: "Asus TUF Gaming F15 FX507ZC4",
    price: "22.990.000đ", oldPrice: "26.490.000đ", discount: "-13%",
    image: "https://images.unsplash.com/photo-1542645696-6b8a5a6c8b7d?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i5 12500H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050 4GB", display: "15.6 FHD 144Hz" }
  },
  {
    id: "g10", name: "MSI Pulse 17 B13V",
    price: "27.990.000đ", oldPrice: "31.990.000đ", discount: "-12%",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3a1d7a8e?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 13700H", ram: "16GB", ssd: "1TB", gpu: "RTX 4060 8GB", display: "17.3 FHD 144Hz" }
  }
];

const mockProductsRow2 = [
  { ...mockProducts[5], id: "g11", name: "Gigabyte G5 KF5", specs: { cpu: "i5 12500H", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 FHD 144Hz" } },
  { ...mockProducts[6], id: "g12", name: "Lenovo LOQ 15IRX9", specs: { cpu: "i7 13650HX", ram: "16GB", ssd: "1TB", gpu: "RTX 4050 6GB", display: "15.6 FHD 144Hz" } },
  { ...mockProducts[7], id: "g13", name: "Acer Predator Triton 14", specs: { cpu: "i7 13700H", ram: "16GB", ssd: "1TB", gpu: "RTX 4050 6GB", display: "14.0 WQXGA 165Hz" } },
  { ...mockProducts[8], id: "g14", name: "Asus ROG Zephyrus G14", specs: { cpu: "Ryzen 9 7940HS", ram: "32GB", ssd: "1TB", gpu: "RTX 4060 8GB", display: "14.0 QHD+ 165Hz" } },
  { ...mockProducts[9], id: "g15", name: "Dell G15 5530", specs: { cpu: "i7 13650HX", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 FHD 165Hz" } }
];

const mockUltrabooks = [
  {
    id: "u1", name: "MacBook Pro 14 M2 Pro 2023",
    price: "46.490.000đ", oldPrice: "49.990.000đ", discount: "-7%",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Apple M2 Pro", ram: "16GB", ssd: "512GB", gpu: "GPU 16-core", display: "14.2 Liquid Retina" }
  },
  {
    id: "u2", name: "Dell XPS 13 Plus 9320",
    price: "39.990.000đ", oldPrice: "45.990.000đ", discount: "-13%",
    image: "https://images.unsplash.com/photo-1593642702821-c823b13eb295?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1360P", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "13.4 3.5K OLED" }
  },
  {
    id: "u3", name: "HP Spectre x360 14",
    price: "36.490.000đ", oldPrice: "40.990.000đ", discount: "-10%",
    image: "https://images.unsplash.com/photo-1531297172868-9f1c1ea2f7c0?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1355U", ram: "16GB", ssd: "1TB", gpu: "Iris Xe", display: "13.5 WUXGA+" }
  },
  {
    id: "u4", name: "Lenovo ThinkPad X1 Carbon Gen 11",
    price: "41.990.000đ", oldPrice: "48.990.000đ", discount: "-14%",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1355U", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "14.0 WUXGA" }
  },
  {
    id: "u5", name: "Asus Zenbook 14 OLED UX3402",
    price: "24.490.000đ", oldPrice: "27.990.000đ", discount: "-12%",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i5 1240P", ram: "16GB", ssd: "512GB", gpu: "Iris Xe", display: "14.0 2.8K OLED" }
  }
];

const mockUltrabookExtra = [
  { ...mockUltrabooks[0], id: "u6", name: "Microsoft Surface Laptop 5", price: "28.990.000đ", oldPrice: "33.990.000đ" },
  { ...mockUltrabooks[1], id: "u7", name: "LG Gram 16Z90R", price: "35.490.000đ", oldPrice: "39.990.000đ" },
  { ...mockUltrabooks[2], id: "u8", name: "Acer Swift Go 14", price: "19.990.000đ", oldPrice: "23.490.000đ" },
  { ...mockUltrabooks[3], id: "u9", name: "Huawei MateBook X Pro", price: "32.990.000đ", oldPrice: "37.990.000đ" },
  { ...mockUltrabooks[4], id: "u10", name: "Samsung Galaxy Book3 Pro", price: "31.490.000đ", oldPrice: "36.490.000đ" },
];
const allUltrabooks = [...mockUltrabooks, ...mockUltrabookExtra];
const mockWorkstations = [...mockProducts, ...mockProductsRow2].slice(0, 10).map((p, i) => ({...p, id: `workstation-${i + 1}`, name: ["ThinkPad P16 Gen 2", "Dell Precision 7670", "HP ZBook Fury 16"][i % 3], price: `${45 + i}.000.000đ`, oldPrice: `${55 + i}.000.000đ`, discount: "-15%"}));
const mockNewProducts = [...mockProductsRow2, ...mockUltrabookExtra].slice(0, 10).map((p, i) => ({ ...p, id: `new-${i + 1}`, discount: "NEW" }));
const mockFlashSale = [...mockProducts.slice(0, 5), ...mockProductsRow2.slice(0, 5)].map((p, i) => ({ ...p, id: `flash-${i + 1}`, discount: "Deal Sốc" }));
const mockBestSellers = [...mockProducts.slice(0, 5), ...mockUltrabookExtra.slice(0, 5)].map((p, i) => ({ ...p, id: `best-${i + 1}` }));
const mockAccessories = [
  ["Logitech G502 X Lightspeed", "2.490.000đ"], ["Razer BlackWidow V4", "3.290.000đ"], ["HyperX Cloud III", "1.990.000đ"],
  ["CitiLap Gaming Backpack", "890.000đ"], ["Cooler Master Notepal", "790.000đ"], ["ASUS ROG Strix Mouse", "1.590.000đ"],
  ["Keychron K8 Pro", "2.190.000đ"], ["Sony WH-1000XM5", "7.490.000đ"], ["Baseus USB-C Hub", "590.000đ"], ["G.Skill Gaming Mat", "390.000đ"],
].map(([name, price], i) => ({ name, price, image: mockProducts[i].image }));

const sectionConfig = {
  flashSale: { title: "DEAL CHỚP NHOÁNG", products: mockFlashSale },
  newProducts: { title: "HÀNG MỚI VỀ", products: mockNewProducts },
  gaming: { title: "LAPTOP GAMING", products: [...mockProducts, ...mockProductsRow2] },
  ultrabook: { title: "ULTRABOOK CAO CẤP", products: allUltrabooks },
  workstation: { title: "MÁY TRẠM WORKSTATION", products: mockWorkstations },
  bestSellers: { title: "BÁN CHẠY NHẤT", products: mockBestSellers },
  accessories: { title: "PHỤ KIỆN & GEAR GAMING", products: mockAccessories },
};
const renderRows = (products: typeof mockProducts, badgeColor?: string, rank = false) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">{products.slice(0, 5).map((p, i) => <ProductCard key={`${p.id}-row1`} product={p} badgeColor={badgeColor} rank={rank ? i + 1 : undefined} />)}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{products.slice(5, 10).map((p, i) => <ProductCard key={`${p.id}-row2`} product={p} badgeColor={badgeColor} rank={rank ? i + 6 : undefined} />)}</div>
  </>
);

import ProductCard from "@/components/product/ProductCard";
import FlashSaleCountdown from "@/components/product/FlashSaleCountdown";

async function getSectionProducts(section: string, fallback: any[]) {
  if (!process.env.DATABASE_URL) return fallback;
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.product.findMany({
      where: { status: "active", ...(section === "flash-sale" ? { originalPrice: { not: null } } : {}), ...(section === "gaming" ? { tags: { contains: "gaming" } } : {}), ...(section === "ultrabook" ? { tags: { contains: "ultrabook" } } : {}), ...(section === "workstation" ? { tags: { contains: "workstation" } } : {}), ...(section === "accessories" ? { category: { slug: { in: ["phu-kien", "chuot-gaming", "ban-phim-co"] } } } : {}) },
      orderBy: { createdAt: "desc" }, take: 10,
    });
    return rows.map((row) => {
      let images: string[] = []; let specs: Record<string, string> = {};
      try { const value = JSON.parse(row.images); images = Array.isArray(value) ? value : [row.images]; } catch { images = [row.images]; }
      try { const value = row.specs ? JSON.parse(row.specs) : {}; specs = Array.isArray(value) ? Object.fromEntries(value.map((item: any) => [item.name, item.value])) : value; } catch { specs = {}; }
      const price = Number(row.price); const oldPrice = row.originalPrice ? Number(row.originalPrice) : null;
      return { id: row.id, name: row.name, price: `${price.toLocaleString("vi-VN")}đ`, oldPrice: oldPrice ? `${oldPrice.toLocaleString("vi-VN")}đ` : "", discount: oldPrice ? `-${Math.round((1 - price / oldPrice) * 100)}%` : "", image: images[0], specs: { cpu: specs.CPU || "", ram: specs.RAM || "", ssd: specs.SSD || "", gpu: specs.GPU || "", display: specs["Màn hình"] || "" } };
    });
  } catch (error) { console.error(`Failed to load ${section} products`, error); return fallback; }
}

const BlockHeader = ({ title, icon: Icon, colorClass, links, slug = "laptop-gaming" }: { title: string, icon: LucideIcon, colorClass: string, links: string[], slug?: string }) => (
  <div className={`${colorClass} rounded-t-lg px-4 py-3 flex flex-col lg:flex-row lg:justify-between lg:items-center shadow-sm`}>
    <h2 className="text-lg md:text-xl font-black text-white uppercase flex items-center gap-2 mb-3 lg:mb-0">
      <Icon className="w-6 h-6"/> {title}
    </h2>
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
      {links.map((link, i) => (
        <Link key={i} href={`/category/${slug}`} className="hover:bg-white hover:text-gray-900 bg-white/20 text-white px-3 py-1 rounded-full transition text-[11px] md:text-xs tracking-wide">{link}</Link>
      ))}
      <Link href={`/category/${slug}`} className="flex items-center text-white hover:underline font-bold ml-2 text-xs md:text-sm">
        Xem tất cả <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// --- MAIN PAGE ---
export default async function Home() {
  const sectionProducts = {
    flashSale: await getSectionProducts("flash-sale", mockFlashSale),
    newProducts: await getSectionProducts("new", mockNewProducts),
    gaming: await getSectionProducts("gaming", [...mockProducts, ...mockProductsRow2]),
    ultrabook: await getSectionProducts("ultrabook", allUltrabooks),
    workstation: await getSectionProducts("workstation", mockWorkstations),
    bestSellers: await getSectionProducts("best-selling", mockBestSellers),
    accessories: await getSectionProducts("accessories", mockAccessories),
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      
      {/* 1. HERO SECTION */}
      <section className="bg-[#0f172a]">
        <div className="w-full relative h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')" }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1221]/90 via-[#0b1221]/50 to-transparent flex items-center">
              <div className="container mx-auto px-4 max-w-[1370px]">
                <div className="max-w-xl text-white">
                  <div className="inline-block border-2 border-blue-500 rounded-lg px-4 py-1 mb-4 backdrop-blur-sm bg-blue-900/30">
                    <span className="text-blue-400 font-black text-xl tracking-widest uppercase">CitiLap Gaming Zone</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black mb-2 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    LAPTOP <span className="text-blue-500">GAMING</span>
                  </h2>
                  <p className="text-xl md:text-2xl font-bold text-yellow-400 mb-8 tracking-wide">
                    ✩ HIỆU NĂNG MẠNH MẼ - CHIẾN GAME CỰC ĐỈNH ✩
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUB-BANNERS */}
      <section className="py-4">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden shadow-md relative group h-[120px] md:h-[150px]">
              <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop" alt="Ultrabook cao cấp - Sang trọng và mỏng nhẹ" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center p-6">
                <div className="text-white">
                  <h3 className="text-xl md:text-2xl font-black mb-1 text-yellow-400 uppercase italic">Ultrabook Cao Cấp</h3>
                  <p className="font-bold text-sm mb-3">Sang trọng & Mỏng nhẹ</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-5 rounded-full uppercase text-xs shadow-lg" aria-label="Xem ngay ultrabook cao cấp">Xem ngay</button>
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-md relative group h-[120px] md:h-[150px]">
              <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" alt="Ưu đãi cực khủng - Tặng chuột Gaming và Balo" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 to-transparent flex items-center p-6">
                <div className="text-white">
                  <h3 className="text-xl md:text-2xl font-black mb-1 text-yellow-400 uppercase italic">Ưu đãi cực khủng</h3>
                  <p className="font-bold text-sm mb-3">Tặng chuột Gaming & Balo</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-5 rounded-full uppercase text-xs shadow-lg" aria-label="Mua ngay ưu đãi cực khủng">Mua ngay</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="bg-white border-b-2 border-blue-600 rounded-lg p-3 flex flex-col md:flex-row items-center justify-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-300 cursor-pointer group">
                <feature.icon className="w-7 h-7 text-blue-600 group-hover:scale-110 transition" />
                <span className="font-bold text-gray-800 text-xs md:text-sm text-center md:text-left">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. FLASH SALE */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-xl shadow-lg p-1.5 transform hover:scale-[1.002] transition duration-300">
            <div className="bg-white rounded-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 uppercase flex items-center gap-2 italic">
                  <Flame className="w-8 h-8 text-red-600"/> DEAL CHỚP NHOÁNG
                </h2>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  <FlashSaleCountdown />
                  <Link href="/hot-sale" className="font-bold text-red-600 hover:text-orange-500 hover:underline whitespace-nowrap">
                    Xem tất cả &gt;
                  </Link>
                </div>
              </div>
              {/* Row 1 - 5 products */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {sectionProducts.flashSale.slice(0, 5).map((p) => <ProductCard key={p.id + 'fs'} product={{...p, discount: "Deal Sốc"}} badgeColor="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-md" />)}
              </div>
              {/* Row 2 - 5 products */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sectionProducts.flashSale.slice(5, 10).map((p) => <ProductCard key={p.id + 'fs2'} product={{...p, discount: "Deal Sốc"}} badgeColor="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-md" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HÀNG MỚI VỀ */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader
              title="Hàng Mới Về - Bắt Trend Công Nghệ"
              icon={Sparkles}
              colorClass="bg-gradient-to-r from-indigo-700 to-indigo-500"
              links={["Gaming Mới Nhất", "Ultrabook Mới", "Apple", "Surface"]}
            />
            <div className="p-4 md:p-6 bg-white">
              {renderRows(sectionProducts.newProducts, "bg-indigo-600")}
            </div>
          </div>
        </div>
      </section>

      {/* 4. LAPTOP GAMING */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader
              title="Laptop Gaming - Chiến Thần Đồ Hoạ"
              icon={Zap}
              colorClass="bg-gradient-to-r from-red-700 to-red-500"
              links={["Dưới 20 Triệu", "20-30 Triệu", "Cao Cấp", "Mới Về"]}
              slug="laptop-gaming"
            />
            <div className="p-4 md:p-6 bg-white">
              {renderRows(sectionProducts.gaming)}
            </div>
          </div>
        </div>
      </section>

      {/* 4. ULTRABOOK CAO CẤP */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader 
              title="Ultrabook Cao Cấp - Doanh Nhân" 
              icon={Briefcase} 
              colorClass="bg-gradient-to-r from-blue-700 to-blue-500" 
              links={["MacBook", "Dell XPS", "ThinkPad", "HP Spectre"]}
              slug="laptop-van-phong"
            />
            <div className="p-4 md:p-6 bg-white">
              {renderRows(sectionProducts.ultrabook, "bg-blue-600")}
            </div>
          </div>
        </div>
      </section>

      {/* 6. MÁY TRẠM (WORKSTATION) */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader 
              title="Máy Trạm Workstation - Đồ Hoạ Chuyên Nghiệp" 
              icon={Server} 
              colorClass="bg-gradient-to-r from-gray-800 to-gray-600" 
              links={["Dell Precision", "ThinkPad P", "HP ZBook"]}
              slug="laptop-do-hoa"
            />
            <div className="p-4 md:p-6 bg-white">
              {renderRows(sectionProducts.workstation, "bg-gray-800")}
            </div>
          </div>
        </div>
      </section>

      {/* 7. BÁN CHẠY NHẤT */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader
              title="Bán Chạy Nhất - Được Yêu Thích"
              icon={TrendingUp}
              colorClass="bg-gradient-to-r from-orange-600 to-amber-500"
              links={["Laptop Gaming", "Máy Lướt", "Phụ Kiện", "MacBook"]}
            />
            <div className="p-4 md:p-6 bg-white">
              {renderRows(sectionProducts.bestSellers, "bg-orange-600", true)}
            </div>
          </div>
        </div>
      </section>

      {/* 8. PHỤ KIỆN & GEAR */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transform hover:shadow-lg transition duration-300">
            <BlockHeader 
              title="Phụ Kiện & Gear Gaming" 
              icon={Headphones} 
              colorClass="bg-gradient-to-r from-purple-700 to-purple-500" 
              links={["Chuột Gaming", "Bàn Phím Cơ", "Tai Nghe", "Balo - Túi Chống Sốc"]}
              slug="linh-kien"
            />
            <div className="p-4 md:p-6 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sectionProducts.accessories.map((accessory, i) => (
                  <Link href="/category/linh-kien" key={accessory.name} className="group flex flex-col bg-white border-2 border-orange-100 hover:border-purple-500 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
                    <div className="relative aspect-[4/3] p-4 flex items-center justify-center bg-gray-50 overflow-hidden">
                      <img src={accessory.image} alt={accessory.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-500" />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-purple-600 transition">{accessory.name}</h3>
                      <span className="text-red-600 font-black text-lg">{accessory.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. GÓC CITILAP MEDIA */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-[#0b1221] rounded-xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full filter blur-[100px] opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600 rounded-full filter blur-[100px] opacity-20"></div>
            
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h2 className="text-2xl md:text-3xl font-black uppercase flex items-center gap-3">
                <PlayCircle className="w-8 h-8 text-red-500"/> CitiLap Media & Review
              </h2>
              <Link href="/news" className="hidden md:flex items-center gap-1 text-gray-300 hover:text-white transition">
                Xem thêm Video & Bài viết <ChevronRight className="w-4 h-4"/>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
              {/* Highlight Video */}
              <div className="lg:col-span-2">
                <div className="relative rounded-xl overflow-hidden aspect-video group cursor-pointer border border-gray-700">
                  <img src="https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition duration-700 opacity-80" alt="Video Review"/>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition">
                      <PlayCircle className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-black to-transparent">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">Đánh giá chi tiết</span>
                    <h3 className="text-xl md:text-2xl font-bold text-white">Đánh giá Asus ROG Strix G15: Sức mạnh đáng gờm trong tầm giá 25 Triệu!</h3>
                  </div>
                </div>
              </div>

              {/* News / Other Videos */}
              <div className="flex flex-col gap-4">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex gap-4 group cursor-pointer bg-white/5 hover:bg-white/10 p-3 rounded-lg transition border border-gray-800">
                    <div className="w-24 h-20 rounded-md overflow-hidden relative flex-shrink-0">
                      <img src={`https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=200&auto=format&fit=crop&sig=${i}`} alt={`Video review laptop ${i}`} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="w-6 h-6 text-white opacity-80" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-200 group-hover:text-white line-clamp-2 mb-1">So sánh Lenovo Legion 5 vs Acer Nitro 5: Kẻ tám lạng người nửa cân?</h4>
                      <span className="text-[11px] text-gray-400">2 ngày trước • 12K lượt xem</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ĐÁNH GIÁ KHÁCH HÀNG */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-blue-100 pb-4">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              <h2 className="text-2xl font-black uppercase text-gray-900">Khách Hàng Nói Gì Về CitiLap</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Minh Anh", purchase: "MacBook Air M3", text: "Máy nguyên seal, đội ngũ tư vấn nhiệt tình. Giá tốt hơn nhiều nơi khác. Sẽ ủng hộ shop dài dài!" },
                { name: "Tuấn Kiệt", purchase: "Lenovo Legion 5 Pro", text: "Giao hàng nhanh, đóng gói cẩn thận. Chơi game cực mượt, không giật lag. Chính sách bảo hành 12 tháng rất an tâm." },
                { name: "Hải Yến", purchase: "[Cũ 99%] ThinkPad X1", text: "Máy lướt như mới, pin còn 95%. Rất phù hợp cho sinh viên cần máy nhẹ. Đúng như cam kết của shop!" },
              ].map((review, i) => (
                <div key={i} className="flex flex-col gap-3 border border-gray-100 rounded-xl p-5 bg-gray-50/50 hover:bg-white hover:shadow-md transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                      {review.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{review.name}</h4>
                      <span className="text-[11px] text-gray-500">Đã mua: {review.purchase}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, s) => <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. TƯ VẤN CHỌN MÁY */}
      <section className="pb-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-gradient-to-r from-[#0b1221] to-blue-900 rounded-xl shadow-lg p-6 md:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full filter blur-[100px] opacity-20"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-black uppercase mb-4 flex items-center gap-3">
                  <MessageCircle className="w-10 h-10 text-blue-400" /> Tư Vấn Chọn Máy
                </h2>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Không biết chọn máy nào? Để đội ngũ chuyên gia CitiLap giúp bạn tìm chiếc laptop phù hợp nhất với nhu cầu và ngân sách!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href="tel:0853111999" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-bold transition shadow-lg">
                    <Phone className="w-5 h-5" /> 0853.111.999
                  </a>
                  <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 px-6 py-3 rounded-full font-bold transition">
                    <MessageCircle className="w-5 h-5 text-blue-400" /> Chat Zalo
                  </a>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h3 className="font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-blue-400" /> Để lại thông tin, CitiLap gọi lại ngay</h3>
                <form className="flex flex-col gap-3">
                  <input type="text" placeholder="Họ và tên" className="bg-gray-800/60 border border-gray-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  <input type="tel" placeholder="Số điện thoại" className="bg-gray-800/60 border border-gray-600 rounded-lg px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
                  <button type="button" className="bg-blue-600 hover:bg-blue-700 font-bold py-2.5 rounded-lg transition uppercase text-sm tracking-wide">
                    Nhận Tư Vấn Miễn Phí
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. KHÁM PHÁ THEO THƯƠNG HIỆU */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-600 px-4 py-3">
              <h2 className="text-lg md:text-xl font-black text-white uppercase flex items-center gap-2">
                <Award className="w-6 h-6" /> Khám Phá Theo Thương Hiệu
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { name: "ASUS", href: "/category/laptop-gaming" },
                { name: "DELL", href: "/category/laptop-van-phong" },
                { name: "HP", href: "/category/laptop-do-hoa" },
                { name: "LENOVO", href: "/category/laptop-gaming" },
                { name: "ACER", href: "/category/laptop-gaming" },
                { name: "APPLE", href: "/category/macbook" },
                { name: "MSI", href: "/category/laptop-gaming" },
                { name: "SAMSUNG", href: "/category/laptop-van-phong" },
              ].map(brand => (
                <Link key={brand.name} href={brand.href} className="flex items-center justify-center h-20 border border-gray-100 rounded-lg text-xl font-black tracking-widest text-gray-700 hover:text-blue-600 hover:border-blue-500 hover:shadow-md transition duration-300">
                  {brand.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
