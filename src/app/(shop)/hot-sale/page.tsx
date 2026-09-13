"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Flame,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

type HotSaleProduct = {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  discount: string;
  image: string;
  specs: {
    cpu: string;
    ram: string;
    ssd: string;
    gpu: string;
    display: string;
  };
  tags?: string;
};

const images = [
  "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593642532400-2682810df593?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593642702821-c823b13eb295?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop",
];

const gamingProducts: HotSaleProduct[] = [
  ["Lenovo Legion 5 15ARH7H", "28.490.000đ", "32.990.000đ", "Ryzen 7 6800H", "RTX 3050Ti 4GB", "15.6 FHD 165Hz"],
  ["Acer Predator Helios Neo 16", "34.990.000đ", "39.990.000đ", "i7 13700HX", "RTX 4060 8GB", "16.0 WQXGA 165Hz"],
  ["Asus ROG Strix G15 G513RC", "23.990.000đ", "27.990.000đ", "Ryzen 7 6800H", "RTX 3050 4GB", "15.6 FHD 144Hz"],
  ["MSI Katana 15 B13VFK", "29.990.000đ", "33.990.000đ", "i7 13620H", "RTX 4060 8GB", "15.6 FHD 144Hz"],
  ["Dell Alienware m16 R1", "42.490.000đ", "47.990.000đ", "i7 13700HX", "RTX 4070 8GB", "16.0 QHD+ 165Hz"],
  ["Lenovo Legion Slim 5 16APH8", "31.990.000đ", "36.990.000đ", "Ryzen 7 7840HS", "RTX 4060 8GB", "16.0 WQXGA 165Hz"],
  ["Acer Nitro 5 AN515-58", "21.990.000đ", "25.990.000đ", "i5 12500H", "RTX 3050 4GB", "15.6 FHD 144Hz"],
  ["HP Victus 16-e1107AX", "19.490.000đ", "23.490.000đ", "Ryzen 5 6600H", "RTX 3050 4GB", "16.1 FHD 144Hz"],
  ["Asus TUF Gaming F15 FX507ZC4", "22.990.000đ", "26.490.000đ", "i5 12500H", "RTX 3050 4GB", "15.6 FHD 144Hz"],
  ["MSI Pulse 17 B13V", "27.990.000đ", "31.990.000đ", "i7 13700H", "RTX 4060 8GB", "17.3 FHD 144Hz"],
].map(([name, price, oldPrice, cpu, gpu, display], index) => ({
  id: `hot-gaming-${index + 1}`, name, price, oldPrice, discount: `-${11 + index}%`, image: images[index],
  specs: { cpu, ram: index % 3 === 0 ? "16GB" : "8GB", ssd: index % 4 === 0 ? "1TB" : "512GB", gpu, display },
  tags: "gaming",
}));

const ultrabookProducts: HotSaleProduct[] = [
  ["MacBook Pro 14 M2 Pro 2023", "46.490.000đ", "49.990.000đ", "Apple M2 Pro", "GPU 16-core", "14.2 Liquid Retina"],
  ["Dell XPS 13 Plus 9320", "39.990.000đ", "45.990.000đ", "i7 1360P", "Iris Xe", "13.4 3.5K OLED"],
  ["HP Spectre x360 14", "36.490.000đ", "40.990.000đ", "i7 1355U", "Iris Xe", "13.5 WUXGA+"],
  ["Lenovo ThinkPad X1 Carbon Gen 11", "41.990.000đ", "48.990.000đ", "i7 1355U", "Iris Xe", "14.0 WUXGA"],
  ["Asus Zenbook 14 OLED UX3402", "24.490.000đ", "27.990.000đ", "i5 1240P", "Iris Xe", "14.0 2.8K OLED"],
  ["Microsoft Surface Laptop 5", "28.990.000đ", "33.990.000đ", "i7 1255U", "Iris Xe", "13.5 PixelSense"],
  ["LG Gram 16Z90R", "35.490.000đ", "39.990.000đ", "i7 1360P", "Iris Xe", "16.0 WQXGA"],
  ["Acer Swift Go 14", "19.990.000đ", "23.490.000đ", "i5 13500H", "Iris Xe", "14.0 2.8K OLED"],
  ["Huawei MateBook X Pro", "32.990.000đ", "37.990.000đ", "i7 1360P", "Iris Xe", "14.2 3.1K"],
  ["Samsung Galaxy Book3 Pro", "31.490.000đ", "36.490.000đ", "i7 1360P", "Iris Xe", "14.0 3K AMOLED"],
].map(([name, price, oldPrice, cpu, gpu, display], index) => ({
  id: `hot-ultrabook-${index + 1}`, name, price, oldPrice, discount: `-${7 + index}%`, image: images[(index + 7) % images.length],
  specs: { cpu, ram: index % 2 === 0 ? "16GB" : "32GB", ssd: index % 3 === 0 ? "1TB" : "512GB", gpu, display },
  tags: "ultrabook",
}));

