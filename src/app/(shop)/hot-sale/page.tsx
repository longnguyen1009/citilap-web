import Link from "next/link";
import { Flame, Clock, ChevronRight, Zap } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

export default function HotSalePage() {
  const mockProducts = [
    {
      id: "h1", name: "Lenovo Legion 5 15ARH7H",
      price: "28.490.000đ", oldPrice: "32.990.000đ", discount: "-14%",
      image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "Ryzen 7 6800H", ram: "16GB", ssd: "512GB", display: "15.6 FHD 165Hz" }
    },
    {
      id: "h2", name: "Acer Predator Helios Neo 16",
      price: "34.990.000đ", oldPrice: "39.990.000đ", discount: "-13%",
      image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "512GB", display: "16.0 WQXGA" }
    },
    {
      id: "h3", name: "Asus ROG Strix G15 G513RC",
      price: "23.990.000đ", oldPrice: "27.990.000đ", discount: "-14%",
      image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "Ryzen 7 6800H", ram: "8GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
    },
    {
      id: "h4", name: "MSI Katana 15 B13VFK",
      price: "29.990.000đ", oldPrice: "33.990.000đ", discount: "-11%",
      image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "i7 13620H", ram: "16GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
    },
    {
      id: "h5", name: "Dell Alienware m16 R1",
      price: "42.490.000đ", oldPrice: "47.990.000đ", discount: "-11%",
      image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "1TB", display: "16.0 QHD+ 165Hz" }
    },
    {
      id: "h6", name: "HP Victus 16 2023",
      price: "21.990.000đ", oldPrice: "25.990.000đ", discount: "-15%",
      image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "i5 13500H", ram: "16GB", ssd: "512GB", display: "16.1 FHD 144Hz" }
    },
    {
      id: "h7", name: "Acer Nitro 5 Tiger 2022",
      price: "19.990.000đ", oldPrice: "23.990.000đ", discount: "-16%",
      image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "i5 12500H", ram: "8GB", ssd: "512GB", display: "15.6 FHD 144Hz" }
    },
    {
      id: "h8", name: "MacBook Pro 14 M2 Pro",
      price: "46.490.000đ", oldPrice: "49.990.000đ", discount: "-7%",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
      specs: { cpu: "Apple M2 Pro", ram: "16GB", ssd: "512GB", display: "14.2 Liquid Retina" }
    }
  ];

  return (
    <div className="bg-[#fcfaf9] min-h-screen pb-12">
      {/* 1. Hero Banner */}
      <section className="bg-gradient-to-r from-red-600 to-orange-500 py-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400 rounded-full filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-red-800 rounded-full filter blur-[80px] opacity-30 translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="container mx-auto px-4 max-w-[1370px] relative z-10 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-6 shadow-xl">
            <Flame className="w-5 h-5 text-yellow-300" />
            <span className="font-bold tracking-widest uppercase text-sm text-yellow-100">Siêu ưu đãi tháng này</span>
            <Flame className="w-5 h-5 text-yellow-300" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter uppercase italic drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200">
            HOT SALE CUỐI TUẦN
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-yellow-100 mb-8 max-w-2xl mx-auto">
            Giảm giá cực sốc lên tới <span className="text-yellow-400 font-black text-3xl">50%</span> cho tất cả mặt hàng Laptop & Phụ kiện.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 w-fit mx-auto shadow-2xl">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <span className="font-bold text-xl uppercase tracking-wider">Kết thúc trong:</span>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center bg-white text-red-600 rounded-lg p-3 min-w-[70px] shadow-inner">
                <span className="text-3xl font-black leading-none">02</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-gray-500">Ngày</span>
              </div>
              <span className="text-3xl font-black pt-2 text-white/50">:</span>
              <div className="flex flex-col items-center bg-white text-red-600 rounded-lg p-3 min-w-[70px] shadow-inner">
                <span className="text-3xl font-black leading-none">14</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-gray-500">Giờ</span>
              </div>
              <span className="text-3xl font-black pt-2 text-white/50">:</span>
              <div className="flex flex-col items-center bg-white text-red-600 rounded-lg p-3 min-w-[70px] shadow-inner">
                <span className="text-3xl font-black leading-none">45</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-gray-500">Phút</span>
              </div>
              <span className="text-3xl font-black pt-2 text-white/50">:</span>
              <div className="flex flex-col items-center bg-white text-red-600 rounded-lg p-3 min-w-[70px] shadow-inner">
                <span className="text-3xl font-black leading-none animate-pulse">18</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-gray-500">Giây</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Tabs */}
      <section className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <ul className="flex items-center overflow-x-auto hide-scrollbar">
            {["Tất cả", "Laptop Gaming", "Ultrabook", "Linh kiện PC", "Phụ kiện", "Màn hình"].map((tab, idx) => (
              <li key={idx} className="flex-shrink-0">
                <button className={`px-6 py-4 font-bold text-sm uppercase transition border-b-4 ${idx === 0 ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-red-500 hover:bg-gray-50"}`}>
                  {tab}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Product Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="flex items-center gap-3 mb-8 border-b-2 border-red-100 pb-3">
            <Zap className="w-8 h-8 text-red-600 fill-red-600" />
            <h2 className="text-2xl font-black uppercase text-gray-900">Flash Sale Đang Diễn Ra</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {mockProducts.map((p) => (
              <ProductCard key={p.id} product={p} badgeColor="bg-gradient-to-r from-red-600 to-orange-500 shadow-md" />
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button className="bg-white border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-bold py-3 px-10 rounded-full transition duration-300 uppercase tracking-widest">
              Tải thêm sản phẩm
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
