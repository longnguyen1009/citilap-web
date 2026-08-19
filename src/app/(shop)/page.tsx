import Link from "next/link";
import { 
  ChevronRight, Laptop, Cpu, ShieldCheck, ThumbsUp, 
  Zap, Truck, Monitor, Flame, Award, Briefcase, 
  Server, Headphones, PlayCircle, Star, CheckCircle 
} from "lucide-react";

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
  }
];

const mockUltrabooks = [
  {
    id: "u1", name: "MacBook Pro 14 M2 Pro 2023",
    price: "46.490.000đ", oldPrice: "49.990.000đ", discount: "-7%",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "Apple M2 Pro", ram: "16GB", ssd: "512GB", display: "14.2 Liquid Retina" }
  },
  {
    id: "u2", name: "Dell XPS 13 Plus 9320",
    price: "39.990.000đ", oldPrice: "45.990.000đ", discount: "-13%",
    image: "https://images.unsplash.com/photo-1593642702821-c823b13eb295?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1360P", ram: "16GB", ssd: "512GB", display: "13.4 3.5K OLED" }
  },
  {
    id: "u3", name: "HP Spectre x360 14",
    price: "36.490.000đ", oldPrice: "40.990.000đ", discount: "-10%",
    image: "https://images.unsplash.com/photo-1531297172868-9f1c1ea2f7c0?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1355U", ram: "16GB", ssd: "1TB", display: "13.5 WUXGA+" }
  },
  {
    id: "u4", name: "Lenovo ThinkPad X1 Carbon Gen 11",
    price: "41.990.000đ", oldPrice: "48.990.000đ", discount: "-14%",
    image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i7 1355U", ram: "16GB", ssd: "512GB", display: "14.0 WUXGA" }
  },
  {
    id: "u5", name: "Asus Zenbook 14 OLED UX3402",
    price: "24.490.000đ", oldPrice: "27.990.000đ", discount: "-12%",
    image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop",
    specs: { cpu: "i5 1240P", ram: "16GB", ssd: "512GB", display: "14.0 2.8K OLED" }
  }
];

const mockUsedLaptops = mockProducts.map(p => ({...p, name: `[Cũ 99%] ${p.name}`, price: "18.500.000đ", oldPrice: p.price, discount: "HOT"}));
const mockWorkstations = mockProducts.map(p => ({...p, name: `ThinkPad P16 Gen 1 / Precision 7670`, price: "55.000.000đ", oldPrice: "65.000.000đ", discount: "-15%"}));

// --- COMPONENTS ---
const ProductCard = ({ product, badgeColor = "bg-red-600" }: { product: any, badgeColor?: string }) => (
  <Link href={`/product/${product.id}`} className="group flex flex-col bg-white border border-gray-100 hover:border-blue-500 rounded-md overflow-hidden transition-all duration-300 hover:shadow-lg relative">
    <div className={`absolute top-2 left-2 z-10 ${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm`}>
      {product.discount}
    </div>
    <div className="relative aspect-square p-4 flex items-center justify-center bg-white overflow-hidden">
      <img src={product.image} alt={product.name} className="object-contain group-hover:scale-105 transition duration-300 w-full h-full" />
    </div>
    <div className="p-3 flex-grow flex flex-col">
      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition">
        {product.name}
      </h3>
      
      <div className="bg-gray-50 rounded border border-gray-100 p-2 mb-3 mt-auto">
        <div className="grid grid-cols-2 gap-x-1 gap-y-2 text-[10px] text-gray-600">
          <span className="truncate flex items-center gap-1"><Cpu className="w-3 h-3 text-gray-400"/> {product.specs.cpu}</span>
          <span className="truncate flex items-center gap-1"><Monitor className="w-3 h-3 text-gray-400"/> {product.specs.ram}</span>
          <span className="truncate flex items-center gap-1"><Laptop className="w-3 h-3 text-gray-400"/> {product.specs.ssd}</span>
          <span className="truncate flex items-center gap-1"><Monitor className="w-3 h-3 text-gray-400"/> {product.specs.display}</span>
        </div>
      </div>

      <div className="flex flex-col mt-auto">
        <span className="text-red-600 font-bold text-lg leading-none mb-1">{product.price}</span>
        <span className="text-gray-400 text-xs line-through">{product.oldPrice}</span>
      </div>
    </div>
  </Link>
);

