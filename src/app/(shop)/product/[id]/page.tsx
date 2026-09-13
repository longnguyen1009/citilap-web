import Link from "next/link";
import { Cpu, Monitor, Laptop, HardDrive, PlayCircle, Star, ShieldCheck, Truck, PackageCheck, ChevronRight, Phone, MessageCircle } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductGallery from "@/components/product/ProductGallery";
import ProductPriceOptions from "@/components/product/ProductPriceOptions";
import ProductRecommendations from "@/components/product/ProductRecommendations";
import ProductMobileCTA from "@/components/product/ProductMobileCTA";
import ReviewForm from "@/components/product/ReviewForm";

// Star rating helper
function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
      ))}
      <span className="ml-1 text-sm font-bold text-gray-700">{rating}</span>
      <span className="text-xs text-gray-400">({count} đánh giá)</span>
    </div>
  );
}

// Spec row
function SpecRow({ icon: Icon, label, value, odd }: { icon: typeof Cpu; label: string; value: string; odd: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded ${odd ? "bg-gray-50" : ""}`}>
      <Icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <span className="w-28 text-gray-500 font-medium text-sm shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-sm flex-1">{value}</span>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Try to fetch product name from database for better SEO
  let productName = `Sản phẩm #${id}`;
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const product = await prisma.product.findUnique({
        where: { id },
        select: { name: true, description: true },
      });
      if (product) {
        productName = product.name;
      }
    } catch (error) {
      console.error("Failed to fetch product for metadata", error);
    }
  }

  return {
    title: productName,
    description: `Xem thông tin chi tiết, giá bán và đánh giá ${productName} tại CITILAP.VN. Bảo hành 12 tháng, tư vấn miễn phí.`,
  };
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let databaseProduct: any = null;
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      databaseProduct = await prisma.product.findUnique({ where: { id }, include: { category: true, variants: { orderBy: { createdAt: "asc" } } } });
    } catch (error) { console.error("Failed to load product detail", error); }
  }

  // --- MOCK DATA FOR DEMO ---
  const product = {
    id,
    name: "Laptop Lenovo Legion 5 15ARH7H (Ryzen 7 6800H / 16GB / 512GB / RTX 3050Ti / 15.6 FHD 165Hz)",
    price: "28.490.000đ",
    oldPrice: "32.990.000đ",
    discount: "-14%",
    sku: "L5-15ARH7H",
    status: "Còn hàng",
    stock: 5,
    condition: "Mới 100%",
    brand: "Lenovo",
    category: "Laptop Gaming",
    categorySlug: "laptop-gaming",
    rating: 4.8,
    reviewCount: 124,
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=1200&auto=format&fit=crop",
    ],
    specs: {
      cpu: "AMD Ryzen™ 7 6800H (8 Cores, 16 Threads, 3.2GHz–4.7GHz)",
      ram: "16GB DDR5 4800MHz",
      ssd: "512GB M.2 2280 PCIe Gen4 TLC",
      vga: "NVIDIA® GeForce RTX™ 3050Ti 4GB GDDR6 (95W)",
      display: '15.6" FHD (1920x1080) IPS 300nits Anti-glare, 165Hz, 100% sRGB',
      os: "Windows 11 Home",
      battery: "80Wh, Lithium Polymer",
      weight: "2.35 kg",
    },
    warranty: "12 tháng chính hãng (Đổi mới trong 15 ngày đầu nếu lỗi nhà sản xuất)",
    accessories: ["Sạc adapter 230W", "Túi chống sốc cao cấp", "Chuột không dây", "Bàn di chuột game"],
    description: `
      Lenovo Legion 5 15ARH7H là một tượng đài trong phân khúc laptop gaming tầm trung. Phiên bản 2023 được nâng cấp lên CPU AMD Ryzen 7 6800H mạnh mẽ, kết hợp GPU NVIDIA RTX 3050Ti 4GB mang lại hiệu năng ấn tượng.

      <h3>Thiết kế tối giản nhưng mạnh mẽ</h3>
      <p>Khác với vẻ hầm hố quen thuộc của gaming laptop, Legion 5 sở hữu thiết kế vuông vức, thanh lịch, phù hợp cả môi trường học tập và công sở. Hệ thống tản nhiệt Legion Coldfront 4.0 với 4 quạt và ống đồng lớn giúp duy trì hiệu năng ổn định.</p>

      <h3>Màn hình 165Hz chuẩn đồ hoạ</h3>
      <p>Màn hình 15.6 inch FHD IPS với tần số quét 165Hz và độ phủ màu 100% sRGB không chỉ lý tưởng để chơi game mà còn đáp ứng tốt nhu cầu chỉnh sửa ảnh, làm video chuyên nghiệp.</p>

      <h3>Hiệu năng AMD Ryzen 6000 Series</h3>
      <p>AMD Ryzen 7 6800H với 8 nhân 16 luồng, xung nhịp tối đa 4.7GHz kết hợp RTX 3050Ti 4GB (95W, hỗ trợ Dynamic Boost) xử lý mượt mà các tựa game eSports ở thiết lập cao nhất và AAA ở thiết lập trung bình.</p>
    `,
    variants: [
      { id: "v1", label: "Ryzen 7 6800H, 16GB, 512GB, RTX 3050Ti 4GB, 15.6 FHD 165Hz", price: "28.490.000đ", oldPrice: "32.990.000đ" },
      { id: "v2", label: "Ryzen 7 6800H, 16GB, 1TB, RTX 3050Ti 4GB, 15.6 FHD 165Hz", price: "29.990.000đ", oldPrice: "34.490.000đ" },
      { id: "v3", label: "Ryzen 7 6800H, 32GB, 1TB, RTX 3050Ti 4GB, 15.6 FHD 165Hz", price: "31.490.000đ", oldPrice: "36.990.000đ" },
      { id: "v4", label: "Ryzen 7 6800H, 32GB, 2TB, RTX 3050Ti 4GB, 15.6 FHD 165Hz", price: "33.990.000đ", oldPrice: "39.990.000đ" },
      { id: "v5", label: "Ryzen 7 6800H, 64GB, 2TB, RTX 3050Ti 4GB, 15.6 FHD 165Hz", price: "37.490.000đ", oldPrice: "43.990.000đ" },
    ],
  };

  if (databaseProduct) {
    const images = (() => { try { const parsed = JSON.parse(databaseProduct.images); return Array.isArray(parsed) ? parsed : [databaseProduct.images]; } catch { return [databaseProduct.images]; } })();
    const specs = (() => { try { const parsed = JSON.parse(databaseProduct.specs || "{}"); return { cpu: parsed.CPU || "", ram: parsed.RAM || "", ssd: parsed.SSD || "", vga: parsed.GPU || "", display: parsed["Màn hình"] || "", os: parsed["HĐH"] || "", battery: parsed.Pin || "", weight: parsed["Khối lượng"] || "" }; } catch { return product.specs; } })();
    product.name = databaseProduct.name; product.price = `${Number(databaseProduct.price).toLocaleString("vi-VN")}đ`; product.oldPrice = databaseProduct.originalPrice ? `${Number(databaseProduct.originalPrice).toLocaleString("vi-VN")}đ` : ""; product.images = images; product.description = databaseProduct.contentHtml || databaseProduct.description; product.category = databaseProduct.category?.name || product.category; product.categorySlug = databaseProduct.category?.slug || product.categorySlug; product.stock = databaseProduct.stock; product.specs = specs; product.brand = databaseProduct.brand || product.brand; product.sku = databaseProduct.model || product.sku; product.warranty = databaseProduct.warranty || product.warranty;
    product.variants = (databaseProduct.variants || []).map((variant: { id: string; name: string; price: number; originalPrice: number | null }) => ({ id: variant.id, label: variant.name, price: `${Number(variant.price).toLocaleString("vi-VN")}đ`, oldPrice: variant.originalPrice ? `${Number(variant.originalPrice).toLocaleString("vi-VN")}đ` : "" }));
  }

  // Mock reviews
  const reviews = [
    { id: "r1", author: "Nguyễn Minh Tuấn", date: "2025-03-15", rating: 5, title: "Máy quá ngon trong tầm giá!", content: "Mua về test game PUBG fps trên 144Hz mượt, Valorant full setting 200+ fps. Tản nhiệt hoạt động êm, quạt không ồn khi lướt web. Rất hài lòng!" },
    { id: "r2", author: "Trần Hoài Phương", date: "2025-02-28", rating: 4, title: "Hơi nặng nhưng rất đáng tiền", content: "Máy nặng 2.35kg không tiện mang đi, nhưng hiệu năng thì miễn chê. Plays GTA V max setting mượt. Pin 80Wh dùng được khoảng 4-5 giờ when lướt web." },
    { id: "r3", author: "Phạm Đức Anh", date: "2025-01-20", rating: 5, title: "Tản nhiệt Legion là best", content: "So với Acer Nitro 5 cùng tầm giá, Legion 5 tản nhiệt tốt hơn hẳn. Chơi game 3-4 tiếng liên tục không bị down xung. Màn hình 165Hz rất mượt." },
    { id: "r4", author: "Lê Thanh Hằng", date: "2025-01-05", rating: 4, title: "Phù hợp sinh viênIT", content: "Vừa học lập trình vừa chơi game được. Màn hình đẹp, phủ màu tốt, dùng Photoshop ok. Backpack included kèm túi chống sốc rất tiện." },
  ];

  const relatedProducts = [
    { id: "g2", name: "Acer Predator Helios Neo 16", price: "34.990.000đ", oldPrice: "39.990.000đ", discount: "-13%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "16.0 WQXGA" } },
    { id: "g3", name: "Asus ROG Strix G15 G513RC", price: "23.990.000đ", oldPrice: "27.990.000đ", discount: "-14%", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop", specs: { cpu: "Ryzen 7 6800H", ram: "8GB", ssd: "512GB", gpu: "RTX 3050Ti 4GB", display: "15.6 FHD 144Hz" } },
    { id: "g4", name: "MSI Katana 15 B13VFK", price: "29.990.000đ", oldPrice: "33.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop", specs: { cpu: "i7 13620H", ram: "16GB", ssd: "512GB", gpu: "RTX 4060 8GB", display: "15.6 FHD 144Hz" } },
    { id: "g5", name: "Dell Alienware m16 R1", price: "42.490.000đ", oldPrice: "47.990.000đ", discount: "-11%", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=800&auto=format&fit=crop", specs: { cpu: "i7 13700HX", ram: "16GB", ssd: "1TB", gpu: "RTX 4070 8GB", display: "16.0 QHD+ 165Hz" } },
    { id: "g6", name: "HP Victus 16 2023", price: "21.990.000đ", oldPrice: "25.990.000đ", discount: "-15%", image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800&auto=format&fit=crop", specs: { cpu: "i5 13500H", ram: "16GB", ssd: "512GB", gpu: "RTX 3050 6GB", display: "16.1 FHD 144Hz" } },
  ];

  const numericPrice = Number(String(product.price).replace(/[^0-9]+/g, "")) || 0;
  const offers = [
    { "@type": "Offer", price: numericPrice, priceCurrency: "VND", availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", itemCondition: "https://schema.org/NewCondition" },
  ];
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, image: product.images, description: product.description?.replace(/<[^>]+>/g, " ").slice(0, 1600), sku: product.sku, brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined, category: product.category, offers };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-16">
      {/* 1. Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex items-center text-sm text-gray-500 py-3 font-medium flex-wrap">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400" />
            <Link href={`/category/${product.categorySlug}`} className="hover:text-blue-600 transition">{product.category}</Link>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400" />
            <span className="text-gray-800 line-clamp-1">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">

        {/* 2. Top Section: Gallery + Info + Buy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

          {/* Left: Gallery (Col 5) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-20">
              <ProductGallery images={product.images} productName={product.name} discount={product.discount} />
            </div>
          </div>

          {/* Right: Info & Buy (Col 7) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 md:p-6 flex flex-col">
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-bold text-[#003399] leading-tight mb-2">
                [Mới 100%] {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-3">
                <Stars rating={product.rating} count={product.reviewCount} />
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-gray-500">SKU: <span className="font-bold text-gray-700">{product.sku}</span></span>
              </div>

              {/* Price + Status */}
              <ProductPriceOptions
                productId={product.id}
                productName={product.name}
                productImage={product.images[0]}
                variants={product.variants}
                initialPrice={product.price}
                initialOldPrice={product.oldPrice}
              />

              {/* Quick Specs */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Thông số nhanh</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div><span className="font-bold">CPU:</span> {product.specs.cpu.split("(")[0].trim()}</div>
                  <div><span className="font-bold">RAM:</span> {product.specs.ram}</div>
                  <div><span className="font-bold">SSD:</span> {product.specs.ssd.split("PCIe")[0].trim()}</div>
                  <div><span className="font-bold">GPU:</span> {product.specs.vga.split("(")[0].trim()}</div>
                  <div className="col-span-2"><span className="font-bold">Màn hình:</span> {product.specs.display}</div>
                </div>
              </div>

              {/* Contact */}
              <div className="flex gap-3">
                <a href="tel:0853111999" className="flex-1 flex items-center justify-center gap-2 border border-green-500 text-green-600 rounded-lg py-2.5 font-bold text-sm hover:bg-green-50 transition">
                  <Phone className="w-4 h-4" /> Gọi: 0853.111.999
                </a>
                <a href="https://zalo.me/0853111999" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border border-blue-500 text-blue-600 rounded-lg py-2.5 font-bold text-sm hover:bg-blue-50 transition">
                  <MessageCircle className="w-4 h-4" /> Chat Zalo
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Tabs + Specs sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

          {/* Left: Content tabs (Col 8) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-6 uppercase flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-red-600" /> Đánh giá chi tiết
              </h2>
              <div className="prose max-w-none text-gray-700 text-sm leading-relaxed space-y-4">
                {product.description.split("\n").filter(Boolean).map((block, i) => {
                  const trimmed = block.trim();
                  if (trimmed.startsWith("<h3>")) {
                    const text = trimmed.replace(/<\/?h3>/g, "");
                    return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-gray-900">{text}</h3>;
                  }
                  if (trimmed.startsWith("<p>")) {
                    const text = trimmed.replace(/<\/?p>/g, "");
                    return <p key={i} dangerouslySetInnerHTML={{ __html: text }} />;
                  }
                  return <p key={i}>{trimmed}</p>;
                })}
              </div>
            </div>

            {/* Accessories & Warranty */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-4 uppercase flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-green-600" /> Phụ kiện đi kèm & Bảo hành
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2">Phụ kiện trong hộp:</h4>
                  <ul className="space-y-1.5">
                    {product.accessories.map((acc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                        {acc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2">Chính sách bảo hành:</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{product.warranty}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 font-bold">
                    <ShieldCheck className="w-4 h-4" /> Kiểm tra bảo hành tại <Link href="/chinh-sach/kiem-tra-bao-hanh" className="underline">đây</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping & Payment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-4 uppercase flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Vận chuyển & Thanh toán
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">Vận chuyển:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> Miễn phí ship nội thành bán kính 10km</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> Ship COD toàn quốc (thu tiền khi nhận hàng)</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> Giao hàng từ 1-3 ngày làm việc</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800">Thanh toán:</h4>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> COD (trả tiền mặt khi nhận hàng)</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> Chuyển khoản ngân hàng (giảm thêm 100k)</li>
                    <li className="flex items-start gap-2"><span className="text-green-500">&#10003;</span> Trả góp qua thẻ tín dụng / MPOS / Mcredit</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Customer Reviews */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-3 mb-4 uppercase flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> Đánh giá từ khách hàng
              </h2>

              {/* Summary */}
              <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-black text-red-600">{product.rating}</div>
                  <Stars rating={product.rating} count={product.reviewCount} />
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const pct = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 5 : star === 2 ? 2 : 1;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right font-bold text-gray-600">{star}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-400">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-5">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {review.author.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-800">{review.author}</div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 mb-1">{review.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>
                  </div>
                ))}
              </div>

              {/* Review Form */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <ReviewForm productName={product.name} />
              </div>
            </div>
          </div>

          {/* Right: Specs Sidebar (Col 4) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm sticky top-20">
              <h2 className="text-base font-bold mb-4 uppercase border-b border-gray-100 pb-3">Thông số kỹ thuật</h2>
              <div className="space-y-0.5">
                <SpecRow icon={Cpu} label="CPU" value={product.specs.cpu} odd />
                <SpecRow icon={HardDrive} label="RAM" value={product.specs.ram} odd={false} />
                <SpecRow icon={HardDrive} label="SSD" value={product.specs.ssd} odd />
                <SpecRow icon={Monitor} label="VGA" value={product.specs.vga} odd={false} />
                <SpecRow icon={Laptop} label="Màn hình" value={product.specs.display} odd />
                <SpecRow icon={Monitor} label="HĐH" value={product.specs.os} odd={false} />
                <SpecRow icon={HardDrive} label="Pin" value={product.specs.battery} odd />
                <SpecRow icon={Laptop} label="Khối lượng" value={product.specs.weight} odd={false} />
              </div>

              {/* Condition & Stock */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tình trạng:</span>
                  <span className="font-bold text-green-600">{product.condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kho hàng:</span>
                  <span className="font-bold text-gray-800">{product.stock} sản phẩm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thương hiệu:</span>
                  <span className="font-bold text-gray-800">{product.brand}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Related Products & Bundles */}
        <ProductRecommendations productId={product.id} />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Sticky Mobile CTA Bar */}
      <ProductMobileCTA
        productId={product.id}
        productName={product.name}
        productImage={product.images[0]}
        price={numericPrice}
        stock={product.stock}
      />
    </div>
  );
}
