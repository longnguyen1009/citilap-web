import Link from "next/link";
import { 
  ChevronRight, Star, ShieldCheck, Truck, RefreshCw, 
  Gift, CheckCircle, Cpu, Monitor, Laptop, HardDrive, 
  PlayCircle, ShoppingCart, Zap, Phone, ThumbsUp
} from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPriceOptions from "@/components/product/ProductPriceOptions";

export default async function ProductDetail({ params }: { params: { id: string } }) {
  // --- MOCK DATA FOR DEMO ---
  const product = {
    id: params.id,
    name: "Laptop Lenovo Legion 5 15ARH7H (Ryzen 7 6800H / 16GB / 512GB / RTX 3050Ti / 15.6 FHD 165Hz)",
    price: "28.490.000đ",
    oldPrice: "32.990.000đ",
    discount: "-14%",
    sku: "L5-15ARH7H",
    status: "Còn hàng",
    rating: 4.8,
    reviews: 124,
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=1200&auto=format&fit=crop"
    ],
    specs: {
      cpu: "AMD Ryzen™ 7 6800H (8 Cores, 16 Threads, 3.2GHz to 4.7GHz)",
      ram: "16GB DDR5 4800MHz",
      ssd: "512GB M.2 2280 PCIe Gen4 TLC",
      vga: "NVIDIA® GeForce RTX™ 3050Ti 4GB GDDR6 (95W)",
      display: "15.6\" FHD (1920x1080) IPS 300nits Anti-glare, 165Hz, 100% sRGB",
      os: "Windows 11 Home",
      battery: "80Wh",
      weight: "2.35 kg"
    },
    variants: [
      { id: "v1", label: "16GB RAM / 512GB SSD", price: "28.490.000đ", oldPrice: "32.990.000đ" },
      { id: "v2", label: "32GB RAM / 1TB SSD", price: "31.490.000đ", oldPrice: "36.990.000đ" }
    ]
  };

  const relatedProducts = [
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

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link href="/category/laptop-gaming" className="hover:text-blue-600 transition">Laptop Gaming</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800 line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
        
        {/* 2. Top Section (Chốt Sale) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Gallery (Client Component) */}
            <ProductGallery 
              images={product.images} 
              productName={product.name} 
              discount={product.discount} 
            />

            {/* Right: Buy Box */}
            <div className="lg:col-span-7 flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-500"/>
                  <span className="font-bold text-gray-800 ml-1">{product.rating}</span> 
                  ({product.reviews} đánh giá)
                </span>
                <span className="border-l border-gray-300 h-4 hidden sm:block"></span>
                <span>Mã SP: <span className="font-bold text-blue-600">{product.sku}</span></span>
                <span className="border-l border-gray-300 h-4 hidden sm:block"></span>
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <CheckCircle className="w-4 h-4" /> {product.status}
                </span>
              </div>

              {/* Price Options (Client Component) */}
              <ProductPriceOptions 
                productId={product.id}
                productName={product.name}
                productImage={product.images[0]}
                variants={product.variants} 
                initialPrice={product.price} 
                initialOldPrice={product.oldPrice} 
              />

              {/* Specs Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <Cpu className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                  <span className="block text-xs font-bold text-gray-800 line-clamp-1">{product.specs.cpu.split(" (")[0]}</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <Monitor className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                  <span className="block text-xs font-bold text-gray-800 line-clamp-1">16GB RAM</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <HardDrive className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                  <span className="block text-xs font-bold text-gray-800 line-clamp-1">512GB SSD</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <Zap className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                  <span className="block text-xs font-bold text-gray-800 line-clamp-1">RTX 3050Ti</span>
                </div>
              </div>

              {/* Gift Box */}
              <div className="border border-red-300 rounded-lg overflow-hidden mb-6">
                <div className="bg-red-600 text-white font-bold py-2 px-4 flex items-center gap-2 uppercase text-sm">
                  <Gift className="w-5 h-5" /> Quà tặng & Ưu đãi
                </div>
                <div className="p-4 bg-red-50/50 text-sm">
                  <ul className="space-y-2 text-gray-800 font-medium">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" /> Tặng Chuột Gaming không dây hoặc Balo Predator cao cấp.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" /> Giảm thêm 500.000đ khi thanh toán qua VNPay.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" /> Giảm 20% khi mua kèm phụ kiện (Bàn phím, Tai nghe).
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 3. Middle Section (Nội dung & Thông số) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Left: Bài viết đánh giá */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-6 uppercase flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-red-600"/> Đánh giá chi tiết
              </h2>
              
              <div className="prose max-w-none text-gray-700">
                <p className="font-bold text-lg mb-4 text-gray-800">Lenovo Legion 5 luôn là một tượng đài trong làng laptop gaming tầm trung và cận cao cấp. Phiên bản 15ARH7H với sự nâng cấp về CPU AMD Ryzen 6000 Series tiếp tục khẳng định vị thế đó.</p>
                
                <h3 className="text-lg font-bold mt-6 mb-3 text-gray-900">Thiết kế đậm chất cơ bắp nhưng tối giản</h3>
                <p className="mb-4">Khác với vẻ hầm hố của các dòng laptop gaming khác, Legion 5 mang một thiết kế tối giản, vuông vức và thanh lịch hơn, phù hợp cho cả nhu cầu mang đi học, đi làm. Hệ thống tản nhiệt ở mặt sau được thiết kế nhô ra đặc trưng giúp tối ưu luồng khí.</p>
                
                <div className="my-6">
                  <img src={product.images[1]} alt="Design" className="rounded-lg w-full" />
                  <p className="text-center text-sm text-gray-500 mt-2 italic">Mặt A thiết kế kim loại sang trọng, logo Legion nổi bật</p>
                </div>

                <h3 className="text-lg font-bold mt-6 mb-3 text-gray-900">Màn hình chuẩn đồ hoạ - Tần số quét cao</h3>
                <p className="mb-4">Sở hữu màn hình 15.6 inch FHD với tần số quét lên tới 165Hz và độ phủ màu 100% sRGB, Legion 5 không chỉ mang lại trải nghiệm chơi game mượt mà không độ trễ mà còn hoàn toàn đáp ứng được nhu cầu chỉnh sửa ảnh, làm video chuyên nghiệp.</p>

                <h3 className="text-lg font-bold mt-6 mb-3 text-gray-900">Hiệu năng vô song trong tầm giá</h3>
                <p className="mb-4">Sự kết hợp giữa <strong>AMD Ryzen 7 6800H</strong> và card đồ hoạ <strong>RTX 3050Ti</strong> mang lại khả năng xử lý mượt mà mọi tựa game eSport hiện nay ở mức thiết lập cao nhất. Đặc biệt, hệ thống tản nhiệt Legion Coldfront 4.0 đảm bảo nhiệt độ luôn ổn định trong thời gian dài sử dụng.</p>
              </div>
            </div>
          </div>

          {/* Right: Thông số & Cam kết */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-6 uppercase flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600"/> Yên tâm mua sắm
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Bảo hành 12 Tháng</h4>
                    <p className="text-xs text-gray-500">Tại tất cả các trung tâm uy tín</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Đổi trả miễn phí</h4>
                    <p className="text-xs text-gray-500">Trong 15 ngày nếu có lỗi từ NSX</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Truck className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Giao hàng hoả tốc</h4>
                    <p className="text-xs text-gray-500">Nhận hàng trong 2H tại nội thành</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ThumbsUp className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Dịch vụ tận tâm</h4>
                    <p className="text-xs text-gray-500">Hỗ trợ cài đặt phần mềm trọn đời</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 uppercase">Thông số kỹ thuật</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm text-left text-gray-700">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 w-1/3 font-medium">Vi xử lý (CPU)</td>
                      <td className="py-3 px-2">{product.specs.cpu}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">RAM</td>
                      <td className="py-3 px-2">{product.specs.ram}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">Ổ cứng</td>
                      <td className="py-3 px-2">{product.specs.ssd}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">Đồ hoạ (VGA)</td>
                      <td className="py-3 px-2">{product.specs.vga}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">Màn hình</td>
                      <td className="py-3 px-2">{product.specs.display}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">Hệ điều hành</td>
                      <td className="py-3 px-2">{product.specs.os}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-2 bg-gray-50 font-medium">Pin</td>
                      <td className="py-3 px-2">{product.specs.battery}</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2 bg-gray-50 font-medium">Trọng lượng</td>
                      <td className="py-3 px-2">{product.specs.weight}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* 4. Bottom Section (Related Products) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase flex items-center gap-2">
            Sản phẩm tương tự
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