const allProducts = [...gamingProducts, ...ultrabookProducts];

const tabs = ["Tất cả", "Laptop Gaming", "Ultrabook"] as const;

type TabType = typeof tabs[number];

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 14, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-xl bg-black/20 px-5 py-3">
      <Clock className="h-6 w-6 text-yellow-300" />
      <span className="font-bold uppercase">Kết thúc trong:</span>
      <div className="flex items-center gap-1">
        <span className="rounded bg-white px-3 py-1 font-black text-red-600">{pad(timeLeft.hours)}</span>
        <span className="font-bold text-yellow-300">:</span>
        <span className="rounded bg-white px-3 py-1 font-black text-red-600">{pad(timeLeft.minutes)}</span>
        <span className="font-bold text-yellow-300">:</span>
        <span className="rounded bg-white px-3 py-1 font-black text-red-600">{pad(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}

function CategoryHeader({ title, icon: Icon, links, color }: { title: string; icon: LucideIcon; links: string[]; color: string }) {
  return (
    <div className={`${color} rounded-t-xl px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
      <h2 className="flex items-center gap-2 text-lg font-black uppercase text-white"><Icon className="h-6 w-6" />{title}</h2>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        {links.map((link) => <Link key={link} href="/category/laptop-gaming" className="rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white hover:text-gray-900 transition">{link}</Link>)}
        <Link href="/category/laptop-gaming" className="ml-1 flex items-center text-white hover:underline transition">Xem tất cả <ChevronRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

function ProductSection({ title, icon, links, color, products }: { title: string; icon: LucideIcon; links: string[]; color: string; products: HotSaleProduct[] }) {
  const rows = [products.slice(0, 5), products.slice(5, 10)];
  return (
    <section className="mb-10 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
      <CategoryHeader title={title} icon={icon} links={links} color={color} />
      {rows.map((row, rowIndex) => row.length > 0 && (
        <div key={rowIndex} className={`grid grid-cols-2 gap-4 px-4 ${rowIndex === 0 ? "pt-4" : "pb-4"} md:grid-cols-3 lg:grid-cols-5`}>
          {row.map((product) => (
            <ProductCard key={product.id} product={product} badgeColor="bg-gradient-to-r from-red-600 to-orange-500" />
          ))}
        </div>
      ))}
    </section>
  );
}

export default function HotSalePage() {
  const [activeTab, setActiveTab] = useState<TabType>("Tất cả");

  const filteredProducts = activeTab === "Tất cả"
    ? allProducts
    : activeTab === "Laptop Gaming"
    ? gamingProducts
    : ultrabookProducts;

  const gamingFiltered = activeTab === "Tất cả" || activeTab === "Laptop Gaming" ? gamingProducts : [];
  const ultrabookFiltered = activeTab === "Tất cả" || activeTab === "Ultrabook" ? ultrabookProducts : [];

  return (
    <main className="min-h-screen bg-[#f1f5f9] pb-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-700 via-red-600 to-orange-500 py-10 text-white">
        <div className="mx-auto max-w-[1370px] px-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-yellow-300">
            <Flame className="h-6 w-6" />
            <span className="font-bold uppercase tracking-widest">Ưu đãi giới hạn</span>
            <Flame className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">HOT SALE - DEAL SỐC</h1>
          <CountdownTimer />
        </div>
      </section>

      {/* Sticky Tabs */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-[1370px] overflow-x-auto px-4">
          <ul className="flex min-w-max">
            {tabs.map((tab) => (
              <li key={tab}>
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-4 px-6 py-4 text-sm font-bold uppercase transition ${
                    activeTab === tab
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-gray-500 hover:text-red-500"
                  }`}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Products */}
      <div className="mx-auto max-w-[1370px] px-4 py-10">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg font-medium">Không có sản phẩm nào trong danh mục này.</p>
          </div>
        ) : (
          <>
            {gamingFiltered.length > 0 && (
              <ProductSection
                title="Laptop Gaming - Chiến Thần Đồ Họa"
                icon={Zap}
                links={["Dưới 20 Triệu", "20-30 Triệu", "Cao Cấp", "Mới Về"]}
                color="bg-gradient-to-r from-red-700 to-red-500"
                products={gamingFiltered}
              />
            )}
            {ultrabookFiltered.length > 0 && (
              <ProductSection
                title="Ultrabook Cao Cấp"
                icon={Briefcase}
                links={["MacBook", "Dell XPS", "ThinkPad", "HP Spectre"]}
                color="bg-gradient-to-r from-blue-700 to-blue-500"
                products={ultrabookFiltered}
              />
            )}
          </>
        )}
        <div className="flex justify-center">
          <Link
            href="/category/laptop-gaming"
            className="rounded-full border-2 border-red-600 bg-white px-10 py-3 font-bold uppercase tracking-widest text-red-600 transition hover:bg-red-600 hover:text-white"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </main>
  );
}