const BlockHeader = ({ title, icon: Icon, colorClass, links }: { title: string, icon: any, colorClass: string, links: string[] }) => (
  <div className={`flex flex-col md:flex-row md:justify-between md:items-center mb-6 pb-2 border-b-2 ${colorClass.replace("bg-", "border-").replace("text-white", "")}`}>
    <h2 className="text-xl md:text-2xl font-black text-gray-800 uppercase flex items-center gap-2 mb-3 md:mb-0">
      <span className={`${colorClass} p-1.5 rounded-md`}><Icon className="w-5 h-5"/></span>
      {title}
    </h2>
    <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-600">
      {links.map((link, i) => (
        <Link key={i} href="#" className="hover:text-blue-600 bg-gray-100 px-3 py-1 rounded-full">{link}</Link>
      ))}
      <Link href="/category/all" className="flex items-center text-blue-600 hover:underline font-bold ml-2">
        Xem tất cả <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function Home() {
  return (
    <div className="bg-[#f5f5f8] min-h-screen pb-12">
      
      {/* 1. HERO SECTION */}
      <section className="bg-[#0f172a]">
        <div className="w-full relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
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
      <section className="py-6">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden shadow-sm relative group aspect-[21/9]">
              <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center p-8">
                <div className="text-white">
                  <h3 className="text-2xl font-black mb-2 text-yellow-400 uppercase italic">Ultrabook Cao Cấp</h3>
                  <p className="font-bold text-lg mb-4">Sang trọng & Mỏng nhẹ</p>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full uppercase text-sm">Xem ngay</button>
                </div>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-sm relative group aspect-[21/9]">
              <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
              <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 to-transparent flex items-center p-8">
                <div className="text-white">
                  <h3 className="text-2xl font-black mb-2 text-yellow-400 uppercase italic">Ưu đãi cực khủng</h3>
                  <p className="font-bold text-lg mb-4">Tặng chuột Gaming & Balo</p>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full uppercase text-sm">Mua ngay</button>
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
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-center gap-3 shadow-sm hover:shadow-md transition cursor-pointer group">
                <feature.icon className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
                <span className="font-bold text-gray-800 text-sm md:text-base text-center md:text-left">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. FLASH SALE */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-lg shadow-sm p-1">
            <div className="bg-white rounded-md p-4 md:p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 uppercase flex items-center gap-2 italic">
                  <Flame className="w-8 h-8 text-red-600"/> DEAL CHỚP NHOÁNG
                </h2>
                <div className="flex items-center gap-3 mt-4 md:mt-0">
                  <span className="font-bold text-gray-600">Kết thúc trong:</span>
                  <div className="flex gap-2">
                    <span className="bg-gray-800 text-white font-bold px-3 py-2 rounded-md">02</span><span className="font-bold pt-1">:</span>
                    <span className="bg-gray-800 text-white font-bold px-3 py-2 rounded-md">45</span><span className="font-bold pt-1">:</span>
                    <span className="bg-gray-800 text-white font-bold px-3 py-2 rounded-md">18</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {mockProducts.map((p) => <ProductCard key={p.id + 'fs'} product={{...p, discount: "Giảm 30%"}} badgeColor="bg-yellow-500 text-black" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LAPTOP GAMING */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border-t-4 border-red-600">
            <BlockHeader title="Laptop Gaming - Chiến Thần Đồ Hoạ" icon={Zap} colorClass="bg-red-600 text-white" links={["Dưới 20 Triệu", "20-30 Triệu", "Cao Cấp", "Mới Về"]} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {mockProducts.map((p) => <ProductCard key={p.id + 'gm'} product={p} />)}
            </div>
          </div>
        </div>
      </section>

      {/* 4. ULTRABOOK CAO CẤP */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border-t-4 border-blue-600">
            <BlockHeader title="Ultrabook Cao Cấp - Doanh Nhân" icon={Briefcase} colorClass="bg-blue-600 text-white" links={["MacBook", "Dell XPS", "ThinkPad", "HP Spectre"]} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {mockUltrabooks.map((p) => <ProductCard key={p.id + 'ub'} product={p} badgeColor="bg-blue-600" />)}
            </div>
          </div>
        </div>
      </section>

      {/* 5. MÁY LƯỚT - LIKE NEW */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border-t-4 border-green-600">
            <BlockHeader title="Chuyên Trang Máy Lướt - Tiết Kiệm Tối Đa" icon={Award} colorClass="bg-green-600 text-white" links={["Like New 99%", "Bảo hành 12 Tháng", "Trả Góp 0%"]} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {mockUsedLaptops.map((p) => <ProductCard key={p.id + 'ul'} product={p} badgeColor="bg-green-600" />)}
            </div>
          </div>
        </div>
      </section>

      {/* 6. MÁY TRẠM (WORKSTATION) */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border-t-4 border-gray-800">
            <BlockHeader title="Máy Trạm Workstation - Đồ Hoạ Chuyên Nghiệp" icon={Server} colorClass="bg-gray-800 text-white" links={["Dell Precision", "ThinkPad P", "HP ZBook"]} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {mockWorkstations.map((p) => <ProductCard key={p.id + 'ws'} product={p} badgeColor="bg-gray-800" />)}
            </div>
          </div>
        </div>
      </section>

      {/* 7. PHỤ KIỆN & GEAR */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border-t-4 border-purple-600">
            <BlockHeader title="Phụ Kiện & Gear Gaming" icon={Headphones} colorClass="bg-purple-600 text-white" links={["Chuột Gaming", "Bàn Phím Cơ", "Tai Nghe", "Balo - Túi Chống Sốc"]} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Using mock data for gears, just replacing name/image */}
              {mockProducts.slice(0,5).map((p, i) => (
                <Link href="#" key={i+'gear'} className="group flex flex-col bg-white border border-gray-100 hover:border-purple-500 rounded-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                  <div className="relative aspect-square p-4 flex items-center justify-center bg-gray-50 overflow-hidden">
                    <Headphones className="w-16 h-16 text-gray-300 group-hover:scale-110 group-hover:text-purple-500 transition duration-300" />
                  </div>
                  <div className="p-3 text-center">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 group-hover:text-purple-600 transition">Tai nghe / Chuột Cao Cấp {i+1}</h3>
                    <span className="text-red-600 font-bold text-lg">1.500.000đ</span>
                  </div>
                </Link>
              ))}
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
                      <img src={`https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=200&auto=format&fit=crop&sig=${i}`} className="w-full h-full object-cover opacity-80" />
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

      {/* 9. BRAND LOGOS */}
      <section className="pb-8">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <div className="bg-white rounded-lg shadow-sm py-8 px-4 flex justify-around items-center flex-wrap gap-8 opacity-50 grayscale hover:grayscale-0 transition duration-500">
            {/* Using text placeholders since we don't have logo images */}
            <span className="text-2xl font-black tracking-widest text-gray-800">ASUS</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">DELL</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">HP</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">LENOVO</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">ACER</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">APPLE</span>
            <span className="text-2xl font-black tracking-widest text-gray-800">MSI</span>
          </div>
        </div>
      </section>

    </div>
  );
}
