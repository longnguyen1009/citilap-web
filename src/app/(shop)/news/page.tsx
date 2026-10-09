import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Calendar, User, ArrowRight, TrendingUp } from "lucide-react";

export const metadata = {
  title: "Tin tức & Review",
  description: "Tin tức công nghệ mới nhất, đánh giá laptop, mẹo mua sắm và thủ thuật hữu ích từ CITILAP.VN.",
};

export default function NewsPage() {
  const featuredArticle = {
    id: 1,
    title: "Đánh giá chi tiết Lenovo Legion 5 2026: Vẫn là 'Quốc dân' trong tầm giá?",
    excerpt: "Sở hữu thiết kế hoàn thiện hơn, tản nhiệt nâng cấp và hiệu năng ấn tượng từ thế hệ CPU mới, Legion 5 tiếp tục khẳng định vị thế độc tôn trong phân khúc laptop gaming 30 triệu đồng.",
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1200&auto=format&fit=crop",
    category: "Đánh giá Laptop",
    date: "20/08/2026",
    author: "Thanh Tùng",
  };

  const articles = [
    {
      id: 2,
      title: "Top 5 Laptop Văn Phòng Mỏng Nhẹ, Pin Trâu Đáng Mua Nhất Nửa Cuối 2026",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=600&auto=format&fit=crop",
      category: "Tư vấn chọn mua",
      date: "19/08/2026",
    },
    {
      id: 3,
      title: "Apple ra mắt MacBook Pro M4: Sức mạnh vượt trội, màn hình OLED siêu sáng",
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop",
      category: "Tin công nghệ",
      date: "18/08/2026",
    },
    {
      id: 4,
      title: "Hướng dẫn tối ưu hoá Windows 11 để chơi game mượt mà hơn, tăng FPS hiệu quả",
      image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=600&auto=format&fit=crop",
      category: "Thủ thuật",
      date: "17/08/2026",
    },
    {
      id: 5,
      title: "Asus ROG Strix Scar 18 (2026) - 'Quái thú' gaming với cấu hình chạm đỉnh",
      image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=600&auto=format&fit=crop",
      category: "Đánh giá Laptop",
      date: "15/08/2026",
    },
    {
      id: 6,
      title: "Nên chọn chuột gaming có dây hay không dây? Ưu nhược điểm của từng loại",
      image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop",
      category: "Góc tư vấn",
      date: "14/08/2026",
    },
    {
      id: 7,
      title: "Acer Predator Helios Neo 16: Lựa chọn thông minh thay thế Helios 300?",
      image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=600&auto=format&fit=crop",
      category: "Đánh giá Laptop",
      date: "12/08/2026",
    }
  ];

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <nav className="flex text-sm text-gray-500 py-3 font-medium items-center">
            <Link href="/" className="hover:text-blue-600 transition">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-800 font-bold">Tin tức - Review</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-[1370px]">
        {/* Categories Tab */}
        <div className="flex overflow-x-auto hide-scrollbar mb-8 gap-2">
          {["Tất cả", "Tin công nghệ", "Đánh giá Laptop", "Tư vấn chọn mua", "Thủ thuật", "Khuyến mãi"].map((cat, i) => (
            <button key={i} className={`flex-shrink-0 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${i === 0 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Article */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-8 group cursor-pointer">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="relative overflow-hidden h-[300px] lg:h-auto">
              <Image src={featuredArticle.image} alt={featuredArticle.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Bài viết nổi bật
              </div>
            </div>
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <div className="flex items-center gap-4 text-xs font-bold text-blue-600 uppercase tracking-wider mb-4">
                <span>{featuredArticle.category}</span>
                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="w-3.5 h-3.5" /> {featuredArticle.date}
                </div>
              </div>
              <h2 className="text-2xl lg:text-4xl font-black text-gray-900 mb-4 leading-tight group-hover:text-blue-600 transition-colors">
                {featuredArticle.title}
              </h2>
              <p className="text-gray-600 text-lg mb-8 line-clamp-3">
                {featuredArticle.excerpt}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  {featuredArticle.author}
                </div>
                <button className="text-blue-600 font-bold uppercase text-sm tracking-wider flex items-center gap-1 hover:gap-2 transition-all">
                  Đọc tiếp <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Article Grid */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b-2 border-blue-600 w-fit">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-black text-gray-900 uppercase">Mới cập nhật</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <div key={article.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer flex flex-col h-full">
                  <div className="relative h-48 overflow-hidden">
                    <Image src={article.image} alt={article.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-blue-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {article.category}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" /> {article.date}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-end">
                      <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Xem chi tiết <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 cursor-not-allowed">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold shadow-md">1</button>
                <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">2</button>
                <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">3</button>
                <span className="text-gray-400">...</span>
                <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition flex items-center justify-center">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-black text-gray-900 uppercase border-b border-gray-100 pb-3 mb-4">Đọc nhiều nhất</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex gap-4 group cursor-pointer">
                    <span className="text-3xl font-black text-gray-200 group-hover:text-blue-200 transition-colors">0{item}</span>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {item === 1 ? "Đánh giá chi tiết Lenovo Legion 5 2026: Vẫn là 'Quốc dân' trong tầm giá?" : 
                         item === 2 ? "Top 5 Laptop Văn Phòng Mỏng Nhẹ, Pin Trâu Đáng Mua Nhất" :
                         "Hướng dẫn tối ưu hoá Windows 11 để chơi game mượt mà hơn"}
                      </h4>
                      <span className="text-xs text-gray-500">12,450 lượt xem</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md p-6 text-white text-center">
              <h3 className="text-xl font-black mb-2">Đăng ký nhận tin</h3>
              <p className="text-blue-100 text-sm mb-6">Đừng bỏ lỡ những bài đánh giá mới nhất và các chương trình khuyến mãi hấp dẫn từ CitiLap.</p>
              <form className="flex flex-col gap-3">
                <input type="email" placeholder="Nhập email của bạn..." className="w-full px-4 py-3 rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-yellow-400" />
                <button type="button" className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-3 rounded-lg uppercase tracking-wider transition-colors shadow-lg shadow-yellow-400/30">
                  Đăng ký ngay
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
